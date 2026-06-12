"use server";

import { z } from "zod";
import {
  createTemplate,
  deleteTemplate,
  getEffectiveDefaultTemplateId,
  getTemplate,
  listTemplates,
  renameTemplate,
  setAgencyDefault,
  updateTemplate,
  type SaveTemplateInput,
} from "@/lib/paymentEmail/db";
import { buildFieldLookup, validateFormula } from "@/lib/paymentEmail/formula";
import { isBuiltInFieldKey } from "@/lib/paymentEmail/registry";
import {
  MAX_UPLOAD_BYTES,
  sanitizeTemplateText,
  validateUpload,
} from "@/lib/paymentEmail/sanitize";
import {
  CALC_OUTPUT_TYPES,
  CUSTOM_FIELD_TYPES,
  type CalcOutputType,
  type CustomFieldType,
  type PaymentEmailTemplateRecord,
  type TemplateDraftInput,
} from "@/lib/paymentEmail/types";

// ─── Schemas ────────────────────────────────────────────────────────────────

const bodySegmentSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("text"), v: z.string() }),
  z.object({ t: z.literal("field"), k: z.string().min(1).max(80) }),
]);

const formulaTokenSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("field"), key: z.string().min(1).max(80) }),
  z.object({
    kind: z.literal("op"),
    op: z.enum(["add", "subtract", "multiply", "divide", "percent_of"]),
  }),
  z.object({ kind: z.literal("lparen") }),
  z.object({ kind: z.literal("rparen") }),
]);

const customFieldSchema = z.object({
  fieldKey: z.string().min(1).max(80),
  label: z.string().trim().min(1, "Custom field label is required.").max(120),
  fieldType: z.enum(CUSTOM_FIELD_TYPES as [CustomFieldType, ...CustomFieldType[]]),
  isRequired: z.boolean(),
  placeholder: z.string().nullable(),
  defaultValue: z.string().nullable(),
  dropdownOptions: z.array(z.string().trim().min(1).max(120)).max(40),
});

const calculatedFieldSchema = z.object({
  fieldKey: z.string().min(1).max(80),
  label: z.string().trim().min(1, "Calculation label is required.").max(120),
  outputType: z.enum(CALC_OUTPUT_TYPES as [CalcOutputType, ...CalcOutputType[]]),
  tokens: z.array(formulaTokenSchema).min(1, "Add at least one field to the formula."),
});

const summaryFieldSchema = z.object({
  fieldKey: z.string().min(1).max(80),
  summaryLabel: z.string().trim().min(1, "Summary label is required.").max(40),
});

const draftSchema = z.object({
  name: z.string().trim().min(1, "Template name is required.").max(120),
  description: z.string().trim().max(400).default(""),
  subjectLine: z.string().trim().max(200).nullable(),
  body: z.array(bodySegmentSchema).max(5_000),
  customFields: z.array(customFieldSchema).max(40),
  calculatedFields: z.array(calculatedFieldSchema).max(40),
  summaryFields: z
    .array(summaryFieldSchema)
    .max(4, "Choose up to four fields for the payment summary."),
  parentTemplateId: z.string().nullable().optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function validateDraft(
  draft: TemplateDraftInput,
): { ok: true } | { ok: false; error: string } {
  // Every field referenced in the body must exist somewhere.
  const known = new Set<string>(
    draft.customFields.map((c) => c.fieldKey).concat(
      draft.calculatedFields.map((c) => c.fieldKey),
    ),
  );
  for (const seg of draft.body) {
    if (seg.t === "field" && !known.has(seg.k) && !isBuiltInFieldKey(seg.k)) {
      return { ok: false, error: `The field “${seg.k}” isn't defined in this template.` };
    }
  }
  for (const s of draft.summaryFields) {
    if (!known.has(s.fieldKey) && !isBuiltInFieldKey(s.fieldKey)) {
      return {
        ok: false,
        error: `The summary row references “${s.fieldKey}”, which isn't defined.`,
      };
    }
  }
  // Validate every formula in context — catches missing refs, bad types, cycles.
  const lookup = buildFieldLookup(draft.customFields, draft.calculatedFields);
  for (const c of draft.calculatedFields) {
    const r = validateFormula(
      c.tokens,
      c.fieldKey,
      c.outputType,
      lookup,
      draft.calculatedFields,
    );
    if (!r.ok) {
      return { ok: false, error: `${c.label}: ${r.error}` };
    }
  }
  return { ok: true };
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type TemplateListResult =
  | {
      ok: true;
      templates: PaymentEmailTemplateRecord[];
      effectiveDefaultId: string;
    }
  | { ok: false; error: string };

// Surface the underlying error message — Prisma errors describe the schema
// or query shape, not secrets, and a real message is much more actionable
// than a generic "couldn't save". Stack traces are still logged server-side.
function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message.length > 400 ? `${err.message.slice(0, 400)}…` : err.message;
  }
  return fallback;
}

export async function listPaymentEmailTemplatesAction(): Promise<TemplateListResult> {
  try {
    const [templates, effectiveDefaultId] = await Promise.all([
      listTemplates(),
      getEffectiveDefaultTemplateId(),
    ]);
    return { ok: true, templates, effectiveDefaultId };
  } catch (err) {
    console.error("listPaymentEmailTemplatesAction", err);
    return {
      ok: false,
      error: describeError(err, "Couldn't load payment email templates."),
    };
  }
}

export type TemplateMutationResult =
  | { ok: true; template: PaymentEmailTemplateRecord }
  | { ok: false; error: string };

export async function createPaymentEmailTemplateAction(
  raw: unknown,
): Promise<TemplateMutationResult> {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid template." };
  }
  const verdict = validateDraft(parsed.data as TemplateDraftInput);
  if (!verdict.ok) return verdict;
  try {
    const tpl = await createTemplate(parsed.data as SaveTemplateInput);
    return { ok: true, template: tpl };
  } catch (err) {
    console.error("createPaymentEmailTemplateAction", err);
    return {
      ok: false,
      error: describeError(err, "Couldn't save this template. Please try again."),
    };
  }
}

