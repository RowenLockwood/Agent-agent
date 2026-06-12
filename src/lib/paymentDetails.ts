import { prisma } from "./db";
import {
  computeNextSendDate,
  isPositiveWholeNumber,
  isRenewalIntervalUnit,
  parseDateOnly,
  type RenewalIntervalUnit,
} from "./royalties";
import {
  AUTHOR_STAGE_FIELDS,
  PAYMENT_STAGE_FIELDS,
  buildAuthorStageCascade,
  buildPaymentStageCascade,
  type AuthorStageField,
  type AuthorStages,
  type PaymentStageField,
  type PaymentStages,
  type StageCascade,
} from "./stages";

export type { RenewalIntervalUnit } from "./royalties";

// JSON-safe shape sent to the client. Dates are ISO strings ("YYYY-MM-DD" form
// is fine — they're rendered date-only).
export type AuthorPaymentDetailsRecord = {
  authorId: string;
  contractSentToEditorStage: string;
  backAndForthWithEditorStage: string;
  contractSignedByAuthorStage: string;
  contractSignedByEditorStage: string;
  contractSignedByAllPartiesStage: string;
  paymentReceivedFromEditorStage: string;
  paymentSentToAuthorStage: string;
  commissionAmount: number | null;
  commissionPercentForAgency: number | null;
  firstRoyaltyStatementDate: string | null;
  renewalIntervalNumber: number | null;
  renewalIntervalUnit: RenewalIntervalUnit | null;
  lastSentToAuthorDate: string | null;
  nextSendToAuthorDate: string | null;
};

type PaymentDetailsRow = {
  authorId: string;
  contractSentToEditorStage: string;
  backAndForthWithEditorStage: string;
  contractSignedByAuthorStage: string;
  contractSignedByEditorStage: string;
  contractSignedByAllPartiesStage: string;
  paymentReceivedFromEditorStage: string;
  paymentSentToAuthorStage: string;
  commissionAmount: number | null;
  commissionPercentForAgency: number | null;
  firstRoyaltyStatementDate: Date | null;
  renewalIntervalNumber: number | null;
  renewalIntervalUnit: string | null;
  lastSentToAuthorDate: Date | null;
  nextSendToAuthorDate: Date | null;
};

const STAGE_DEFAULTS: PaymentStages = {
  contractSentToEditorStage: "not_started",
  backAndForthWithEditorStage: "not_started",
  contractSignedByAuthorStage: "not_started",
  contractSignedByEditorStage: "not_started",
  contractSignedByAllPartiesStage: "not_started",
  paymentReceivedFromEditorStage: "not_started",
  paymentSentToAuthorStage: "not_started",
};

export function defaultPaymentDetailsFor(
  authorId: string,
): AuthorPaymentDetailsRecord {
  return {
    authorId,
    ...STAGE_DEFAULTS,
    commissionAmount: null,
    commissionPercentForAgency: null,
    firstRoyaltyStatementDate: null,
    renewalIntervalNumber: null,
    renewalIntervalUnit: null,
    lastSentToAuthorDate: null,
    nextSendToAuthorDate: null,
  };
}

