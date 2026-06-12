// Resolve raw CRM context (author, editor, agency, payment details, user
// inputs) into a flat map of field key → numeric/string value, then render the
// tokenized body. Pure functions: no IO, isomorphic.

import type { AuthorRecord } from "@/lib/authors";
import type { EditorOutreachRecord } from "@/lib/editorOutreach";
import type { AuthorPaymentDetailsRecord } from "@/lib/paymentDetails";
import { formatRenewalInterval, formatDisplayDate } from "@/lib/royalties";
import {
  buildFieldLookup,
  evaluateFormula,
  parseFormula,
  topologicallyOrderCalcs,
  type ResolvedField,
} from "./formula";
import {
  BUILT_IN_FIELDS,
  getBuiltInField,
  type BuiltInField,
  type CrmSource,
} from "./registry";
import type {
  BodySegment,
  CalculatedFieldRecord,
  CustomFieldRecord,
  PaymentEmailTemplateRecord,
} from "./types";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyDisplay(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return USD.format(v);
}

export function formatPercentDisplay(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  // Strip trailing zeros, but keep e.g. 12.5%.
  return `${parseFloat(v.toFixed(4))}%`;
}

export function formatNumberDisplay(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(v);
}

/** Inputs the caller has gathered to render or preview an email. */
export type RenderContext = {
  template: PaymentEmailTemplateRecord;
  author: AuthorRecord | null;
  editor: EditorOutreachRecord | null;
  paymentDetails: AuthorPaymentDetailsRecord | null;
  agencyName: string;
  /** User-entered values keyed by field key. Strings as typed. */
  inputs: Record<string, string>;
};

export type ResolvedValues = {
  /** Display strings, ready to interpolate into the body. */
  display: Map<string, string>;
  /** Raw numeric values for currency/percentage/number fields. */
  numeric: Map<string, number | null>;
  /** Calculated values keyed by field key, with success/error per field. */
  calc: Map<string, { ok: true; value: number } | { ok: false; error: string }>;
};

