"use client";

import { motion } from "framer-motion";
import {
  AUTHOR_STAGE_FIELDS,
  AUTHOR_STAGE_FIELD_LABELS,
  AUTHOR_STAGE_STATUS_LABELS,
  AUTHOR_STAGE_STATUSES,
  authorStageColor,
  authorStageGlow,
  type AuthorStageField,
  type AuthorStageStatus,
} from "@/lib/stages";
import { StagePopover } from "./StagePopover";

type AuthorStages = Record<AuthorStageField, string>;

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
    <div className="flex items-center gap-0 min-w-0" role="list" aria-label="Author pipeline stages">
      {AUTHOR_STAGE_FIELDS.map((field, i) => {
        const status = (stages[field] as AuthorStageStatus) ?? "not_started";
        const color = authorStageColor(status);
        const glow = authorStageGlow(status);
        const isLast = i === AUTHOR_STAGE_FIELDS.length - 1;

        const diamond = (
          <motion.span
            className="stage-diamond"
            initial={false}
            animate={{ borderColor: color, backgroundColor: `${color}33`, boxShadow: glow }}
            transition={{ duration: 0.3 }}
            style={{ borderColor: color, backgroundColor: `${color}33`, boxShadow: glow }}
          />
        );

        return (
          <div key={field} role="listitem" className="flex items-center">
            <StagePopover
              trigger={diamond}
              options={OPTIONS}
              currentValue={status}
              onChange={(v) => onUpdate(field, v)}
              stageLabel={AUTHOR_STAGE_FIELD_LABELS[field]}
            />
            {!isLast && (
              <div
                className="h-px w-5 sm:w-6 flex-shrink-0 transition-colors duration-300"
                style={{ background: status === "completed" ? color : "var(--color-rule)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
