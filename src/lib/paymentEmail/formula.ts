// Safe formula engine for Payment Email calculated fields.
//
//   tokens  → parse  → ExpressionNode tree  ← stored on disk
//   tree    → evaluate(values)
//
// No `eval`, no `new Function`, no string interpolation. Field references and
// arithmetic only. Type-checked against the field registry + template
// definitions so we can surface human-readable errors before saving.

import {
  BUILT_IN_FIELDS,
  type BuiltInField,
} from "./registry";
import type {
  CalculatedFieldRecord,
  CalcOutputType,
  CustomFieldRecord,
  ExpressionNode,
  FieldValueType,
  FormulaOp,
  FormulaToken,
  PaymentEmailTemplateRecord,
} from "./types";
import { customFieldValueType } from "./types";

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

// ─── Parse: linear FormulaToken[] → ExpressionNode (precedence aware) ───────

const PRECEDENCE: Record<FormulaOp, number> = {
  add: 1,
  subtract: 1,
  multiply: 2,
  divide: 2,
  percent_of: 2,
};

/**
 * Shunting-yard parser. Implicit grouping is *not* allowed — every binary
 * sequence must have a clear infix shape. We surface plain-language errors
 * because the formula canvas is the only place users see them.
 */
export function parseFormula(tokens: FormulaToken[]): ExpressionNode {
  if (tokens.length === 0) {
    throw new FormulaError("Add a field to start this formula.");
  }
  const output: ExpressionNode[] = [];
  const ops: ({ kind: "op"; op: FormulaOp } | { kind: "lparen" })[] = [];

  let expect: "value" | "op" = "value";
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.kind === "field") {
      if (expect !== "value") {
        throw new FormulaError("Two fields can't sit side-by-side — add an operator between them.");
      }
      output.push({ type: "field", key: tok.key });
      expect = "op";
    } else if (tok.kind === "op") {
      if (expect !== "op") {
        throw new FormulaError("This formula starts or ends with an operator. Add a field on each side.");
      }
      while (
        ops.length > 0 &&
        ops[ops.length - 1].kind === "op" &&
        PRECEDENCE[(ops[ops.length - 1] as { kind: "op"; op: FormulaOp }).op] >= PRECEDENCE[tok.op]
      ) {
        applyTopOp(output, ops.pop() as { kind: "op"; op: FormulaOp });
      }
      ops.push(tok);
      expect = "value";
    } else if (tok.kind === "lparen") {
      if (expect !== "value") {
        throw new FormulaError("This parenthesis can't sit right after a field — add an operator first.");
      }
      ops.push({ kind: "lparen" });
      expect = "value";
    } else if (tok.kind === "rparen") {
      if (expect !== "op") {
        throw new FormulaError("This closing parenthesis is empty or misplaced.");
      }
      let matched = false;
      while (ops.length > 0) {
        const top = ops.pop()!;
        if (top.kind === "lparen") {
          matched = true;
          break;
        }
        applyTopOp(output, top);
      }
      if (!matched) {
        throw new FormulaError("There's an extra closing parenthesis in this formula.");
      }
    }
  }
  if (expect !== "op") {
    throw new FormulaError("This formula ends partway through. Finish it with a field.");
  }
  while (ops.length > 0) {
    const top = ops.pop()!;
    if (top.kind === "lparen") {
      throw new FormulaError("There's an unclosed parenthesis in this formula.");
    }
    applyTopOp(output, top);
  }
  if (output.length !== 1) {
    throw new FormulaError("This formula has too many separate pieces.");
  }
  return output[0];
}

function applyTopOp(stack: ExpressionNode[], top: { kind: "op"; op: FormulaOp }) {
  const right = stack.pop();
  const left = stack.pop();
  if (!left || !right) {
    throw new FormulaError("This operator needs a field on each side.");
  }
  stack.push({ type: "binary", op: top.op, left, right });
}

export function collectFieldRefs(node: ExpressionNode, into: Set<string> = new Set()): Set<string> {
  if (node.type === "field") {
    into.add(node.key);
  } else {
    collectFieldRefs(node.left, into);
    collectFieldRefs(node.right, into);
  }
  return into;
}

