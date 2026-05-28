// ─── Author-level stage ───────────────────────────────────────────────────────

export type AuthorStageStatus = "not_started" | "in_progress" | "completed";

export const AUTHOR_STAGE_STATUSES: AuthorStageStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

export const AUTHOR_STAGE_STATUS_LABELS: Record<AuthorStageStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export type AuthorStageField =
  | "authorOnboarded"
  | "proposalSentToEditors"
  | "authorMeetings"
  | "bidSent"
  | "dealMemoSent"
  | "dealMemoAccepted"
  | "paymentReceived"
  | "paymentSentToAuthor";

export const AUTHOR_STAGE_FIELDS: AuthorStageField[] = [
  "authorOnboarded",
  "proposalSentToEditors",
  "authorMeetings",
  "bidSent",
  "dealMemoSent",
  "dealMemoAccepted",
  "paymentReceived",
  "paymentSentToAuthor",
];

export const AUTHOR_STAGE_FIELD_LABELS: Record<AuthorStageField, string> = {
  authorOnboarded: "Author Onboarded",
  proposalSentToEditors: "Book Proposal Sent to Editors",
  authorMeetings: "1-1 Author Meetings",
  bidSent: "Bid Sent",
  dealMemoSent: "Deal Memo Sent",
  dealMemoAccepted: "Deal Memo Accepted",
  paymentReceived: "Payment Received",
  paymentSentToAuthor: "Payment Sent to Author",
};

export type AuthorStages = Record<AuthorStageField, string>;

/** CSS colour string for an author-level diamond. */
export function authorStageColor(status: AuthorStageStatus): string {
  if (status === "completed") return "#1a5c3a"; // deep green
  if (status === "in_progress") return "#9a6e0f"; // warm amber
  return "#6b1a25"; // wine red
}

export function authorStageGlow(status: AuthorStageStatus): string {
  if (status === "completed") return "0 0 8px 2px rgba(26,92,58,0.55)";
  if (status === "in_progress") return "0 0 8px 2px rgba(154,110,15,0.55)";
  return "0 0 8px 2px rgba(107,26,37,0.55)";
}

/** Muted gray for a locked author stage; otherwise the status colour. */
export function authorStageCssColor(
  status: AuthorStageStatus,
  locked: boolean,
): string {
  if (locked) return "#b0a898";
  return authorStageColor(status);
}

// ─── Author stage unlock logic ────────────────────────────────────────────────

// Each stage unlocks once its immediate predecessor is Completed. Checking the
// predecessor's locked state (not just its value) makes locking cascade: moving
// an earlier stage back from Completed re-locks every stage that follows it.
export function authorStageLocked(
  field: AuthorStageField,
  stages: AuthorStages,
): boolean {
  switch (field) {
    case "authorOnboarded":
      return false;
    case "proposalSentToEditors":
      return (
        authorStageLocked("authorOnboarded", stages) ||
        stages.authorOnboarded !== "completed"
      );
    case "authorMeetings":
      return (
        authorStageLocked("proposalSentToEditors", stages) ||
        stages.proposalSentToEditors !== "completed"
      );
    case "bidSent":
      return (
        authorStageLocked("authorMeetings", stages) ||
        stages.authorMeetings !== "completed"
      );
    case "dealMemoSent":
      return (
        authorStageLocked("bidSent", stages) || stages.bidSent !== "completed"
      );
    case "dealMemoAccepted":
      return (
        authorStageLocked("dealMemoSent", stages) ||
        stages.dealMemoSent !== "completed"
      );
    case "paymentReceived":
      return (
        authorStageLocked("dealMemoAccepted", stages) ||
        stages.dealMemoAccepted !== "completed"
      );
    case "paymentSentToAuthor":
      return (
        authorStageLocked("paymentReceived", stages) ||
        stages.paymentReceived !== "completed"
      );
  }
}

export function authorStageLockReason(field: AuthorStageField): string {
  switch (field) {
    case "proposalSentToEditors":
      return "Unlocks when Author Onboarded is Completed";
    case "authorMeetings":
      return "Unlocks when Book Proposal Sent to Editors is Completed";
    case "bidSent":
      return "Unlocks when 1-1 Author Meetings is Completed";
    case "dealMemoSent":
      return "Unlocks when Bid Sent is Completed";
    case "dealMemoAccepted":
      return "Unlocks when Deal Memo Sent is Completed";
    case "paymentReceived":
      return "Unlocks when Deal Memo Accepted is Completed";
    case "paymentSentToAuthor":
      return "Unlocks when Payment Received is Completed";
    default:
      return "";
  }
}

// ─── Editor-level stages ──────────────────────────────────────────────────────

export type ProposalStageValue =
  | "not_sent"
  | "sent"
  | "follow_up_sent"
  | "accepted"
  | "rejected";

