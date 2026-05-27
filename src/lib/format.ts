const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUSD(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  return USD.format(value);
}

/** Format a commission rate (e.g. 15 → "15%", 12.5 → "12.5%"). */
export function formatRate(rate: number): string {
  const n = Number.isFinite(rate) ? rate : 15;
  return `${parseFloat(n.toFixed(4))}%`;
}

export type EmailFields = {
  authorName: string;
  totalPayment: number;
  commissionRate: number;
  commissionType: string;
  title: string;
  publisher: string;
  senderName: string;
};

export function calculateSplit(totalPayment: number, commissionRate = 15) {
  const total = Number.isFinite(totalPayment) ? Math.max(0, totalPayment) : 0;
  const rate = Number.isFinite(commissionRate) && commissionRate > 0 ? commissionRate : 15;
  const commission = total * (rate / 100);
  const author = total - commission;
  return { total, commission, author };
}

export function buildPaymentEmail(fields: EmailFields): string {
  const {
    authorName,
    totalPayment,
    commissionRate,
    commissionType,
    title,
    publisher,
    senderName,
  } = fields;
  const { author } = calculateSplit(totalPayment, commissionRate);

  const totalLabel = formatUSD(totalPayment);
  const authorLabel = formatUSD(author);
  const rateLabel = formatRate(commissionRate);

  return [
    `Dear ${authorName || "[Author]"},`,
    "",
    `We received our ${rateLabel} commission on the ${totalLabel} ${commissionType} payment for ${title || "[Title]"} from ${publisher || "[Publisher]"}. You should receive payment directly from the publisher for ${authorLabel} within the week. Please confirm receipt. If it doesn't arrive within the week, let me know and we will follow up with the publisher.`,
    "",
    "All best,",
    "",
    senderName || "[Your name]",
  ].join("\n");
}

export type AgreementEmailFields = {
  authorName: string;
  agency: string;
  agentName: string;
};

export function buildAuthorAgreementEmail(fields: AgreementEmailFields): string {
  const { authorName, agency, agentName } = fields;

  return [
    `Dear ${authorName || "[Author]"}:`,
    "",
    `Please find attached ${agency || "[Agency]"}'s agency agreement for your review. Please let us know if you have any questions or concerns. If all is in order, please let us know and we will circulate for automatic signature. Once both parties have signed, you will automatically receive a fully executed agreement for your records.`,
    "",
    "All best,",
    "",
    agentName || "[Your name]",
  ].join("\n");
}

export const COMMISSION_TYPES = [
  "advance",
  "royalty",
  "option",
  "subsidiary rights",
  "foreign rights",
  "film/TV",
  "other",
] as const;

export type CommissionType = (typeof COMMISSION_TYPES)[number];
