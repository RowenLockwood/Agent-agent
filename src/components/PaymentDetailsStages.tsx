"use client";

import { motion } from "framer-motion";
import {
  AUTHOR_STAGE_STATUS_LABELS,
  AUTHOR_STAGE_STATUSES,
  PAYMENT_STAGE_FIELDS,
  PAYMENT_STAGE_FIELD_LABELS,
  authorStageCssColor,
  paymentStageLocked,
  paymentStageLockReason,
  type AuthorStageStatus,
  type PaymentStageField,
  type PaymentStages,
} from "@/lib/stages";
import { StagePopover } from "./StagePopover";

type Props = {
  stages: PaymentStages;
  onUpdate: (field: PaymentStageField, value: string) => void;
};

const OPTIONS = AUTHOR_STAGE_STATUSES.map((s) => ({
  value: s,
  label: AUTHOR_STAGE_STATUS_LABELS[s],
}));

/**
 * Seven-square payment-stage strip. Visually identical to the author/editor
 * stage strips (same square card, same lock affordance, same popover) so the
 * Payment Details dropdown reads as a natural sibling of the existing pieces.
 */
export function PaymentDetailsStages({ stages, onUpdate }: Props) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2"
      role="list"
      aria-label="Payment Details stages"
    >
      {PAYMENT_STAGE_FIELDS.map((field) => {
        const status = (stages[field] as AuthorStageStatus) ?? "not_started";
        const locked = paymentStageLocked(field, stages);
        const color = authorStageCssColor(status, locked);
        const label = PAYMENT_STAGE_FIELD_LABELS[field];

        const square = (
          <motion.span
            initial={false}
            animate={{
              borderColor: color,
              backgroundColor: locked ? "transparent" : `${color}14`,
            }}
            transition={{ duration: 0.3 }}
            whileHover={locked ? undefined : { y: -2 }}
            className="block w-full h-full px-2.5 py-2 rounded-[3px] text-left"
            style={{
              border: `1.5px solid ${color}`,
              backgroundColor: locked ? "transparent" : `${color}14`,
              borderLeftWidth: "4px",
              opacity: locked ? 0.7 : 1,
            }}
          >
            <span
              className="smallcaps flex items-start gap-1 text-[0.68rem] leading-[1.18]"
              style={{ color: "var(--color-ink-soft)", letterSpacing: "0.03em" }}
            >
              {locked && (
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                  className="mt-[0.15rem] flex-shrink-0"
                >
                  <path
                    d="M2.5 4.5V3a2.5 2.5 0 015 0v1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <rect
                    x="1.5"
                    y="4.5"
                    width="7"
                    height="4.5"
                    rx="0.8"
                    fill="currentColor"
                  />
                </svg>
              )}
              {label}
            </span>
            <span className="mt-1.5 flex items-center gap-1">
              <span
                className="font-sans text-[0.85rem] font-medium leading-tight"
                style={{ color: locked ? "var(--color-ink-muted)" : color }}
              >
                {locked ? "Locked" : AUTHOR_STAGE_STATUS_LABELS[status]}
              </span>
              {!locked && (
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                  style={{ color, opacity: 0.55, flexShrink: 0 }}
                >
                  <path
                    d="M2.5 4.5L6 8l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </span>
          </motion.span>
        );

        return (
          <div key={field} role="listitem" className="flex">
            <StagePopover
              trigger={square}
              triggerClassName="w-full text-left block"
              options={OPTIONS}
              currentValue={status}
              onChange={(v) => onUpdate(field, v)}
              locked={locked}
              lockReason={paymentStageLockReason(field)}
              stageLabel={label}
              disabled={locked}
            />
          </div>
        );
      })}
    </div>
  );
}
