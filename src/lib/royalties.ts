// Pure helpers for the Royalties section in Payment Details. Centralizing the
// renewal-interval math, next-send-date calculation, and overdue/upcoming
// status here keeps the UI components and the server action in sync.

export type RenewalIntervalUnit = "weeks" | "months";

export const RENEWAL_INTERVAL_UNITS: RenewalIntervalUnit[] = ["weeks", "months"];

export const RENEWAL_INTERVAL_UNIT_LABELS: Record<RenewalIntervalUnit, string> = {
  weeks: "Weeks",
  months: "Months",
};

export function isRenewalIntervalUnit(v: unknown): v is RenewalIntervalUnit {
  return v === "weeks" || v === "months";
}

export function isPositiveWholeNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

/**
 * Add `n` whole weeks or months to a UTC date, returning a new UTC date with
 * the time portion at midnight. For months, the day-of-month is preserved
 * where possible; if the resulting month is shorter (e.g. Jan 31 + 1 month),
 * the last day of the target month is used — matching how royalty statements
 * are scheduled in practice.
 */
export function addInterval(
  base: Date,
  n: number,
  unit: RenewalIntervalUnit,
): Date {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const d = base.getUTCDate();
  if (unit === "weeks") {
    return new Date(Date.UTC(y, m, d + n * 7));
  }
  // months: clamp day to target month's last day
  const targetMonth = m + n;
  const probe = new Date(Date.UTC(y, targetMonth, 1));
  const lastDay = new Date(
    Date.UTC(probe.getUTCFullYear(), probe.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(probe.getUTCFullYear(), probe.getUTCMonth(), Math.min(d, lastDay)),
  );
}

/**
 * Compute the next-send-to-author date from the first royalty statement date
 * plus the renewal interval. Returns null if any input is missing or invalid.
 */
export function computeNextSendDate(
  firstRoyaltyDate: Date | string | null | undefined,
  intervalNumber: number | null | undefined,
  intervalUnit: RenewalIntervalUnit | string | null | undefined,
): Date | null {
  const base = parseDateOnly(firstRoyaltyDate);
  if (!base) return null;
  if (!isPositiveWholeNumber(intervalNumber)) return null;
  if (!isRenewalIntervalUnit(intervalUnit)) return null;
  return addInterval(base, intervalNumber, intervalUnit);
}

export type NextSendStatus = "overdue" | "upcoming" | "unavailable";

export const NEXT_SEND_STATUS_LABELS: Record<NextSendStatus, string> = {
  overdue: "Overdue",
  upcoming: "Upcoming",
  unavailable: "Unavailable",
};

/**
 * Date-only comparison: if the next-send date is before *today* (in the local
 * day frame) it's Overdue; today or later is Upcoming; missing is Unavailable.
 * We do the comparison against the local-day midnight so the user's calendar
 * sense ("is it before today?") matches what they see regardless of timezone.
 */
export function nextSendStatus(
  nextSend: Date | string | null | undefined,
  today: Date = new Date(),
): NextSendStatus {
  const target = parseDateOnly(nextSend);
  if (!target) return "unavailable";
  const todayKey = ymd(today);
  const targetKey = ymd(target);
  return targetKey < todayKey ? "overdue" : "upcoming";
}

/** Format a renewal interval for read-only summaries (e.g. "Every 6 Months"). */
export function formatRenewalInterval(
  n: number | null | undefined,
  unit: RenewalIntervalUnit | null | undefined,
): string | null {
  if (!isPositiveWholeNumber(n) || !isRenewalIntervalUnit(unit)) return null;
  return `Every ${n} ${RENEWAL_INTERVAL_UNIT_LABELS[unit]}`;
}

/** "May 28, 2026" style for read-only date displays. */
export function formatDisplayDate(d: Date | string | null | undefined): string {
  const parsed = parseDateOnly(d);
  if (!parsed) return "—";
  return parsed.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** YYYY-MM-DD value suitable for `<input type="date">` (or empty). */
export function toDateInputValue(d: Date | string | null | undefined): string {
  const parsed = parseDateOnly(d);
  if (!parsed) return "";
  return ymd(parsed);
}

/** Parse a value (Date, ISO string, "YYYY-MM-DD") into a UTC-midnight Date. */
export function parseDateOnly(
  v: Date | string | null | undefined,
): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return new Date(
      Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()),
    );
  }
  // string: accept ISO timestamp or YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo, d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
