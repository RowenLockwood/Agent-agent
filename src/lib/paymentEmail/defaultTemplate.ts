// The Plato Default Payment Email template — a structured form of the
// existing hard-coded body, preserved so users see the same email after
// migration. Seeded lazily into the DB on first read by getOrCreateSystemDefault().

import type {
  BodySegment,
  CalculatedFieldRecord,
  CustomFieldRecord,
  PaymentEmailTemplateRecord,
  SummaryFieldRecord,
} from "./types";

export const SYSTEM_DEFAULT_TEMPLATE_ID = "system_default_payment_email";

const T = (v: string): BodySegment => ({ t: "text", v });
const F = (k: string): BodySegment => ({ t: "field", k });

// Mirrors src/lib/format.ts → buildPaymentEmail for the existing default:
// "Dear {author},\n\nWe received our {rate} commission on the {total} {type}
//  payment for {title} from {publisher}. You should receive payment directly
//  from the publisher for {authorPayment} within the week. Please confirm
//  receipt. If it doesn't arrive within the week, let me know and we will
//  follow up with the publisher.\n\nAll best,\n\n{sender}"
const DEFAULT_BODY: BodySegment[] = [
  T("Dear "),
  F("authorFullName"),
  T(",\n\nWe received our "),
  F("commissionPercentForAgency"),
  T(" commission on the "),
  F("totalPayment"),
  T(" "),
  F("commissionType"),
  T(" payment for "),
  F("bookTitle"),
  T(" from "),
  F("publishingHouse"),
  T(". You should receive payment directly from the publisher for "),
  F("amountToAuthor"),
  T(" within the week. Please confirm receipt. If it doesn't arrive within the week, let me know and we will follow up with the publisher.\n\nAll best,\n\n"),
  F("senderName"),
];

const DEFAULT_CALCULATED: CalculatedFieldRecord[] = [
  {
    fieldKey: "commissionAmount",
    label: "Commission Amount",
    outputType: "currency",
    tokens: [
      { kind: "field", key: "totalPayment" },
      { kind: "op", op: "multiply" },
      { kind: "field", key: "commissionPercentForAgency" },
    ],
  },
  {
    fieldKey: "amountToAuthor",
    label: "Amount to Author",
    outputType: "currency",
    tokens: [
      { kind: "field", key: "totalPayment" },
      { kind: "op", op: "subtract" },
      { kind: "field", key: "commissionAmount" },
    ],
  },
];

const DEFAULT_SUMMARY: SummaryFieldRecord[] = [
  { fieldKey: "totalPayment", summaryLabel: "Total" },
  { fieldKey: "commissionAmount", summaryLabel: "Commission" },
  { fieldKey: "amountToAuthor", summaryLabel: "To Author" },
];

const DEFAULT_CUSTOM: CustomFieldRecord[] = [];

export function buildSystemDefaultRecord(): PaymentEmailTemplateRecord {
  return {
    id: SYSTEM_DEFAULT_TEMPLATE_ID,
    name: "Plato Default Payment Email",
    description: "Plato's standard payment confirmation, ready to send.",
    subjectLine: null,
    body: DEFAULT_BODY,
    isSystemDefault: true,
    isAgencyDefault: false,
    versionNumber: 1,
    parentTemplateId: null,
    customFields: DEFAULT_CUSTOM,
    calculatedFields: DEFAULT_CALCULATED,
    summaryFields: DEFAULT_SUMMARY,
    updatedAt: new Date(0).toISOString(),
  };
}

export {
  DEFAULT_BODY as SYSTEM_DEFAULT_BODY,
  DEFAULT_CALCULATED as SYSTEM_DEFAULT_CALCULATED,
  DEFAULT_SUMMARY as SYSTEM_DEFAULT_SUMMARY,
};
