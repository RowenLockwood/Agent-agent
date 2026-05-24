"use client";

import { motion } from "framer-motion";
import {
  EDITOR_STAGE_FIELDS,
  EDITOR_STAGE_FIELD_LABELS,
  EDITOR_STAGE_OPTIONS,
  editorStageCssColor,
  editorStageColorKey,
  editorStageGlow,
  editorStageLocked,
  editorStageLockReason,
  type EditorStageField,
  type EditorStages,
} from "@/lib/stages";
import { StagePopover } from "./StagePopover";

type Props = {
  outreachId: string;
  stages: EditorStages;
  onUpdate: (field: EditorStageField, value: string) => void;
};

export function EditorStageTimeline({ stages, onUpdate }: Props) {
  return (
    <div className="flex items-center gap-0 min-w-0" role="list" aria-label="Editor pipeline stages">
      {EDITOR_STAGE_FIELDS.map((field, i) => {
        const value = stages[field] ?? "";
        const locked = editorStageLocked(field, stages);
        const color = editorStageCssColor(field, value, locked);
        const colorKey = editorStageColorKey(field, value, locked);
        const glow = locked ? "none" : editorStageGlow(colorKey);
        const isLast = i === EDITOR_STAGE_FIELDS.length - 1;

        const diamond = (
          <motion.span
            className="stage-diamond-sm"
            initial={false}
            animate={{
              borderColor: color,
              backgroundColor: locked ? "transparent" : `${color}28`,
              boxShadow: glow,
            }}
            transition={{ duration: 0.3 }}
            style={{ borderColor: color, backgroundColor: locked ? "transparent" : `${color}28` }}
          />
        );

        return (
          <div key={field} role="listitem" className="flex items-center">
            <StagePopover
              trigger={diamond}
              options={EDITOR_STAGE_OPTIONS[field]}
              currentValue={value}
              onChange={(v) => onUpdate(field, v)}
              locked={locked}
              lockReason={editorStageLockReason(field)}
              stageLabel={EDITOR_STAGE_FIELD_LABELS[field]}
              disabled={locked}
            />
            {!isLast && (
              <div
                className="h-px w-3 sm:w-4 flex-shrink-0 transition-colors duration-300"
                style={{ background: locked ? "var(--color-rule-soft)" : "var(--color-rule)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
