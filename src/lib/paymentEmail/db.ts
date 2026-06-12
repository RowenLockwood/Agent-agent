// DB layer for Payment Email templates. Templates are read in one shot
// (template + custom + calc + summary) and written by replacing the
// template-scoped rows inside a transaction. Sequential writes mirror the
// pattern already used in paymentDetails.ts to avoid Neon HTTP adapter
// reliability issues with mixed-model transaction arrays.

import { prisma } from "@/lib/db";
import {
  parseFormula,
  serializeTreeForStorage,
} from "./formula";
import {
  SYSTEM_DEFAULT_TEMPLATE_ID,
  buildSystemDefaultRecord,
} from "./defaultTemplate";
import type {
  BodySegment,
  CalcOutputType,
  CalculatedFieldRecord,
  CustomFieldRecord,
  CustomFieldType,
  ExpressionNode,
  FormulaToken,
  PaymentEmailTemplateRecord,
  SummaryFieldRecord,
  TemplateDraftInput,
} from "./types";
import { CUSTOM_FIELD_TYPES, CALC_OUTPUT_TYPES } from "./types";

// ─── Type guards (sanity checks on stored JSON) ─────────────────────────────

function isBodySegmentArray(v: unknown): v is BodySegment[] {
  return (
    Array.isArray(v) &&
    v.every(
      (s) =>
        s != null &&
        typeof s === "object" &&
        ((s as { t?: unknown }).t === "text" || (s as { t?: unknown }).t === "field"),
    )
  );
}

function isCustomFieldType(v: unknown): v is CustomFieldType {
  return typeof v === "string" && CUSTOM_FIELD_TYPES.includes(v as CustomFieldType);
}

function isCalcOutputType(v: unknown): v is CalcOutputType {
  return typeof v === "string" && CALC_OUTPUT_TYPES.includes(v as CalcOutputType);
}

function asTokensFromTree(raw: string): FormulaToken[] {
  // Stored expression tree → reconstructed token sequence (left-to-right
  // walk). The builder UI roundtrips on save/load via this conversion.
  const tree = JSON.parse(raw) as ExpressionNode;
  const out: FormulaToken[] = [];
  walkTree(tree, out);
  return out;
}

function walkTree(node: ExpressionNode, out: FormulaToken[]): void {
  if (node.type === "field") {
    out.push({ kind: "field", key: node.key });
    return;
  }
  // Walk in-order. We currently never write parentheses to disk because the
  // tree itself encodes precedence; UI parentheses are reconstructed when the
  // user explicitly groups in the canvas.
  walkTree(node.left, out);
  out.push({ kind: "op", op: node.op });
  walkTree(node.right, out);
}

function parseDropdownOptions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return [];
}

// ─── Read ───────────────────────────────────────────────────────────────────

const TEMPLATE_INCLUDE = {
  customFields: { orderBy: { createdAt: "asc" as const } },
  calculatedFields: { orderBy: { createdAt: "asc" as const } },
  summaryFields: { orderBy: { displayOrder: "asc" as const } },
};

type TemplateRow = NonNullable<
  Awaited<ReturnType<typeof prisma.paymentEmailTemplate.findUnique>>
> & {
  customFields: Array<{
    fieldKey: string;
    label: string;
    fieldType: string;
    isRequired: boolean;
    placeholder: string | null;
    defaultValue: string | null;
    dropdownOptions: string | null;
  }>;
  calculatedFields: Array<{
    fieldKey: string;
    label: string;
    outputType: string;
    expressionTree: string;
  }>;
  summaryFields: Array<{
    fieldKey: string;
    summaryLabel: string;
    displayOrder: number;
  }>;
};

