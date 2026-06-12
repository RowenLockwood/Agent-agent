"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "./Field";

type Props = {
  commissionAmount: number | null;
  commissionPercentForAgency: number | null;
  disabled?: boolean;
  /** Called when the user finishes editing a field (debounce or blur). */
  onChange: (patch: {
    commissionAmount?: number | null;
    commissionPercentForAgency?: number | null;
  }) => void;
};

/**
 * Two-field commission editor: dollar amount + agency percentage.
 *
 * Inputs hold the raw user text so the user can clear/edit freely; we only
 * convert to numbers (or `null` if blank) when committing on blur. Numbers
 * are validated server-side; this box just reflects what the user typed.
 */
export function CommissionBox({
  commissionAmount,
  commissionPercentForAgency,
  disabled,
  onChange,
}: Props) {
  const [amountText, setAmountText] = useState(
    commissionAmount == null ? "" : String(commissionAmount),
  );
  const [percentText, setPercentText] = useState(
    commissionPercentForAgency == null ? "" : String(commissionPercentForAgency),
  );

  // Track the last committed value so external updates (e.g. server response)
  // re-sync the inputs without overwriting in-progress typing.
  const lastAmountRef = useRef(commissionAmount);
  const lastPercentRef = useRef(commissionPercentForAgency);
  useEffect(() => {
    if (lastAmountRef.current !== commissionAmount) {
      lastAmountRef.current = commissionAmount;
      setAmountText(commissionAmount == null ? "" : String(commissionAmount));
    }
  }, [commissionAmount]);
  useEffect(() => {
    if (lastPercentRef.current !== commissionPercentForAgency) {
      lastPercentRef.current = commissionPercentForAgency;
      setPercentText(
        commissionPercentForAgency == null
          ? ""
          : String(commissionPercentForAgency),
      );
    }
  }, [commissionPercentForAgency]);

  function commitAmount() {
    if (disabled) return;
    const trimmed = amountText.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    const next = parsed != null && Number.isFinite(parsed) ? parsed : null;
    if (next === lastAmountRef.current) return;
    lastAmountRef.current = next;
    onChange({ commissionAmount: next });
  }

  function commitPercent() {
    if (disabled) return;
    const trimmed = percentText.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    const next = parsed != null && Number.isFinite(parsed) ? parsed : null;
    if (next === lastPercentRef.current) return;
    lastPercentRef.current = next;
    onChange({ commissionPercentForAgency: next });
  }

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
          className="smallcaps text-[0.8rem]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Commission
        </h4>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">
        <Field
          label="Commission Amount"
          hint="USD amount the agency receives from this contract."
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          disabled={disabled}
          value={amountText}
          onChange={(e) => setAmountText(e.currentTarget.value)}
          onBlur={commitAmount}
        />
        <Field
          label="Commission % for Agency"
          hint="The agency's percentage share. Enter a number from 0 to 100."
          inputMode="decimal"
          autoComplete="off"
          placeholder="15"
          disabled={disabled}
          value={percentText}
          onChange={(e) => setPercentText(e.currentTarget.value)}
          onBlur={commitPercent}
        />
      </div>
    </section>
  );
}

/** USD formatter for read-only summaries elsewhere. */
export function formatUsd(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
