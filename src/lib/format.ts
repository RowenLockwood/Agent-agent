export const COMMISSION_RATE = 0.15;

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

export type EmailFields = {
  authorName: string;
  totalPayment: number;
  commissionType: string;
  title: string;
  publisher: string;
  senderName: string;
};

export function calculateSplit(totalPayment: number) {
  const total = Number.isFinite(totalPayment) ? Math.max(0, totalPayment) : 0;
  const commission = total * COMMISSION_RATE;
  const author = total - commission;
  return { total, commission, author };
}

export function buildPaymentEmail(fields: EmailFields): string {
  const { authorName, totalPayment, commissionType, title, publisher, senderName } =
    fields;
  const { author } = calculateSplit(totalPayment);

  const totalLabel = formatUSD(totalPayment);
  const authorLabel = formatUSD(author);

  return [
    `Dear ${authorName || "[Author]"},`,
    "",
    `We received our 15% commission on the ${totalLabel} ${commissionType} payment for ${title || "[Title]"} from ${publisher || "[Publisher]"}. You should receive payment directly from the publisher for ${authorLabel} within the week. Please confirm receipt. If it doesn't arrive within the week, let me know and we will follow up with the publisher.`,
    "",
    "All best,",
    "",
    senderName || "[Your name]",
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