function rowToRecord(row: TemplateRow): PaymentEmailTemplateRecord {
  const parsedBody = JSON.parse(row.tokenizedBody) as unknown;
  const body: BodySegment[] = isBodySegmentArray(parsedBody) ? parsedBody : [];

  const customFields: CustomFieldRecord[] = row.customFields.map((cf) => ({
    fieldKey: cf.fieldKey,
    label: cf.label,
    fieldType: isCustomFieldType(cf.fieldType) ? cf.fieldType : "short_text",
    isRequired: cf.isRequired,
    placeholder: cf.placeholder,
    defaultValue: cf.defaultValue,
    dropdownOptions: parseDropdownOptions(cf.dropdownOptions),
  }));

  const calculatedFields: CalculatedFieldRecord[] = row.calculatedFields.map(
    (c) => ({
      fieldKey: c.fieldKey,
      label: c.label,
      outputType: isCalcOutputType(c.outputType) ? c.outputType : "number",
      tokens: (() => {
        try {
          return asTokensFromTree(c.expressionTree);
        } catch {
          return [];
        }
      })(),
    }),
  );

  const summaryFields: SummaryFieldRecord[] = row.summaryFields.map((s) => ({
    fieldKey: s.fieldKey,
    summaryLabel: s.summaryLabel,
  }));

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    subjectLine: row.subjectLine,
    body,
    isSystemDefault: row.isSystemDefault,
    isAgencyDefault: row.isAgencyDefault,
    versionNumber: row.versionNumber,
    parentTemplateId: row.parentTemplateId,
    customFields,
    calculatedFields,
    summaryFields,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Seed the protected Plato Default if it isn't on disk yet, and heal a
 * partially-seeded one (parent row written, children missing — the state a
 * crashed seed leaves behind, since HTTP mode has no transactions to roll
 * back the parent).
 *
 * IMPORTANT (Neon HTTP adapter): `createMany` and `updateMany` open an
 * implicit transaction in Prisma's query compiler and fail over HTTP with
 * "Transactions are not supported in HTTP mode" — even for a single row.
 * Single-row `create`/`update`/`delete`/`deleteMany` and reads (including
 * relation `include`) are single-statement and safe. Verified empirically
 * against prisma@7.8.0 + @prisma/adapter-neon@7.8.0; see
 * scripts/check-neon-http-compat.ts.
 */
async function ensureSystemDefault(): Promise<TemplateRow> {
  const existing = await prisma.paymentEmailTemplate.findUnique({
    where: { id: SYSTEM_DEFAULT_TEMPLATE_ID },
    include: TEMPLATE_INCLUDE,
  });
  const seed = buildSystemDefaultRecord();
  const intact =
    existing &&
    existing.calculatedFields.length >= seed.calculatedFields.length &&
    existing.summaryFields.length >= seed.summaryFields.length;
  if (intact) return existing as unknown as TemplateRow;

  if (!existing) {
    await prisma.paymentEmailTemplate.create({
      data: {
        id: SYSTEM_DEFAULT_TEMPLATE_ID,
        name: seed.name,
        description: seed.description,
        subjectLine: seed.subjectLine,
        tokenizedBody: JSON.stringify(seed.body),
        plainTextBodyFallback: bodyToFallback(seed.body, [], []),
        isSystemDefault: true,
        isAgencyDefault: false,
        isActive: true,
        versionNumber: 1,
      },
    });
  }

  // (Re)build the children from the seed spec. deleteMany keeps this
  // idempotent when healing a partial seed.
  await prisma.paymentEmailCalculatedField.deleteMany({
    where: { templateId: SYSTEM_DEFAULT_TEMPLATE_ID },
  });
  await prisma.paymentEmailSummaryField.deleteMany({
    where: { templateId: SYSTEM_DEFAULT_TEMPLATE_ID },
  });
  for (const c of seed.calculatedFields) {
    await prisma.paymentEmailCalculatedField.create({
      data: {
        templateId: SYSTEM_DEFAULT_TEMPLATE_ID,
        fieldKey: c.fieldKey,
        label: c.label,
        outputType: c.outputType,
        expressionTree: serializeTreeForStorage(parseFormula(c.tokens)),
      },
    });
  }
  for (const [i, s] of seed.summaryFields.entries()) {
    await prisma.paymentEmailSummaryField.create({
      data: {
        templateId: SYSTEM_DEFAULT_TEMPLATE_ID,
        fieldKey: s.fieldKey,
        summaryLabel: s.summaryLabel,
        displayOrder: i,
      },
    });
  }

  const seeded = await prisma.paymentEmailTemplate.findUnique({
    where: { id: SYSTEM_DEFAULT_TEMPLATE_ID },
    include: TEMPLATE_INCLUDE,
  });
  if (!seeded) throw new Error("Failed to seed Plato Default Payment Email.");
  return seeded as unknown as TemplateRow;
}

function bodyToFallback(
  body: BodySegment[],
  customs: CustomFieldRecord[],
  calcs: CalculatedFieldRecord[],
): string {
  // Render each field token as [Label] — survives if the tokenized body ever
  // can't be parsed back at render time.
  const customLabels = new Map(customs.map((c) => [c.fieldKey, c.label] as const));
  const calcLabels = new Map(calcs.map((c) => [c.fieldKey, c.label] as const));
  return body
    .map((seg) =>
      seg.t === "text"
        ? seg.v
        : `[${customLabels.get(seg.k) ?? calcLabels.get(seg.k) ?? seg.k}]`,
    )
    .join("");
}

export async function listTemplates(): Promise<PaymentEmailTemplateRecord[]> {
  await ensureSystemDefault();
  const rows = await prisma.paymentEmailTemplate.findMany({
    where: { isActive: true },
    include: TEMPLATE_INCLUDE,
    orderBy: [{ isSystemDefault: "desc" }, { name: "asc" }],
  });
  return (rows as unknown as TemplateRow[]).map(rowToRecord);
}

export async function getTemplate(
  id: string,
): Promise<PaymentEmailTemplateRecord | null> {
  if (id === SYSTEM_DEFAULT_TEMPLATE_ID) {
    return rowToRecord(await ensureSystemDefault());
  }
  const row = await prisma.paymentEmailTemplate.findUnique({
    where: { id },
    include: TEMPLATE_INCLUDE,
  });
  if (!row) return null;
  return rowToRecord(row as unknown as TemplateRow);
}

export async function getEffectiveDefaultTemplateId(): Promise<string> {
  // Caller-facing helper: the initial selection should be the agency default
  // if one has been chosen, otherwise the Plato system default.
  const agencyDefault = await prisma.paymentEmailTemplate.findFirst({
    where: { isAgencyDefault: true, isActive: true },
    select: { id: true },
  });
  return agencyDefault?.id ?? SYSTEM_DEFAULT_TEMPLATE_ID;
}

// ─── Write ──────────────────────────────────────────────────────────────────

export type SaveTemplateInput = TemplateDraftInput & {
  /** When provided, this is a copy/version of an existing template. */
  parentTemplateId?: string | null;
};

/** Create a new template (Build New, Duplicate, Create New Version). */
export async function createTemplate(
  input: SaveTemplateInput,
): Promise<PaymentEmailTemplateRecord> {
  await ensureSystemDefault();
  // versionNumber for child versions counts within the parent's lineage.
  let versionNumber = 1;
  if (input.parentTemplateId) {
    const siblings = await prisma.paymentEmailTemplate.count({
      where: { parentTemplateId: input.parentTemplateId },
    });
    versionNumber = siblings + 2;
  }
  // Same sequential pattern as the seed path — see ensureSystemDefault for
  // why we don't use nested creates here.
  const created = await prisma.paymentEmailTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      subjectLine: input.subjectLine,
      tokenizedBody: JSON.stringify(input.body),
      plainTextBodyFallback: bodyToFallback(
        input.body,
        input.customFields,
        input.calculatedFields,
      ),
      isSystemDefault: false,
      isAgencyDefault: false,
      isActive: true,
      versionNumber,
      parentTemplateId: input.parentTemplateId ?? null,
    },
  });

  await writeTemplateChildren(created.id, input);

  const fresh = await prisma.paymentEmailTemplate.findUnique({
    where: { id: created.id },
    include: TEMPLATE_INCLUDE,
  });
  if (!fresh) throw new Error("Template vanished mid-create.");
  return rowToRecord(fresh as unknown as TemplateRow);
}

