// Canonical built-in field registry for Payment Email templates. Every CRM,
// standard-input, and pre-made calculated field has ONE entry here. Fields may
// surface in multiple palette categories or UI sections, but they always
// resolve through this one definition — so Commission Amount, Book Title, etc.
// can never drift across palette groupings.
//
// User-facing UI must always read `label` from a registry / template record,
// never the internal `key` or enum values.

import type {
  CalcOutputType,
  ExpressionNode,
  FieldCategory,
  FieldValueType,
  FormulaToken,
} from "./types";

/** Resolved value for one field at email-rendering time. */
export type FieldValue =
  | { kind: "text"; value: string }
  | { kind: "long_text"; value: string }
  | { kind: "dropdown"; value: string }
  | { kind: "number"; value: number | null }
  | { kind: "currency"; value: number | null }
  | { kind: "percentage"; value: number | null }
  | { kind: "date"; value: string | null }; // ISO YYYY-MM-DD

/** Where a CRM field reads from in the existing data model. */
export type CrmSource =
  | "author"
  | "editor"
  | "agency"
  | "payment_details";

export type BuiltInField = {
  key: string;
  label: string;
  /** Searchable palette group. */
  paletteGroup:
    | "author_book"
    | "editor_publisher"
    | "agency"
    | "payment_input"
    | "payment_details"
    | "calculated";
  category: FieldCategory;
  valueType: FieldValueType;
  crmSource?: CrmSource;
  /** Optional placeholder for standard inputs. */
  placeholder?: string;
  /** Optional dropdown choices for standard inputs. */
  options?: readonly string[];
  /** Default value applied at composition time, when nothing else resolves. */
  defaultValue?: string;
  /** For built-in calculated fields, the seeded formula. */
  defaultFormula?: FormulaToken[];
  /** For built-in calculated fields, the output type. */
  outputType?: CalcOutputType;
  /** Hint shown in the field picker / composition form. */
  hint?: string;
};

// ─── Built-in calculated formulas (seed for Plato Default) ──────────────────

const COMMISSION_AMOUNT_FORMULA: FormulaToken[] = [
  { kind: "field", key: "totalPayment" },
  { kind: "op", op: "multiply" },
  { kind: "field", key: "commissionPercentForAgency" },
];

const AMOUNT_TO_AUTHOR_FORMULA: FormulaToken[] = [
  { kind: "field", key: "totalPayment" },
  { kind: "op", op: "subtract" },
  { kind: "field", key: "commissionAmount" },
];

// ─── Registry ────────────────────────────────────────────────────────────────

// Standard commission-type vocabulary, kept aligned with the existing
// hard-coded payment email so seeded defaults still produce the same output.
const COMMISSION_TYPE_OPTIONS = [
  "advance",
  "royalty",
  "option",
  "subsidiary rights",
  "foreign rights",
  "film/TV",
  "other",
] as const;