function toIsoDateOnly(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function serializePaymentDetails(
  row: PaymentDetailsRow,
): AuthorPaymentDetailsRecord {
  const unit = isRenewalIntervalUnit(row.renewalIntervalUnit)
    ? row.renewalIntervalUnit
    : null;
  return {
    authorId: row.authorId,
    contractSentToEditorStage: row.contractSentToEditorStage,
    backAndForthWithEditorStage: row.backAndForthWithEditorStage,
    contractSignedByAuthorStage: row.contractSignedByAuthorStage,
    contractSignedByEditorStage: row.contractSignedByEditorStage,
    contractSignedByAllPartiesStage: row.contractSignedByAllPartiesStage,
    paymentReceivedFromEditorStage: row.paymentReceivedFromEditorStage,
    paymentSentToAuthorStage: row.paymentSentToAuthorStage,
    commissionAmount: row.commissionAmount,
    commissionPercentForAgency: row.commissionPercentForAgency,
    firstRoyaltyStatementDate: toIsoDateOnly(row.firstRoyaltyStatementDate),
    renewalIntervalNumber: row.renewalIntervalNumber,
    renewalIntervalUnit: unit,
    lastSentToAuthorDate: toIsoDateOnly(row.lastSentToAuthorDate),
    nextSendToAuthorDate: toIsoDateOnly(row.nextSendToAuthorDate),
  };
}

export async function getPaymentDetails(
  authorId: string,
): Promise<AuthorPaymentDetailsRecord> {
  const row = await prisma.authorPaymentDetails.findUnique({
    where: { authorId },
  });
  return row ? serializePaymentDetails(row) : defaultPaymentDetailsFor(authorId);
}

function readStages(
  payment: AuthorPaymentDetailsRecord,
): PaymentStages {
  return {
    contractSentToEditorStage: payment.contractSentToEditorStage,
    backAndForthWithEditorStage: payment.backAndForthWithEditorStage,
    contractSignedByAuthorStage: payment.contractSignedByAuthorStage,
    contractSignedByEditorStage: payment.contractSignedByEditorStage,
    contractSignedByAllPartiesStage: payment.contractSignedByAllPartiesStage,
    paymentReceivedFromEditorStage: payment.paymentReceivedFromEditorStage,
    paymentSentToAuthorStage: payment.paymentSentToAuthorStage,
  };
}

async function readCurrentStages(
  authorId: string,
): Promise<{ author: AuthorStages; payment: PaymentStages }> {
  const [authorRow, paymentRow] = await Promise.all([
    prisma.author.findUnique({
      where: { id: authorId },
      select: {
        authorOnboarded: true,
        proposalSentToEditors: true,
        authorMeetings: true,
        bidSent: true,
        dealMemoSent: true,
        dealMemoAccepted: true,
        paymentReceived: true,
        paymentSentToAuthor: true,
      },
    }),
    prisma.authorPaymentDetails.findUnique({ where: { authorId } }),
  ]);
  if (!authorRow) throw new Error("Author not found.");
  return {
    author: authorRow,
    payment: paymentRow ? readStages(serializePaymentDetails(paymentRow)) : STAGE_DEFAULTS,
  };
}

export type StageUpdateResult = {
  paymentDetails: AuthorPaymentDetailsRecord;
  authorStages: AuthorStages;
};

const AUTHOR_STAGE_SELECT = {
  authorOnboarded: true,
  proposalSentToEditors: true,
  authorMeetings: true,
  bidSent: true,
  dealMemoSent: true,
  dealMemoAccepted: true,
  paymentReceived: true,
  paymentSentToAuthor: true,
} as const;

// Apply a cascade by running the payment upsert (if any) and the author
// update (if any) sequentially and using each write's return value as the
// authoritative state. We deliberately don't wrap these in
// `prisma.$transaction([...])` — that array form has been unreliable on the
// Neon HTTP adapter when mixing an upsert with an update across two models,
// which is exactly what the cross-chain cascade does for the linked stages.
// Both writes are idempotent and the cascade is upgrade-only on priors, so
// running them sequentially without a transaction wrapper is safe: if the
// second write fails the worst case is a partial-but-consistent state the
// next click can reconcile.
async function applyCascade(
  authorId: string,
  cascade: StageCascade,
): Promise<StageUpdateResult> {
  let paymentRow: Awaited<
    ReturnType<typeof prisma.authorPaymentDetails.findUnique>
  > | null = null;
  let authorRow: AuthorStages | null = null;

  if (Object.keys(cascade.payment).length > 0) {
    paymentRow = await prisma.authorPaymentDetails.upsert({
      where: { authorId },
      update: cascade.payment,
      create: {
        authorId,
        ...STAGE_DEFAULTS,
        ...cascade.payment,
      },
    });
  }
  if (Object.keys(cascade.author).length > 0) {
    authorRow = await prisma.author.update({
      where: { id: authorId },
      data: cascade.author,
      select: AUTHOR_STAGE_SELECT,
    });
  }

  // Fill in whichever side we didn't write, so the caller gets the full
  // merged state regardless of which half of the cascade had updates.
  if (!authorRow) {
    authorRow = await prisma.author.findUnique({
      where: { id: authorId },
      select: AUTHOR_STAGE_SELECT,
    });
    if (!authorRow) throw new Error("Author not found.");
  }
  if (!paymentRow) {
    paymentRow = await prisma.authorPaymentDetails.findUnique({
      where: { authorId },
    });
  }

  return {
    paymentDetails: paymentRow
      ? serializePaymentDetails(paymentRow)
      : defaultPaymentDetailsFor(authorId),
    authorStages: authorRow,
  };
}

export async function applyPaymentStageUpdate(
  authorId: string,
  field: PaymentStageField,
  value: string,
): Promise<StageUpdateResult> {
  const current = await readCurrentStages(authorId);
  const cascade = buildPaymentStageCascade(
    field,
    value,
    current.payment,
    current.author,
  );
  return applyCascade(authorId, cascade);
}

export async function applyAuthorStageUpdate(
  authorId: string,
  field: AuthorStageField,
  value: string,
): Promise<StageUpdateResult> {
  const current = await readCurrentStages(authorId);
  const cascade = buildAuthorStageCascade(
    field,
    value,
    current.author,
    current.payment,
  );
  return applyCascade(authorId, cascade);
}

// Helps the action layer surface human-readable validation errors.
export class ContractDetailsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractDetailsValidationError";
  }
}