// Per-row creates, NOT createMany — see the Neon HTTP note on
// ensureSystemDefault.
async function writeTemplateChildren(
  templateId: string,
  input: TemplateDraftInput,
): Promise<void> {
  for (const cf of input.customFields) {
    await prisma.paymentEmailCustomField.create({
      data: {
        templateId,
        fieldKey: cf.fieldKey,
        label: cf.label,
        fieldType: cf.fieldType,
        isRequired: cf.isRequired,
        placeholder: cf.placeholder,
        defaultValue: cf.defaultValue,
        dropdownOptions:
          cf.fieldType === "dropdown" ? JSON.stringify(cf.dropdownOptions) : null,
      },
    });
  }
  for (const c of input.calculatedFields) {
    await prisma.paymentEmailCalculatedField.create({
      data: {
        templateId,
        fieldKey: c.fieldKey,
        label: c.label,
        outputType: c.outputType,
        expressionTree: serializeTreeForStorage(parseFormula(c.tokens)),
      },
    });
  }
  for (const [i, s] of input.summaryFields.entries()) {
    await prisma.paymentEmailSummaryField.create({
      data: {
        templateId,
        fieldKey: s.fieldKey,
        summaryLabel: s.summaryLabel,
        displayOrder: i,
      },
    });
  }
}

