// Shared types for the Payment Email template layer. Everything here is
// JSON-safe and isomorphic (client + server). Internal keys and enum values
// below are developer-facing only — the UI always renders human-readable
// labels from the registry / template records, never these raw strings.

/** Where a field's value comes from. */
export type FieldCategory =
  | "crm"
  | "standard_input"
  | "custom_input"
  | "calculated";

/** The value shape a field carries (drives inputs, formatting, formulas). */
export type FieldValueType =
  | "text"
  | "long_text"
  | "dropdown"
  | "number"
  | "currency"
  | "percentage"
  | "date";

/** Agency-creatable custom input field types (v1). */
export type CustomFieldType =
  | "short_text"
  | "long_text"
  | "dropdown"
  | "number"
  | "currency"
  | "percentage";

export const CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  "short_text",
  "long_text",
  "dropdown",
  "number",
  "currency",
  "percentage",
];

/** Human-readable labels for custom field types (the only form shown in UI). */
export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  dropdown: "Dropdown",
  number: "Number",
  currency: "Currency",
  percentage: "Percentage",
};

export function customFieldValueType(t: CustomFieldType): FieldValueType {
  if (t === "short_text") return "text";
  return t;
}

/** Calculated-field output types (v1). */
export type CalcOutputType = "number" | "currency" | "percentage";

export const CALC_OUTPUT_TYPES: CalcOutputType[] = [
  "number",
  "currency",
  "percentage",
];

export const CALC_OUTPUT_TYPE_LABELS: Record<CalcOutputType, string> = {
  number: "Number",
  currency: "Currency",
  percentage: "Percentage",
};

// ─── Template body ────────────────────────────────────────────────────────────

/**
 * Tokenized body segment. Stored as a JSON array so inserted fields survive
 * label changes and render through one safe plain-text path (no raw `{{…}}`
 * replacement, no HTML).
 */
export type BodySegment =
  | { t: "text"; v: string }
  | { t: "field"; k: string };

// ─── Formulas ─────────────────────────────────────────────────────────────────

export type FormulaOp =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "percent_of";

export const FORMULA_OPS: FormulaOp[] = [
  "add",
  "subtract",
  "multiply",
  "divide",
  "percent_of",
];

/** Display glyphs for operators — what the formula canvas renders. */
export const FORMULA_OP_GLYPHS: Record<FormulaOp, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
  percent_of: "% of",
};

/**
 * Linear formula representation used by the builder UI and the wire format.
 * Parsed into an ExpressionNode tree (with precedence) for validation,
 * storage, and evaluation.
 */
export type FormulaToken =
  | { kind: "field"; key: string }
  | { kind: "op"; op: FormulaOp }
  | { kind: "lparen" }
  | { kind: "rparen" };

/**
 * Safe structured expression tree — the persisted form. Field references and
 * arithmetic nodes only; never code, never strings to evaluate.
 */
export type ExpressionNode =
  | { type: "field"; key: string }
  | { type: "binary"; op: FormulaOp; left: ExpressionNode; right: ExpressionNode };

// ─── Template records (JSON-safe, sent to the client) ────────────────────────

export type CustomFieldRecord = {
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  placeholder: string | null;
  defaultValue: string | null;
  /** Empty unless fieldType === "dropdown". */
  dropdownOptions: string[];
};

export type CalculatedFieldRecord = {
  fieldKey: string;
  label: string;
  outputType: CalcOutputType;
  /** Builder/wire representation; the DB stores the parsed expression tree. */
  tokens: FormulaToken[];
};

export type SummaryFieldRecord = {
  fieldKey: string;
  summaryLabel: string;
};

export type PaymentEmailTemplateRecord = {
  id: string;
  name: string;
  description: string;
  subjectLine: string | null;
  body: BodySegment[];
  isSystemDefault: boolean;
  isAgencyDefault: boolean;
  versionNumber: number;
  parentTemplateId: string | null;
  customFields: CustomFieldRecord[];
  calculatedFields: CalculatedFieldRecord[];
  /** Ordered — the single source of truth for the summary row. */
  summaryFields: SummaryFieldRecord[];
  updatedAt: string;
};

/** Wire payload when saving a template from the builder. */
export type TemplateDraftInput = {
  name: string;
  description: string;
  subjectLine: string | null;
  body: BodySegment[];
  customFields: CustomFieldRecord[];
  calculatedFields: CalculatedFieldRecord[];
  summaryFields: SummaryFieldRecord[];
};