function parseNumeric(raw: string | undefined): number | null {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function readCrm(field: BuiltInField, ctx: RenderContext): string | null {
  const { author, editor, paymentDetails, agencyName } = ctx;
  switch (field.crmSource as CrmSource | undefined) {
    case "author":
      if (!author) return null;
      switch (field.key) {
        case "authorFirstName": return author.firstName;
        case "authorLastName": return author.lastName;
        case "authorFullName": return `${author.firstName} ${author.lastName}`.trim();
        case "authorEmail": return author.email;
        case "bookTitle": return author.title;
        case "genre": return author.genre;
        case "headAgent": return author.headAgent;
        case "headAgentEmail": return author.headAgentEmail;
        case "assignedAssistant": return author.assignedAssistant;
        default: return null;
      }
    case "editor":
      if (!editor) return null;
      switch (field.key) {
        case "editorFirstName": return editor.editorFirstName;
        case "editorLastName": return editor.editorLastName;
        case "editorFullName": return `${editor.editorFirstName} ${editor.editorLastName}`.trim();
        case "editorEmail": return editor.editorEmail;
        case "publishingHouse": return editor.publishingHouse;
        default: return null;
      }
    case "agency":
      if (field.key === "agencyName") return agencyName || null;
      return null;
    case "payment_details":
      if (!paymentDetails) return null;
      switch (field.key) {
        case "commissionPercentForAgency":
          return paymentDetails.commissionPercentForAgency == null
            ? null
            : String(paymentDetails.commissionPercentForAgency);
        case "firstRoyaltyStatementDate":
          return paymentDetails.firstRoyaltyStatementDate;
        case "renewalCadence":
          return formatRenewalInterval(
            paymentDetails.renewalIntervalNumber,
            paymentDetails.renewalIntervalUnit,
          );
        case "lastSentToAuthor":
          return paymentDetails.lastSentToAuthorDate;
        case "nextSendToAuthor":
          return paymentDetails.nextSendToAuthorDate;
        default: return null;
      }
    default:
      return null;
  }
}

/**
 * Resolve every field referenced (directly or transitively) by the template.
 * Standard / custom inputs come from `inputs`. CRM fields come from the
 * provided records. Calculated fields are evaluated in topological order.
 */
export function resolveFieldValues(ctx: RenderContext): ResolvedValues {
  const { template, inputs } = ctx;
  const lookup = buildFieldLookup(template.customFields, template.calculatedFields);
  const display = new Map<string, string>();
  const numeric = new Map<string, number | null>();
  const calc = new Map<
    string,
    { ok: true; value: number } | { ok: false; error: string }
  >();

  // 1) Built-in CRM + standard inputs.
  for (const f of BUILT_IN_FIELDS) {
    if (f.category === "calculated") continue;

    // Standard inputs (incl. agency Sender Name) — read from `inputs` first.
    let raw: string | null = null;
    if (f.category === "standard_input") {
      raw = inputs[f.key]?.trim() || null;
      // Sender Name defaults from the selected author's head agent so the
      // legacy behavior is preserved without forcing a template change.
      if (raw == null && f.key === "senderName" && ctx.author) {
        raw = ctx.author.headAgent || null;
      }
    } else if (f.category === "crm") {
      // CRM fields are editable in the composition form too (auto-fill +
      // override). If the user typed an override, prefer it.
      const override = inputs[f.key]?.trim();
      raw = override ? override : readCrm(f, ctx);
    }

    // Final fallback: the registry's declared default. Without this,
    // standard inputs like Commission Type (defaultValue: "advance") would
    // render as a [Commission Type] placeholder in the email even though the
    // composition form shows "advance" pre-selected in the dropdown — the
    // form's UI default never made it back into the rendered value.
    if (raw == null && f.defaultValue) {
      raw = f.defaultValue;
    }

    if (f.valueType === "currency" || f.valueType === "percentage" || f.valueType === "number") {
      const n = parseNumeric(raw ?? undefined);
      numeric.set(f.key, n);
      display.set(
        f.key,
        n == null
          ? "—"
          : f.valueType === "currency"
            ? formatCurrencyDisplay(n)
            : f.valueType === "percentage"
              ? formatPercentDisplay(n)
              : formatNumberDisplay(n),
      );
    } else if (f.valueType === "date") {
      display.set(f.key, raw ? formatDisplayDate(raw) : "—");
    } else {
      display.set(f.key, raw ?? "");
    }
  }

  // 2) Custom fields from the template.
  for (const cf of template.customFields) {
    const raw = inputs[cf.fieldKey]?.trim();
    const valueType = lookup.get(cf.fieldKey)?.valueType ?? "text";
    if (valueType === "currency" || valueType === "percentage" || valueType === "number") {
      const n = parseNumeric(raw);
      numeric.set(cf.fieldKey, n);
      display.set(
        cf.fieldKey,
        n == null
          ? "—"
          : valueType === "currency"
            ? formatCurrencyDisplay(n)
            : valueType === "percentage"
              ? formatPercentDisplay(n)
              : formatNumberDisplay(n),
      );
    } else {
      display.set(cf.fieldKey, raw ?? cf.defaultValue ?? "");
    }
  }

  // 3) Calculated fields, in dependency order. Failures (missing input,
  //    divide-by-zero) display as "—" and short-circuit dependents.
  let ordered: CalculatedFieldRecord[];
  try {
    ordered = topologicallyOrderCalcs(template.calculatedFields, lookup);
  } catch {
    ordered = template.calculatedFields;
  }
  for (const c of ordered) {
    let tree;
    try {
      tree = parseFormula(c.tokens);
    } catch {
      calc.set(c.fieldKey, { ok: false, error: "missing" });
      numeric.set(c.fieldKey, null);
      display.set(c.fieldKey, "—");
      continue;
    }
    const result = evaluateFormula(tree, numeric, lookup);
    calc.set(c.fieldKey, result);
    if (result.ok) {
      numeric.set(c.fieldKey, result.value);
      display.set(
        c.fieldKey,
        c.outputType === "currency"
          ? formatCurrencyDisplay(result.value)
          : c.outputType === "percentage"
            ? formatPercentDisplay(result.value)
            : formatNumberDisplay(result.value),
      );
    } else {
      numeric.set(c.fieldKey, null);
      display.set(c.fieldKey, "—");
    }
  }

  return { display, numeric, calc };
}

/** Render the tokenized body to plain text, substituting display values. */
export function renderBodyToPlainText(
  body: BodySegment[],
  values: ResolvedValues,
  lookupLabel: (key: string) => string | undefined,
): string {
  return body
    .map((seg) =>
      seg.t === "text"
        ? seg.v
        : (() => {
            const display = values.display.get(seg.k);
            if (display !== undefined && display !== "" && display !== "—") {
              return display;
            }
            const label = lookupLabel(seg.k);
            return `[${label ?? seg.k}]`;
          })(),
    )
    .join("");
}

/**
 * Walk the template body + calculations + summary row and return the full set
 * of field keys it references. Used by the composition form to decide which
 * inputs to surface and which CRM selectors to render.
 */
export function collectTemplateFieldRefs(
  template: PaymentEmailTemplateRecord,
): Set<string> {
  const refs = new Set<string>();
  for (const seg of template.body) {
    if (seg.t === "field") refs.add(seg.k);
  }
  for (const c of template.calculatedFields) {
    try {
      const tree = parseFormula(c.tokens);
      const inner = new Set<string>();
      walkRefs(tree, inner);
      for (const k of inner) refs.add(k);
    } catch {
      // Skip malformed formulas — surfaced separately when editing.
    }
  }
  for (const s of template.summaryFields) refs.add(s.fieldKey);
  return refs;
}

function walkRefs(node: { type: "field"; key: string } | { type: "binary"; op: unknown; left: unknown; right: unknown }, into: Set<string>) {
  if ((node as { type: string }).type === "field") {
    into.add((node as { key: string }).key);
  } else {
    walkRefs((node as { left: typeof node }).left, into);
    walkRefs((node as { right: typeof node }).right, into);
  }
}

/**
 * Expand a field-ref set with the transitive dependencies of any calculated
 * field referenced. The composition form needs all underlying inputs, even
 * when only the calculated result appears in the body.
 */
export function expandWithCalcDeps(
  refs: Set<string>,
  template: PaymentEmailTemplateRecord,
): Set<string> {
  const out = new Set(refs);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of template.calculatedFields) {
      if (!out.has(c.fieldKey)) continue;
      try {
        const tree = parseFormula(c.tokens);
        const inner = new Set<string>();
        walkRefs(tree, inner);
        for (const k of inner) {
          if (!out.has(k)) {
            out.add(k);
            changed = true;
          }
        }
      } catch {
        // ignored — surfaced when validating
      }
    }
  }
  return out;
}

/** What CRM selectors does this template need shown? */
export function inferSelectors(refs: Set<string>): {
  needsAuthor: boolean;
  needsEditor: boolean;
} {
  let needsAuthor = false;
  let needsEditor = false;
  for (const k of refs) {
    const f = getBuiltInField(k);
    if (!f) continue;
    if (f.crmSource === "author" || f.crmSource === "payment_details") needsAuthor = true;
    if (f.crmSource === "editor") needsEditor = true;
    // Sender Name defaults from headAgent → author selector helps.
    if (f.key === "senderName") needsAuthor = true;
  }
  return { needsAuthor, needsEditor };
}

export type { ResolvedField };