// ─── Field-type lookups across registry + template ─────────────────────────

export type ResolvedField = {
  key: string;
  label: string;
  valueType: FieldValueType;
  source: "built_in" | "custom" | "calculated";
  calcOutputType?: CalcOutputType;
};

/** Single lookup that covers built-ins, custom fields, and calculated fields. */
export function buildFieldLookup(
  customFields: CustomFieldRecord[],
  calculatedFields: CalculatedFieldRecord[],
): Map<string, ResolvedField> {
  const m = new Map<string, ResolvedField>();
  for (const f of BUILT_IN_FIELDS) {
    m.set(f.key, {
      key: f.key,
      label: f.label,
      valueType: f.valueType,
      source: f.category === "calculated" ? "calculated" : "built_in",
      calcOutputType: f.outputType,
    });
  }
  // Template-scoped fields override built-ins of the same key. The CRM
  // "commissionPercentForAgency" stays canonical; custom fields use distinct
  // keys via newCustomFieldKey() so collisions can't happen in normal use.
  for (const f of customFields) {
    m.set(f.fieldKey, {
      key: f.fieldKey,
      label: f.label,
      valueType: customFieldValueType(f.fieldType),
      source: "custom",
    });
  }
  for (const f of calculatedFields) {
    m.set(f.fieldKey, {
      key: f.fieldKey,
      label: f.label,
      valueType: f.outputType,
      source: "calculated",
      calcOutputType: f.outputType,
    });
  }
  return m;
}

// ─── Type validation ───────────────────────────────────────────────────────

type Numeric = "number" | "currency" | "percentage";

function isNumericLike(t: FieldValueType): t is Numeric {
  return t === "number" || t === "currency" || t === "percentage";
}

function typeNoun(t: FieldValueType): string {
  switch (t) {
    case "text": return "text";
    case "long_text": return "text";
    case "dropdown": return "a dropdown choice";
    case "date": return "a date";
    case "number": return "a number";
    case "currency": return "a currency amount";
    case "percentage": return "a percentage";
  }
}

function checkBinaryType(
  op: FormulaOp,
  l: Numeric,
  r: Numeric,
  leftLabel: string,
  rightLabel: string,
): Numeric {
  // Currency × Percentage = Currency. Percentage × Currency = Currency.
  // Currency + Currency = Currency. Number ± Number = Number.
  // Divide always yields Number unless dividing currency-by-number, etc.
  if (op === "add" || op === "subtract") {
    if (l !== r) {
      throw new FormulaError(
        `“${leftLabel}” and “${rightLabel}” are different kinds of values — Plato can only add or subtract values of the same kind.`,
      );
    }
    return l;
  }
  if (op === "multiply") {
    if (l === "currency" && r === "percentage") return "currency";
    if (l === "percentage" && r === "currency") return "currency";
    if (l === "currency" && r === "number") return "currency";
    if (l === "number" && r === "currency") return "currency";
    if (l === "percentage" && r === "number") return "percentage";
    if (l === "number" && r === "percentage") return "percentage";
    if (l === "number" && r === "number") return "number";
    throw new FormulaError(
      `“${leftLabel}” × “${rightLabel}” doesn't produce a meaningful number.`,
    );
  }
  if (op === "divide") {
    if (l === "currency" && r === "number") return "currency";
    if (l === "number" && r === "number") return "number";
    if (l === "percentage" && r === "number") return "percentage";
    if (l === r) return "number"; // currency ÷ currency = ratio (number)
    throw new FormulaError(
      `“${leftLabel}” ÷ “${rightLabel}” doesn't produce a meaningful number.`,
    );
  }
  // percent_of: X percent_of Y === (X / 100) * Y
  if (op === "percent_of") {
    if (l !== "percentage") {
      throw new FormulaError(
        `“${leftLabel}” needs to be a percentage to use “% of”.`,
      );
    }
    if (r === "currency") return "currency";
    if (r === "number") return "number";
    if (r === "percentage") return "percentage";
    throw new FormulaError(
      `“% of ${rightLabel}” needs a numeric value on the right.`,
    );
  }
  return l;
}