/** Update an existing user-created template. Rejects the system default. */
export async function updateTemplate(
  id: string,
  input: TemplateDraftInput,
): Promise<PaymentEmailTemplateRecord> {
  if (id === SYSTEM_DEFAULT_TEMPLATE_ID) {
    throw new Error("Plato Default Payment Email is protected and cannot be edited.");
  }
  const existing = await prisma.paymentEmailTemplate.findUnique({ where: { id } });
  if (!existing) throw new Error("Template not found.");
  if (existing.isSystemDefault) {
    throw new Error("This template is protected and cannot be edited.");
  }

  // Sequential writes — see paymentDetails.ts for the same pattern.
  await prisma.paymentEmailCustomField.deleteMany({ where: { templateId: id } });
  await prisma.paymentEmailCalculatedField.deleteMany({ where: { templateId: id } });
  await prisma.paymentEmailSummaryField.deleteMany({ where: { templateId: id } });

  await prisma.paymentEmailTemplate.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      subjectLine: input.subjectLine,
      tokenizedBody: JSON.stringify(input.body),
      plainTextBodyFallback: bodyToFallback(
        input.body,
        input.customFields,
        input.calculatedFields,
      ),
    },
  });

  await writeTemplateChildren(id, input);

  const fresh = await prisma.paymentEmailTemplate.findUnique({
    where: { id },
    include: TEMPLATE_INCLUDE,
  });
  if (!fresh) throw new Error("Template vanished mid-update.");
  return rowToRecord(fresh as unknown as TemplateRow);
}

/** Rename only. */
export async function renameTemplate(
  id: string,
  name: string,
): Promise<PaymentEmailTemplateRecord> {
  if (id === SYSTEM_DEFAULT_TEMPLATE_ID) {
    throw new Error("Plato Default Payment Email is protected and cannot be renamed.");
  }
  await prisma.paymentEmailTemplate.update({
    where: { id },
    data: { name: name.trim() },
  });
  const fresh = await prisma.paymentEmailTemplate.findUnique({
    where: { id },
    include: TEMPLATE_INCLUDE,
  });
  if (!fresh) throw new Error("Template not found.");
  return rowToRecord(fresh as unknown as TemplateRow);
}

/** Soft-delete a user-created template. The system default is protected. */
export async function deleteTemplate(id: string): Promise<void> {
  if (id === SYSTEM_DEFAULT_TEMPLATE_ID) {
    throw new Error("Plato Default Payment Email is protected and cannot be deleted.");
  }
  const existing = await prisma.paymentEmailTemplate.findUnique({ where: { id } });
  if (!existing) return;
  if (existing.isAgencyDefault) {
    throw new Error(
      "This template is the agency default — set another template as the default before archiving this one.",
    );
  }
  await prisma.paymentEmailTemplate.update({
    where: { id },
    data: { isActive: false, isAgencyDefault: false },
  });
}

/** Mark a template as the agency default (clearing any existing one). */
export async function setAgencyDefault(
  id: string,
): Promise<PaymentEmailTemplateRecord> {
  // Allow setting either the protected system default OR a user template as
  // the agency default — both are valid choices.
  await ensureSystemDefault();
  const target = await prisma.paymentEmailTemplate.findUnique({ where: { id } });
  if (!target) throw new Error("Template not found.");

  // updateMany opens an implicit transaction (fails on Neon HTTP) — clear
  // existing defaults one by one. There's at most one in practice.
  const currentDefaults = await prisma.paymentEmailTemplate.findMany({
    where: { isAgencyDefault: true, NOT: { id } },
    select: { id: true },
  });
  for (const row of currentDefaults) {
    await prisma.paymentEmailTemplate.update({
      where: { id: row.id },
      data: { isAgencyDefault: false },
    });
  }
  await prisma.paymentEmailTemplate.update({
    where: { id },
    data: { isAgencyDefault: true },
  });
  const fresh = await prisma.paymentEmailTemplate.findUnique({
    where: { id },
    include: TEMPLATE_INCLUDE,
  });
  if (!fresh) throw new Error("Template vanished mid-update.");
  return rowToRecord(fresh as unknown as TemplateRow);
}

export { rowToRecord, ensureSystemDefault };