export type AuthorMeetingStageValue =
  | "not_sent"
  | "one_to_one_requested"
  | "one_to_one_scheduled"
  | "one_to_one_complete";

export type BidStageValue = "not_sent" | "terms_sent" | "bid_received";

export type DealMemoStageValue = "not_sent" | "sent" | "accepted" | "rejected";

export type PaymentReceivedStageValue = "not_received" | "received";

export type PaymentSentToAuthorStageValue = "not_sent" | "sent";

export type EditorStageField =
  | "proposalStage"
  | "authorMeetingStage"
  | "bidStage"
  | "dealMemoStage"
  | "paymentReceivedStage"
  | "paymentSentToAuthorStage";

export const EDITOR_STAGE_FIELDS: EditorStageField[] = [
  "proposalStage",
  "authorMeetingStage",
  "bidStage",
  "dealMemoStage",
  "paymentReceivedStage",
  "paymentSentToAuthorStage",
];

export const EDITOR_STAGE_FIELD_LABELS: Record<EditorStageField, string> = {
  proposalStage: "Book Proposal",
  authorMeetingStage: "Author Meeting",
  bidStage: "Bid",
  dealMemoStage: "Deal Memo",
  paymentReceivedStage: "Payment Received",
  paymentSentToAuthorStage: "Payment Sent to Author",
};

type StageOption = { value: string; label: string };