export const BUILT_IN_FIELDS: readonly BuiltInField[] = [
  // Author & book
  { key: "authorFirstName", label: "Author First Name", paletteGroup: "author_book", category: "crm", valueType: "text", crmSource: "author" },
  { key: "authorLastName", label: "Author Last Name", paletteGroup: "author_book", category: "crm", valueType: "text", crmSource: "author" },
  { key: "authorFullName", label: "Author Full Name", paletteGroup: "author_book", category: "crm", valueType: "text", crmSource: "author" },
  { key: "authorEmail", label: "Author Email", paletteGroup: "author_book", category: "crm", valueType: "text", crmSource: "author" },
  { key: "bookTitle", label: "Book Title", paletteGroup: "author_book", category: "crm", valueType: "text", crmSource: "author" },
  { key: "genre", label: "Genre", paletteGroup: "author_book", category: "crm", valueType: "text", crmSource: "author" },
  { key: "headAgent", label: "Head Agent", paletteGroup: "author_book", category: "crm", valueType: "text", crmSource: "author" },
  { key: "headAgentEmail", label: "Head Agent Email", paletteGroup: "author_book", category: "crm", valueType: "text", crmSource: "author" },
  { key: "assignedAssistant", label: "Assigned Assistant", paletteGroup: "author_book", category: "crm", valueType: "text", crmSource: "author" },

  // Editor & publisher
  { key: "editorFirstName", label: "Editor First Name", paletteGroup: "editor_publisher", category: "crm", valueType: "text", crmSource: "editor" },
  { key: "editorLastName", label: "Editor Last Name", paletteGroup: "editor_publisher", category: "crm", valueType: "text", crmSource: "editor" },
  { key: "editorFullName", label: "Editor Full Name", paletteGroup: "editor_publisher", category: "crm", valueType: "text", crmSource: "editor" },
  { key: "editorEmail", label: "Editor Email", paletteGroup: "editor_publisher", category: "crm", valueType: "text", crmSource: "editor" },
  { key: "publishingHouse", label: "Publishing House", paletteGroup: "editor_publisher", category: "crm", valueType: "text", crmSource: "editor" },

  // Agency
  { key: "agencyName", label: "Agency Name", paletteGroup: "agency", category: "crm", valueType: "text", crmSource: "agency" },
  // Sender Name defaults from the selected author's head agent — see
  // sender-name handling in resolveFieldValues. Treated as a standard input so
  // the user can override before sending.
  { key: "senderName", label: "Sender Name", paletteGroup: "agency", category: "standard_input", valueType: "text" },
  { key: "senderEmail", label: "Sender Email", paletteGroup: "agency", category: "standard_input", valueType: "text" },

  // Payment inputs (entered while composing)
  { key: "totalPayment", label: "Total Payment", paletteGroup: "payment_input", category: "standard_input", valueType: "currency", placeholder: "10000" },
  {
    key: "commissionType",
    label: "Commission Type",
    paletteGroup: "payment_input",
    category: "standard_input",
    valueType: "dropdown",
    options: COMMISSION_TYPE_OPTIONS,
    defaultValue: "advance",
  },
  { key: "paymentDescription", label: "Payment Description", paletteGroup: "payment_input", category: "standard_input", valueType: "text" },
  { key: "paymentNote", label: "Payment Note", paletteGroup: "payment_input", category: "standard_input", valueType: "long_text" },
  { key: "paymentReceivedDate", label: "Payment Received Date", paletteGroup: "payment_input", category: "standard_input", valueType: "date" },
  { key: "expectedPaymentTiming", label: "Expected Payment Timing", paletteGroup: "payment_input", category: "standard_input", valueType: "text", placeholder: "within the week" },

  // Payment Details (CRM-bound where saved; falls back to a standard input)
  {
    key: "commissionPercentForAgency",
    label: "Commission % for Agency",
    paletteGroup: "payment_details",
    category: "crm",
    valueType: "percentage",
    crmSource: "payment_details",
    defaultValue: "15",
    hint: "Auto-fills from Payment Details — editable here.",
  },
  { key: "firstRoyaltyStatementDate", label: "First Royalty Statement Date", paletteGroup: "payment_details", category: "crm", valueType: "date", crmSource: "payment_details" },
  { key: "renewalCadence", label: "Renewal Cadence", paletteGroup: "payment_details", category: "crm", valueType: "text", crmSource: "payment_details" },
  { key: "lastSentToAuthor", label: "Last Sent to Author", paletteGroup: "payment_details", category: "crm", valueType: "date", crmSource: "payment_details" },
  { key: "nextSendToAuthor", label: "Next Send to Author", paletteGroup: "payment_details", category: "crm", valueType: "date", crmSource: "payment_details" },

  // Pre-made calculated fields — canonical definitions used across the
  // palette, default template, composition form, and summary row.
  {
    key: "commissionAmount",
    label: "Commission Amount",
    paletteGroup: "calculated",
    category: "calculated",
    valueType: "currency",
    outputType: "currency",
    defaultFormula: COMMISSION_AMOUNT_FORMULA,
    hint: "Total Payment × Commission % for Agency",
  },
  {
    key: "amountToAuthor",
    label: "Amount to Author",
    paletteGroup: "calculated",
    category: "calculated",
    valueType: "currency",
    outputType: "currency",
    defaultFormula: AMOUNT_TO_AUTHOR_FORMULA,
    hint: "Total Payment − Commission Amount",
  },
] as const;

const REGISTRY = new Map<string, BuiltInField>(
  BUILT_IN_FIELDS.map((f) => [f.key, f]),
);

export function getBuiltInField(key: string): BuiltInField | undefined {
  return REGISTRY.get(key);
}

export function isBuiltInFieldKey(key: string): boolean {
  return REGISTRY.has(key);
}

/** Pre-built calculated recipes shown in the builder's Calculations section. */
export type CalculationRecipe = {
  fieldKey: string;
  label: string;
  outputType: CalcOutputType;
  tokens: FormulaToken[];
  /** Field keys (built-in or custom) that need to exist before this applies. */
  requires: string[];
  description: string;
};

export const CALCULATION_RECIPES: CalculationRecipe[] = [
  {
    fieldKey: "commissionAmount",
    label: "Commission Amount",
    outputType: "currency",
    tokens: COMMISSION_AMOUNT_FORMULA,
    requires: ["totalPayment", "commissionPercentForAgency"],
    description: "Total Payment × Commission % for Agency",
  },
  {
    fieldKey: "amountToAuthor",
    label: "Amount to Author",
    outputType: "currency",
    tokens: AMOUNT_TO_AUTHOR_FORMULA,
    requires: ["totalPayment", "commissionAmount"],
    description: "Total Payment − Commission Amount",
  },
  {
    fieldKey: "amountToAuthorAfterWithholding",
    label: "Amount to Author After Withholding",
    outputType: "currency",
    tokens: [
      { kind: "field", key: "totalPayment" },
      { kind: "op", op: "subtract" },
      { kind: "field", key: "commissionAmount" },
      { kind: "op", op: "subtract" },
      { kind: "field", key: "withholding" },
    ],
    requires: ["totalPayment", "commissionAmount", "withholding"],
    description: "Total Payment − Commission Amount − Withholding",
  },
  {
    fieldKey: "coAgentFee",
    label: "Co-Agent Fee",
    outputType: "currency",
    tokens: [
      { kind: "field", key: "commissionAmount" },
      { kind: "op", op: "multiply" },
      { kind: "field", key: "coAgentFeePercent" },
    ],
    requires: ["commissionAmount", "coAgentFeePercent"],
    description: "Commission Amount × Co-Agent Fee %",
  },
  {
    fieldKey: "netAgencyCommission",
    label: "Net Agency Commission",
    outputType: "currency",
    tokens: [
      { kind: "field", key: "commissionAmount" },
      { kind: "op", op: "subtract" },
      { kind: "field", key: "coAgentFee" },
    ],
    requires: ["commissionAmount", "coAgentFee"],
    description: "Commission Amount − Co-Agent Fee",
  },
];

/** Re-export so callers don't have to remember to import twice. */
export type { ExpressionNode };
