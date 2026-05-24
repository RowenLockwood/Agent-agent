"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTransition } from "react";
import { updateEditorStageAction } from "@/app/actions";
import type { EditorOutreachRecord } from "@/lib/editorOutreach";
import type { EditorStageField, EditorStages } from "@/lib/stages";
import { EditorStageTimeline } from "./EditorStageTimeline";
import { AddEditorRow } from "./AddEditorRow";

type Props = {
  authorId: string;
  editors: EditorOutreachRecord[];
  onEditorAdded: (e: EditorOutreachRecord) => void;
  onEditorUpdated: (updated: EditorOutreachRecord) => void;
};

export function EditorOutreachTable({
  authorId,
  editors,
  onEditorAdded,
  onEditorUpdated,
}: Props) {
  const [, startTransition] = useTransition();

  function handleStageUpdate(
    outreach: EditorOutreachRecord,
    field: EditorStageField,
    value: string,
  ) {
    // Optimistic update
    const updated: EditorOutreachRecord = { ...outreach, [field]: value };
    onEditorUpdated(updated);
    startTransition(async () => {
      const r = await updateEditorStageAction(outreach.id, field, value);
      if (!r.ok) {
        // Revert on failure
        onEditorUpdated(outreach);
      }
    });
  }

  return (
    <div
      className="border-t"
      style={{ borderColor: "var(--color-rule-soft)" }}
    >
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <h3
          className="smallcaps text-[0.72rem]"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Editors Reached Out To
          {editors.length > 0 && (
            <span className="ml-2 font-sans normal-case" style={{ letterSpacing: 0 }}>
              ({editors.length})
            </span>
          )}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px] border-collapse text-[0.84rem]">
          <thead>
            <tr
              className="text-left"
              style={{ borderBottom: "1px solid var(--color-rule-soft)" }}
            >
              {["First Name", "Last Name", "Email", "Publisher", "Stages"].map(
                (h) => (
                  <th
                    key={h}
                    className="smallcaps text-[0.67rem] px-3 py-2 font-normal whitespace-nowrap"
                    style={{ color: "var(--color-ink-muted)" }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {editors.map((ed) => {
                const stages: EditorStages = {
                  proposalStage: ed.proposalStage,
                  authorMeetingStage: ed.authorMeetingStage,
                  bidStage: ed.bidStage,
                  dealMemoStage: ed.dealMemoStage,
                  paymentReceivedStage: ed.paymentReceivedStage,
                  paymentSentToAuthorStage: ed.paymentSentToAuthorStage,
                };
                return (
                  <motion.tr
                    key={ed.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ borderBottom: "1px solid var(--color-rule-soft)" }}
                    className="group"
                  >
                    <td
                      className="px-3 py-2.5 whitespace-nowrap"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {ed.editorFirstName}
                    </td>
                    <td
                      className="px-3 py-2.5 whitespace-nowrap"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {ed.editorLastName}
                    </td>
                    <td
                      className="px-3 py-2.5 max-w-[160px] truncate"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      {ed.editorEmail ?? (
                        <span className="italic opacity-50">—</span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2.5 max-w-[140px] truncate"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      {ed.publishingHouse ?? (
                        <span className="italic opacity-50">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <EditorStageTimeline
                        outreachId={ed.id}
                        stages={stages}
                        onUpdate={(field, val) =>
                          handleStageUpdate(ed, field, val)
                        }
                      />
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>

            {editors.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-[0.85rem] italic"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  No editors yet — add one below.
                </td>
              </tr>
            )}

            <AddEditorRow authorId={authorId} onAdded={onEditorAdded} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