export const EDITOR_STAGE_OPTIONS: Record<EditorStageField, StageOption[]> = {
  proposalStage: [
    { value: "not_sent", label: "Not Sent" },
    { value: "sent", label: "Sent" },
    { value: "follow_up_sent", label: "Follow-Up Sent" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
  ],
  authorMeetingStage: [
    { value: "not_sent", label: "Not Sent" },
    { value: "one_to_one_requested", label: "1-1 Requested" },
    { value: "one_to_one_scheduled", label: "1-1 Scheduled" },
    { value: "one_to_one_complete", label: "1-1 Complete" },
  ],
  bidStage: [
    { value: "not_sent", label: "Not Sent" },
    { value: "terms_sent", label: "Terms Sent" },
    { value: "bid_received", label: "Bid Received" },
  ],
  dealMemoStage: [
    { value: "not_sent", label: "Not Sent" },
    { value: "sent", label: "Sent" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
  ],
  paymentReceivedStage: [
    { value: "not_received", label: "Not Received" },
    { value: "received", label: "Received" },
  ],
  paymentSentToAuthorStage: [
    { value: "not_sent", label: "Not Sent" },
    { value: "sent", label: "Sent" },
  ],
};

export function editorStageValueLabel(
  field: EditorStageField,
  value: string,
): string {
  return (
    EDITOR_STAGE_OPTIONS[field].find((o) => o.value === value)?.label ?? value
  );
}

// ─── Editor stage color logic ─────────────────────────────────────────────────

type EditorStageColor = "blue" | "amber" | "green" | "red" | "gray";

const PROPOSAL_COLORS: Record<ProposalStageValue, EditorStageColor> = {
  not_sent: "blue",
  sent: "amber",
  follow_up_sent: "amber",
  accepted: "green",
  rejected: "red",
};
const MEETING_COLORS: Record<AuthorMeetingStageValue, EditorStageColor> = {
  not_sent: "blue",
  one_to_one_requested: "amber",
  one_to_one_scheduled: "amber",
  one_to_one_complete: "green",
};
const BID_COLORS: Record<BidStageValue, EditorStageColor> = {
  not_sent: "blue",
  terms_sent: "amber",
  bid_received: "green",
};
const DEAL_MEMO_COLORS: Record<DealMemoStageValue, EditorStageColor> = {
  not_sent: "blue",
  sent: "amber",
  accepted: "green",
  rejected: "red",
};
const PAYMENT_RECEIVED_COLORS: Record<PaymentReceivedStageValue, EditorStageColor> = {
  not_received: "blue",
  received: "green",
};
const PAYMENT_SENT_COLORS: Record<PaymentSentToAuthorStageValue, EditorStageColor> = {
  not_sent: "blue",
  sent: "green",
};

export function editorStageColorKey(
  field: EditorStageField,
  value: string,
  locked: boolean,
): EditorStageColor {
  if (locked) return "gray";
  switch (field) {
    case "proposalStage":
      return PROPOSAL_COLORS[value as ProposalStageValue] ?? "blue";
    case "authorMeetingStage":
      return MEETING_COLORS[value as AuthorMeetingStageValue] ?? "blue";
    case "bidStage":
      return BID_COLORS[value as BidStageValue] ?? "blue";
    case "dealMemoStage":
      return DEAL_MEMO_COLORS[value as DealMemoStageValue] ?? "blue";
    case "paymentReceivedStage":
      return PAYMENT_RECEIVED_COLORS[value as PaymentReceivedStageValue] ?? "blue";
    case "paymentSentToAuthorStage":
      return PAYMENT_SENT_COLORS[value as PaymentSentToAuthorStageValue] ?? "blue";
  }
}

const COLOR_CSS: Record<EditorStageColor, string> = {
  blue: "#1e5f8a",
  amber: "#9a6e0f",
  green: "#1a5c3a",
  red: "#6b1a25",
  gray: "#b0a898",
};

export function editorStageCssColor(
  field: EditorStageField,
  value: string,
  locked: boolean,
): string {
  return COLOR_CSS[editorStageColorKey(field, value, locked)];
}

export function editorStageGlow(color: EditorStageColor): string {
  if (color === "gray") return "none";
  const map: Record<EditorStageColor, string> = {
    blue: "0 0 7px 1px rgba(30,95,138,0.55)",
    amber: "0 0 7px 1px rgba(154,110,15,0.55)",
    green: "0 0 7px 1px rgba(26,92,58,0.55)",
    red: "0 0 7px 1px rgba(107,26,37,0.55)",
    gray: "none",
  };
  return map[color];
}

// ─── Editor stage unlock logic ────────────────────────────────────────────────

export type EditorStages = {
  proposalStage: string;
  authorMeetingStage: string;
  bidStage: string;
  dealMemoStage: string;
  paymentReceivedStage: string;
  paymentSentToAuthorStage: string;
};

// A stage is locked when its immediate predecessor is itself locked OR the
// predecessor has not reached its unlock value. Checking the predecessor's
// locked state (not just its value) makes locking cascade: relocking an
// earlier stage automatically relocks every stage that depends on it.
export function editorStageLocked(
  field: EditorStageField,
  stages: EditorStages,
): boolean {
  switch (field) {
    case "proposalStage":
      return false;
    case "authorMeetingStage":
      return (
        editorStageLocked("proposalStage", stages) ||
        stages.proposalStage !== "accepted"
      );
    case "bidStage":
      return (
        editorStageLocked("authorMeetingStage", stages) ||
        stages.authorMeetingStage !== "one_to_one_complete"
      );
    case "dealMemoStage":
      return (
        editorStageLocked("bidStage", stages) ||
        stages.bidStage !== "bid_received"
      );
    case "paymentReceivedStage":
      return (
        editorStageLocked("dealMemoStage", stages) ||
        stages.dealMemoStage !== "accepted"
      );
    case "paymentSentToAuthorStage":
      return (
        editorStageLocked("paymentReceivedStage", stages) ||
        stages.paymentReceivedStage !== "received"
      );
  }
}

export function editorStageLockReason(field: EditorStageField): string {
  switch (field) {
    case "authorMeetingStage":
      return "Unlocks when Book Proposal is Accepted";
    case "bidStage":
      return "Unlocks when Author Meeting is 1-1 Complete";
    case "dealMemoStage":
      return "Unlocks when Bid is Received";
    case "paymentReceivedStage":
      return "Unlocks when Deal Memo is Accepted";
    case "paymentSentToAuthorStage":
      return "Unlocks when Payment is Received";
    default:
      return "";
  }
}

// ─── Payment Details stages ───────────────────────────────────────────────────
//
// Per-author contract progression. Values share the author-stage vocabulary
// ("not_started" | "in_progress" | "completed"), so the same status labels,
// colour mapping, and lock-cascade philosophy apply.

export type PaymentStageField =
  | "contractSentToEditorStage"
  | "backAndForthWithEditorStage"
  | "contractSignedByAuthorStage"
  | "contractSignedByEditorStage"
  | "contractSignedByAllPartiesStage"
  | "paymentReceivedFromEditorStage"
  | "paymentSentToAuthorStage";

export const PAYMENT_STAGE_FIELDS: PaymentStageField[] = [
  "contractSentToEditorStage",
  "backAndForthWithEditorStage",
  "contractSignedByAuthorStage",
  "contractSignedByEditorStage",
  "contractSignedByAllPartiesStage",
  "paymentReceivedFromEditorStage",
  "paymentSentToAuthorStage",
];

export const PAYMENT_STAGE_FIELD_LABELS: Record<PaymentStageField, string> = {
  contractSentToEditorStage: "Contract Sent to Editor",
  backAndForthWithEditorStage: "Back-and-Forth with Editor",
  contractSignedByAuthorStage: "Contract Signed by Author",
  contractSignedByEditorStage: "Contract Signed by Editor",
  contractSignedByAllPartiesStage: "Contract Signed by All Parties",
  paymentReceivedFromEditorStage: "Payment Received from Editor",
  paymentSentToAuthorStage: "Payment Sent to Author",
};

export type PaymentStages = Record<PaymentStageField, string>;

export function paymentStageLocked(
  field: PaymentStageField,
  stages: PaymentStages,
): boolean {
  const idx = PAYMENT_STAGE_FIELDS.indexOf(field);
  if (idx <= 0) return false;
  const prev = PAYMENT_STAGE_FIELDS[idx - 1];
  return paymentStageLocked(prev, stages) || stages[prev] !== "completed";
}

export function paymentStageLockReason(field: PaymentStageField): string {
  const idx = PAYMENT_STAGE_FIELDS.indexOf(field);
  if (idx <= 0) return "";
  const prev = PAYMENT_STAGE_FIELDS[idx - 1];
  return `Unlocks when ${PAYMENT_STAGE_FIELD_LABELS[prev]} is Completed`;
}

// Payment stages reuse the author-stage palette (red/amber/green/gray).
export function paymentStageCssColor(
  status: AuthorStageStatus,
  locked: boolean,
): string {
  return authorStageCssColor(status, locked);
}

// ─── Cross-chain completion cascade ───────────────────────────────────────────
//
// Two stages from each chain are "linked":
//   author.paymentReceived       ↔ payment.paymentReceivedFromEditorStage
//   author.paymentSentToAuthor   ↔ payment.paymentSentToAuthorStage
//
// When any linked stage is set to Completed, the chains' prefixes on BOTH
// sides become Completed. The helpers below compute the full closure for a
// single source change without scattering rules through the UI. Updates are
// upgrade-only: stages already at "completed" are not touched, and non-
// completed source values never propagate.

export type StageCascade = {
  author: Partial<Record<AuthorStageField, string>>;
  payment: Partial<Record<PaymentStageField, string>>;
};

function completePaymentPrefix(
  upToInclusive: PaymentStageField,
  current: PaymentStages,
  out: Partial<Record<PaymentStageField, string>>,
): void {
  const end = PAYMENT_STAGE_FIELDS.indexOf(upToInclusive);
  for (let i = 0; i <= end; i++) {
    const f = PAYMENT_STAGE_FIELDS[i];
    if (current[f] !== "completed" && out[f] !== "completed") {
      out[f] = "completed";
    }
  }
}

function completeAuthorPrefix(
  upToInclusive: AuthorStageField,
  current: AuthorStages,
  out: Partial<Record<AuthorStageField, string>>,
): void {
  const end = AUTHOR_STAGE_FIELDS.indexOf(upToInclusive);
  for (let i = 0; i <= end; i++) {
    const f = AUTHOR_STAGE_FIELDS[i];
    if (current[f] !== "completed" && out[f] !== "completed") {
      out[f] = "completed";
    }
  }
}

/**
 * Closure of updates triggered by setting a payment stage. Always sets the
 * source value; when that value is "completed", cascades the payment prefix
 * (and, for linked stages, the matching author-stage prefix).
 */
export function buildPaymentStageCascade(
  source: PaymentStageField,
  targetValue: string,
  currentPayment: PaymentStages,
  currentAuthor: AuthorStages,
): StageCascade {
  const payment: Partial<Record<PaymentStageField, string>> = {
    [source]: targetValue,
  };
  const author: Partial<Record<AuthorStageField, string>> = {};

  if (targetValue === "completed") {
    completePaymentPrefix(source, currentPayment, payment);
    if (source === "paymentReceivedFromEditorStage") {
      completeAuthorPrefix("paymentReceived", currentAuthor, author);
    } else if (source === "paymentSentToAuthorStage") {
      completeAuthorPrefix("paymentSentToAuthor", currentAuthor, author);
    }
  }
  return { author, payment };
}

/**
 * Closure of updates triggered by setting an author stage. Always sets the
 * source value; when that value is "completed", and the source is one of the
 * two linked payment stages, cascades the matching payment-stage prefix (and
 * the author-stage prefix up to the source, since the spec says "all prior
 * author stages required to reach Payment Sent to Author should become
 * Completed").
 */
export function buildAuthorStageCascade(
  source: AuthorStageField,
  targetValue: string,
  currentAuthor: AuthorStages,
  currentPayment: PaymentStages,
): StageCascade {
  const author: Partial<Record<AuthorStageField, string>> = {
    [source]: targetValue,
  };
  const payment: Partial<Record<PaymentStageField, string>> = {};

  if (targetValue === "completed") {
    if (source === "paymentReceived" || source === "paymentSentToAuthor") {
      completeAuthorPrefix(source, currentAuthor, author);
    }
    if (source === "paymentReceived") {
      completePaymentPrefix(
        "paymentReceivedFromEditorStage",
        currentPayment,
        payment,
      );
    } else if (source === "paymentSentToAuthor") {
      completePaymentPrefix(
        "paymentSentToAuthorStage",
        currentPayment,
        payment,
      );
    }
  }
  return { author, payment };
}
