"use client";

import { useEffect, useRef, useState } from "react";
import {
  NEXT_SEND_STATUS_LABELS,
  RENEWAL_INTERVAL_UNIT_LABELS,
  RENEWAL_INTERVAL_UNITS,
  computeNextSendDate,
  formatDisplayDate,
  formatRenewalInterval,
  isRenewalIntervalUnit,
  nextSendStatus,
  toDateInputValue,
  type NextSendStatus,
  type RenewalIntervalUnit,
} from "@/lib/royalties";
import { Field, SelectField } from "./Field";

type RoyaltiesPatch = {
  firstRoyaltyStatementDate?: string | null;
  renewalIntervalNumber?: number | null;
  renewalIntervalUnit?: RenewalIntervalUnit | null;
  lastSentToAuthorDate?: string | null;
};

type Props = {
  firstRoyaltyStatementDate: string | null;
  renewalIntervalNumber: number | null;
  renewalIntervalUnit: RenewalIntervalUnit | null;
  lastSentToAuthorDate: string | null;
  nextSendToAuthorDate: string | null;
  disabled?: boolean;
  onChange: (patch: RoyaltiesPatch) => void;
};

const STATUS_COLORS: Record<NextSendStatus, string> = {
  overdue: "var(--color-wine)",
  upcoming: "#9a6e0f", // warm amber, matches in_progress
  unavailable: "var(--color-ink-muted)",
};

export function RoyaltiesBox({
  firstRoyaltyStatementDate,
  renewalIntervalNumber,
  renewalIntervalUnit,
  lastSentToAuthorDate,
  nextSendToAuthorDate,
  disabled,
  onChange,
}: Props) {
  // Local text state for the number input — string so user can clear/edit
  // freely. Commit happens on blur (parses to number-or-null then notifies).
  const [intervalText, setIntervalText] = useState(
    renewalIntervalNumber == null ? "" : String(renewalIntervalNumber),
  );
  const lastIntervalRef = useRef(renewalIntervalNumber);
  useEffect(() => {
    if (lastIntervalRef.current !== renewalIntervalNumber) {
      lastIntervalRef.current = renewalIntervalNumber;
      setIntervalText(
        renewalIntervalNumber == null ? "" : String(renewalIntervalNumber),
      );
    }
  }, [renewalIntervalNumber]);

  function commitInterval() {
    if (disabled) return;
    const trimmed = intervalText.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    const next =
      parsed != null &&
      Number.isFinite(parsed) &&
      Number.isInteger(parsed) &&
      parsed > 0
        ? parsed
        : trimmed === ""
          ? null
          : NaN;
    // If the input is invalid (e.g. "1.5", "-3"), still commit so server-side
    // validation surfaces the polished error message; the helper in the action
    // will reject NaN by re-raising the validation error.
    if (Number.isNaN(next)) {
      onChange({ renewalIntervalNumber: parsed as number });
      return;
    }
    if (next === lastIntervalRef.current) return;
    lastIntervalRef.current = next;
    onChange({ renewalIntervalNumber: next });
  }

  // Live preview of Next Send to Author based on the current input values.
  // We don't wait for the server to round-trip; the server-side recalculation
  // matches because both sides call the same `computeNextSendDate` helper.
  const optimisticNext = computeNextSendDate(
    firstRoyaltyStatementDate,
    renewalIntervalNumber,
    renewalIntervalUnit,
  );
  const displayedNext =
    optimisticNext ?? (nextSendToAuthorDate ?? null);
  const status = nextSendStatus(displayedNext);

  const renewalSummary = formatRenewalInterval(
    renewalIntervalNumber,
    renewalIntervalUnit,
  );

  const hasLastSent = !!lastSentToAuthorDate;

  return (
    <section
      className="rounded-[3px] p-4"
      style={{
        border: "1px solid var(--color-rule-soft)",
        background: "var(--color-paper)",
      }}
    >
      <header className="mb-2">
        <h4
          className="smallcaps text-[0.72rem]"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Royalties
        </h4>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">
        <Field
          label="First Royalty Statement Date"
          hint="Used as the base date for the next-send schedule."
          type="date"
          autoComplete="off"
          required
          disabled={disabled}
          value={toDateInputValue(firstRoyaltyStatementDate)}
          onChange={(e) =>
            onChange({
              firstRoyaltyStatementDate:
                e.currentTarget.value === "" ? null : e.currentTarget.value,
            })
          }
        />
        <Field
          label="Renewal Interval Number"
          hint="A positive whole number — for example, 2, 6, or 12."
          inputMode="numeric"
          autoComplete="off"
          placeholder="6"
          required
          disabled={disabled}
          value={intervalText}
          onChange={(e) => setIntervalText(e.currentTarget.value)}
          onBlur={commitInterval}
        />
        <SelectField
          label="Renewal Interval Unit"
          required
          disabled={disabled}
          value={renewalIntervalUnit ?? ""}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v === "") {
              onChange({ renewalIntervalUnit: null });
            } else if (isRenewalIntervalUnit(v)) {
              onChange({ renewalIntervalUnit: v });
            }
          }}
        >
          <option value="">Select…</option>
          {RENEWAL_INTERVAL_UNITS.map((u) => (
            <option key={u} value={u}>
              {RENEWAL_INTERVAL_UNIT_LABELS[u]}
            </option>
          ))}
        </SelectField>
        <Field
          label="Last Sent to Author"
          hint="Date the most recent statement was sent."
          type="date"
          autoComplete="off"
          disabled={disabled}
          value={toDateInputValue(lastSentToAuthorDate)}
          onChange={(e) =>
            onChange({
              lastSentToAuthorDate:
                e.currentTarget.value === "" ? null : e.currentTarget.value,
            })
          }
        />
      </div>

      <div
        className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 pt-3"
        style={{ borderTop: "1px dashed var(--color-rule-soft)" }}
      >
        <ReadOnlyRow
          label="Renewal Cadence"
          value={renewalSummary ?? "—"}
          valueColor="var(--color-ink-soft)"
        />
        <ReadOnlyRow
          label="Last Sent to Author"
          value={hasLastSent ? formatDisplayDate(lastSentToAuthorDate) : "Not yet sent"}
          valueColor={
            hasLastSent ? "#1a5c3a" : "var(--color-ink-muted)"
          }
          badge={hasLastSent ? "Sent" : null}
          badgeColor={hasLastSent ? "#1a5c3a" : undefined}
        />
        <ReadOnlyRow
          label="Next Send to Author"
          value={displayedNext ? formatDisplayDate(displayedNext) : "Add a first statement date and renewal interval"}
          valueColor={STATUS_COLORS[status]}
          badge={NEXT_SEND_STATUS_LABELS[status]}
          badgeColor={STATUS_COLORS[status]}
        />
      </div>
    </section>
  );
}

function ReadOnlyRow({
  label,
  value,
  valueColor,
  badge,
  badgeColor,
}: {
  label: string;
  value: string;
  valueColor: string;
  badge?: string | null;
  badgeColor?: string;
}) {
  return (
    <div>
      <div
        className="smallcaps text-[0.68rem] mb-0.5"
        style={{ color: "var(--color-ink-muted)" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="font-serif italic text-[1rem] leading-tight"
          style={{ color: valueColor }}
        >
          {value}
        </span>
        {badge && (
          <span
            className="smallcaps text-[0.62rem] px-1.5 py-0.5 rounded-[2px]"
            style={{
              color: badgeColor ?? "var(--color-ink-muted)",
              border: `1px solid ${badgeColor ?? "var(--color-rule)"}`,
              backgroundColor: badgeColor
                ? `${badgeColor}14`
                : "transparent",
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