export type FormulaValidation = {
  ok: true;
  tree: ExpressionNode;
  resultType: Numeric;
  dependencies: string[];
} | {
  ok: false;
  error: string;
};

/**
 * Validate a formula in the context of a draft template. Catches:
 *   • parser errors
 *   • missing field references
 *   • non-numeric operands
 *   • circular references between calculated fields
 *   • declared output-type mismatch
 */
export function validateFormula(
  tokens: FormulaToken[],
  fieldKey: string,
  declaredOutput: CalcOutputType,
  lookup: Map<string, ResolvedField>,
  /** Other calc fields in this template, for cycle detection. */
  calcFields: CalculatedFieldRecord[],
): FormulaValidation {
  let tree: ExpressionNode;
  try {
    tree = parseFormula(tokens);
  } catch (err) {
    if (err instanceof FormulaError) return { ok: false, error: err.message };
    throw err;
  }

  const refs = Array.from(collectFieldRefs(tree));
  const missing = refs.filter((k) => !lookup.has(k));
  if (missing.length > 0) {
    const label = missing[0];
    return {
      ok: false,
      error: `“${label}” isn't a field Plato can find — add it to the template first.`,
    };
  }
  if (refs.includes(fieldKey)) {
    return {
      ok: false,
      error: "This formula creates a circular calculation. Choose a field that doesn't depend on itself.",
    };
  }
  // Cycle detection: walk through calc fields and see if any path leads back.
  const calcByKey = new Map(calcFields.map((c) => [c.fieldKey, c] as const));
  const visiting = new Set<string>();
  function hasCycle(start: string, current: string): boolean {
    if (current === start) return true;
    if (visiting.has(current)) return false;
    visiting.add(current);
    const c = calcByKey.get(current);
    if (!c) return false;
    let tryTree: ExpressionNode;
    try {
      tryTree = parseFormula(c.tokens);
    } catch {
      return false;
    }
    for (const next of collectFieldRefs(tryTree)) {
      if (hasCycle(start, next)) return true;
    }
    return false;
  }
  for (const r of refs) {
    if (hasCycle(fieldKey, r)) {
      const labelForCycle = calcByKey.get(r)?.label ?? lookup.get(r)?.label ?? r;
      return {
        ok: false,
        error: `This formula creates a circular calculation. Choose a field that does not depend on “${labelForCycle}”.`,
      };
    }
  }

  // Walk the tree, type-checking each binary node.
  let resultType: Numeric;
  try {
    resultType = walkType(tree, lookup);
  } catch (err) {
    if (err instanceof FormulaError) return { ok: false, error: err.message };
    throw err;
  }
  if (resultType !== declaredOutput) {
    return {
      ok: false,
      error: `This formula produces ${aOrAn(resultType)} ${resultType}, but the output is set to ${declaredOutput}. Change the output type or adjust the formula.`,
    };
  }
  return { ok: true, tree, resultType, dependencies: refs };
}

function aOrAn(noun: string) {
  return /^[aeiou]/i.test(noun) ? "an" : "a";
}

function walkType(node: ExpressionNode, lookup: Map<string, ResolvedField>): Numeric {
  if (node.type === "field") {
    const f = lookup.get(node.key);
    if (!f) throw new FormulaError("This formula references a field Plato can't find.");
    if (!isNumericLike(f.valueType)) {
      throw new FormulaError(
        `This calculation does not work because ${f.label} is ${typeNoun(f.valueType)} and cannot be used in arithmetic.`,
      );
    }
    return f.valueType;
  }
  const l = walkType(node.left, lookup);
  const r = walkType(node.right, lookup);
  const leftLabel = labelOfSubtree(node.left, lookup);
  const rightLabel = labelOfSubtree(node.right, lookup);
  return checkBinaryType(node.op, l, r, leftLabel, rightLabel);
}

function labelOfSubtree(node: ExpressionNode, lookup: Map<string, ResolvedField>): string {
  if (node.type === "field") return lookup.get(node.key)?.label ?? node.key;
  return "this expression";
}