export async function updatePaymentEmailTemplateAction(
  id: string,
  raw: unknown,
): Promise<TemplateMutationResult> {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid template." };
  }
  const verdict = validateDraft(parsed.data as TemplateDraftInput);
  if (!verdict.ok) return verdict;
  try {
    const tpl = await updateTemplate(id, parsed.data as TemplateDraftInput);
    return { ok: true, template: tpl };
  } catch (err) {
    console.error("updatePaymentEmailTemplateAction", err);
    return {
      ok: false,
      error: describeError(err, "Couldn't save the template."),
    };
  }
}

export async function renamePaymentEmailTemplateAction(
  id: string,
  name: unknown,
): Promise<TemplateMutationResult> {
  if (typeof name !== "string" || !name.trim()) {
    return { ok: false, error: "Template name is required." };
  }
  try {
    const tpl = await renameTemplate(id, name);
    return { ok: true, template: tpl };
  } catch (err) {
    if (err instanceof Error) return { ok: false, error: err.message };
    return { ok: false, error: "Couldn't rename the template." };
  }
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function deletePaymentEmailTemplateAction(
  id: string,
): Promise<SimpleResult> {
  try {
    await deleteTemplate(id);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error) return { ok: false, error: err.message };
    return { ok: false, error: "Couldn't archive the template." };
  }
}

export async function setAgencyDefaultPaymentEmailTemplateAction(
  id: string,
): Promise<TemplateMutationResult> {
  try {
    const tpl = await setAgencyDefault(id);
    return { ok: true, template: tpl };
  } catch (err) {
    if (err instanceof Error) return { ok: false, error: err.message };
    return { ok: false, error: "Couldn't set the agency default." };
  }
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export type ImportResult =
  | { ok: true; text: string; filename: string }
  | { ok: false; error: string };

/**
 * Import a pasted or uploaded template body. Returns sanitized plain text.
 * Runs server-side so the mammoth parser, file-size cap, and MIME/extension
 * checks all execute outside the browser. Never executes embedded macros.
 */
export async function importTemplateTextAction(formData: FormData): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Pick a file to import." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const verdict = validateUpload(file.name, file.type || "", buffer.byteLength);
  if (!verdict.ok) return verdict;
  // Belt-and-braces: refuse zero-byte and explicit cap.
  if (buffer.byteLength === 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That file is over 1 MB. Pick a smaller template file." };
  }

  if (verdict.extension === ".txt") {
    const raw = buffer.toString("utf8");
    return { ok: true, text: sanitizeTemplateText(raw), filename: file.name };
  }

  // .docx — extract plain text only. mammoth ignores macros and embedded
  // scripts by design (it only reads the WordprocessingML body).
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return {
      ok: true,
      text: sanitizeTemplateText(result.value),
      filename: file.name,
    };
  } catch (err) {
    console.error("importTemplateTextAction docx", err);
    return {
      ok: false,
      error: "Plato couldn't read that .docx file. Try saving it as plain text and importing again.",
    };
  }
}