export type ContractDetailsPatch = {
  commissionAmount?: number | null;
  commissionPercentForAgency?: number | null;
  firstRoyaltyStatementDate?: string | null;
  renewalIntervalNumber?: number | null;
  renewalIntervalUnit?: RenewalIntervalUnit | null;
  lastSentToAuthorDate?: string | null;
};

export async function updateContractDetails(
  authorId: string,
  patch: ContractDetailsPatch,
): Promise<AuthorPaymentDetailsRecord> {
  // Validate any provided values. Allow null to clear a field.
  if (patch.commissionAmount != null) {
    if (
      typeof patch.commissionAmount !== "number" ||
      !Number.isFinite(patch.commissionAmount) ||
      patch.commissionAmount < 0
    ) {
      throw new ContractDetailsValidationError(
        "Enter a positive amount for the commission.",
      );
    }
  }
  if (patch.commissionPercentForAgency != null) {
    const p = patch.commissionPercentForAgency;
    if (
      typeof p !== "number" ||
      !Number.isFinite(p) ||
      p < 0 ||
      p > 100
    ) {
      throw new ContractDetailsValidationError(
        "Commission percentage must be between 0 and 100.",
      );
    }
  }
  if (patch.renewalIntervalNumber != null) {
    if (!isPositiveWholeNumber(patch.renewalIntervalNumber)) {
      throw new ContractDetailsValidationError(
        "Enter a positive whole number for the renewal interval.",
      );
    }
  }
  if (patch.renewalIntervalUnit != null) {
    if (!isRenewalIntervalUnit(patch.renewalIntervalUnit)) {
      throw new ContractDetailsValidationError(
        "Renewal interval unit must be Weeks or Months.",
      );
    }
  }
  if (patch.firstRoyaltyStatementDate != null) {
    const d = parseDateOnly(patch.firstRoyaltyStatementDate);
    if (!d) {
      throw new ContractDetailsValidationError(
        "First Royalty Statement Date isn't a valid date.",
      );
    }
  }
  if (patch.lastSentToAuthorDate != null) {
    const d = parseDateOnly(patch.lastSentToAuthorDate);
    if (!d) {
      throw new ContractDetailsValidationError(
        "Last Sent to Author isn't a valid date.",
      );
    }
  }

  // Load current row so the next-send recalculation has all three inputs.
  const existing = await prisma.authorPaymentDetails.findUnique({
    where: { authorId },
  });
  const merged = {
    firstRoyaltyStatementDate:
      "firstRoyaltyStatementDate" in patch
        ? parseDateOnly(patch.firstRoyaltyStatementDate)
        : existing?.firstRoyaltyStatementDate ?? null,
    renewalIntervalNumber:
      "renewalIntervalNumber" in patch
        ? patch.renewalIntervalNumber ?? null
        : existing?.renewalIntervalNumber ?? null,
    renewalIntervalUnit:
      "renewalIntervalUnit" in patch
        ? patch.renewalIntervalUnit ?? null
        : (existing?.renewalIntervalUnit as RenewalIntervalUnit | null) ?? null,
  };
  const nextSendDate = computeNextSendDate(
    merged.firstRoyaltyStatementDate,
    merged.renewalIntervalNumber,
    merged.renewalIntervalUnit,
  );

  const data = {
    ...("commissionAmount" in patch
      ? { commissionAmount: patch.commissionAmount ?? null }
      : {}),
    ...("commissionPercentForAgency" in patch
      ? { commissionPercentForAgency: patch.commissionPercentForAgency ?? null }
      : {}),
    ...("firstRoyaltyStatementDate" in patch
      ? { firstRoyaltyStatementDate: merged.firstRoyaltyStatementDate }
      : {}),
    ...("renewalIntervalNumber" in patch
      ? { renewalIntervalNumber: merged.renewalIntervalNumber }
      : {}),
    ...("renewalIntervalUnit" in patch
      ? { renewalIntervalUnit: merged.renewalIntervalUnit }
      : {}),
    ...("lastSentToAuthorDate" in patch
      ? {
          lastSentToAuthorDate: parseDateOnly(patch.lastSentToAuthorDate),
        }
      : {}),
    nextSendToAuthorDate: nextSendDate,
  };

  const row = await prisma.authorPaymentDetails.upsert({
    where: { authorId },
    update: data,
    create: {
      authorId,
      ...STAGE_DEFAULTS,
      ...data,
    },
  });
  return serializePaymentDetails(row);
}

// Re-exported so callers don't reach into stages.ts when they only need the
// shape of one author's stages.
export { AUTHOR_STAGE_FIELDS, PAYMENT_STAGE_FIELDS };