// ─── Evaluation ────────────────────────────────────────────────────────────

export type EvalResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/**
 * Evaluate a parsed formula against resolved numeric values. Used both for
 * live preview in the composition form and for rendering the email body.
 *
 * `values` holds raw numbers (currency in major units, percentage as a
 * percent — e.g. 15 not 0.15). Percent operations divide by 100 internally.
 */
export function evaluateFormula(
  tree: ExpressionNode,
  values: Map<string, number | null>,
  lookup: Map<string, ResolvedField>,
): EvalResult {
  try {
    const result = evalNode(tree, values, lookup);
    if (!Number.isFinite(result)) {
      return { ok: false, error: "missing" };
    }
    return { ok: true, value: result };
  } catch (err) {
    if (err instanceof FormulaError) return { ok: false, error: err.message };
    throw err;
  }
}

function evalNode(
  node: ExpressionNode,
  values: Map<string, number | null>,
  lookup: Map<string, ResolvedField>,
): number {
  if (node.type === "field") {
    const v = values.get(node.key);
    if (v == null) throw new FormulaError("missing");
    return v;
  }
  const left = evalNode(node.left, values, lookup);
  const right = evalNode(node.right, values, lookup);
  switch (node.op) {
    case "add": return left + right;
    case "subtract": return left - right;
    case "multiply": {
      // currency × percentage / percentage × currency uses the percent form.
      const lt = walkType(node.left, lookup);
      const rt = walkType(node.right, lookup);
      if (lt === "percentage" && rt !== "percentage") return (left / 100) * right;
      if (rt === "percentage" && lt !== "percentage") return left * (right / 100);
      return left * right;
    }
    case "divide": {
      if (right === 0) {
        throw new FormulaError("This calculation tries to divide by zero. Enter a non-zero value.");
      }
      return left / right;
    }
    case "percent_of": return (left / 100) * right;
  }
}

// ─── Helpers shared with the wire layer ────────────────────────────────────

export function serializeTreeForStorage(tree: ExpressionNode): string {
  return JSON.stringify(tree);
}

export function deserializeTreeFromStorage(raw: string): ExpressionNode {
  const parsed = JSON.parse(raw) as ExpressionNode;
  return parsed;
}

/**
 * Detect direct dependencies of every calculated field. Returns a topological
 * order; throws FormulaError on cycles or unknown refs. The composition form
 * uses this to recompute values in the right order on every input change.
 */
export function topologicallyOrderCalcs(
  calcs: CalculatedFieldRecord[],
  lookup: Map<string, ResolvedField>,
): CalculatedFieldRecord[] {
  const byKey = new Map(calcs.map((c) => [c.fieldKey, c] as const));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const out: CalculatedFieldRecord[] = [];

  function visit(key: string) {
    if (visited.has(key)) return;
    if (visiting.has(key)) {
      throw new FormulaError("Two calculated fields depend on each other in a loop.");
    }
    const c = byKey.get(key);
    if (!c) return; // not a calc (built-in or input) — leaf
    visiting.add(key);
    let tree: ExpressionNode;
    try {
      tree = parseFormula(c.tokens);
    } catch (err) {
      if (err instanceof FormulaError) throw err;
      throw err;
    }
    for (const dep of collectFieldRefs(tree)) {
      if (byKey.has(dep)) visit(dep);
      if (!lookup.has(dep)) {
        throw new FormulaError(`“${dep}” isn't a field Plato can find.`);
      }
    }
    visiting.delete(key);
    visited.add(key);
    out.push(c);
  }

  for (const c of calcs) visit(c.fieldKey);
  return out;
}

/**
 * Mint a stable internal key for a brand-new custom or calculated field, from
 * its human label. Falls back to a short random suffix to dodge collisions
 * within the same template. Never shown in the UI.
 */
export function newCustomFieldKey(label: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "_$1")
    .slice(0, 40) || "field";
  let candidate = `c_${base}`;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `c_${base}_${n++}`;
  }
  return candidate;
}
