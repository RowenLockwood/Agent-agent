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
  | "proposalSentToEditors"
  | "authorMeetings"
  | "bidSent"
  | "dealMemoSent"
  | "dealMemoAccepted"
  | "paymentReceived"
  | "paymentSentToAuthor";

export const AUTHOR_STAGE_FIELDS: AuthorStageField[] = [
  "proposalSentToEditors",
  "authorMeetings",
  "bidSent",
  "dealMemoSent",
  "dealMemoAccepted",
  "paymentReceived",
  "paymentSentToAuthor",
];

export const AUTHOR_STAGE_FIELD_LABELS: Record<AuthorStageField, string> = {
  proposalSentToEditors: "Book Proposal Sent",
  authorMeetings: "Author Meetings",
  bidSent: "Bid Sent",
  dealMemoSent: "Deal Memo Sent",
  dealMemoAccepted: "Deal Memo Accepted",
  paymentReceived: "Payment Received",
  paymentSentToAuthor: "Payment Sent to Author",
};

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

export function editorStageLocked(
  field: EditorStageField,
  stages: EditorStages,
): boolean {
  switch (field) {
    case "proposalStage":
      return false;
    case "authorMeetingStage":
      return stages.proposalStage !== "accepted";
    case "bidStage":
      return stages.authorMeetingStage !== "one_to_one_complete";
    case "dealMemoStage":
      return stages.bidStage !== "bid_received";
    case "paymentReceivedStage":
      return stages.dealMemoStage !== "accepted";
    case "paymentSentToAuthorStage":
      return stages.paymentReceivedStage !== "received";
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
