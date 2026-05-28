"use client";

import { motion } from "framer-motion";
import {
  AUTHOR_STAGE_FIELDS,
  AUTHOR_STAGE_FIELD_LABELS,
  AUTHOR_STAGE_STATUS_LABELS,
  AUTHOR_STAGE_STATUSES,
  authorStageCssColor,
  authorStageLocked,
  authorStageLockReason,
  type AuthorStageField,
  type AuthorStages,
  type AuthorStageStatus,
} from "@/lib/stages";
import { StagePopover } from "./StagePopover";

type Props = {
  authorId: string;
  stages: AuthorStages;
  onUpdate: (field: AuthorStageField, value: string) => void;
};

const OPTIONS = AUTHOR_STAGE_STATUSES.map((s) => ({
  value: s,
  label: AUTHOR_STAGE_STATUS_LABELS[s],
}));

export function AuthorStageTimeline({ stages, onUpdate }: Props) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2"
      role="list"
      aria-label="Author stages"
    >
      {AUTHOR_STAGE_FIELDS.map((field, i) => {
        const status = (stages[field] as AuthorStageStatus) ?? "not_started";
        const locked = authorStageLocked(field, stages);
        const color = authorStageCssColor(status, locked);

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
              className="smallcaps flex items-center gap-1 text-[0.6rem] leading-tight"
              style={{ color: "var(--color-ink-muted)" }}
            >
              {locked && (
                <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">
                  <path
                    d="M2.5 4.5V3a2.5 2.5 0 015 0v1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <rect x="1.5" y="4.5" width="7" height="4.5" rx="0.8" fill="currentColor" />
                </svg>
              )}
              {i + 1}. {AUTHOR_STAGE_FIELD_LABELS[field]}
            </span>
            <span className="mt-1 flex items-center gap-1">
              <span
                className="font-sans text-[0.82rem] font-medium leading-tight"
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
                  <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
              lockReason={authorStageLockReason(field)}
              stageLabel={AUTHOR_STAGE_FIELD_LABELS[field]}
              disabled={locked}
            />
          </div>
        );
      })}
    </div>
  );
}
