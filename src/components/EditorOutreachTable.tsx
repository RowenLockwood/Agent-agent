"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";
import {
  createEditorAction,
  deleteEditorAction,
  updateEditorAction,
  updateEditorStageAction,
} from "@/app/actions";
import type { EditorOutreachRecord } from "@/lib/editorOutreach";
import type { EditorStageField, EditorStages } from "@/lib/stages";
import { ConfirmDialog } from "./ConfirmDialog";
import { EditorForm, type EditorFormValues } from "./EditorForm";
import { EditorStageTimeline } from "./EditorStageTimeline";

type Props = {
  authorId: string;
  editors: EditorOutreachRecord[];
  onEditorAdded: (e: EditorOutreachRecord) => void;
  onEditorUpdated: (updated: EditorOutreachRecord) => void;
  onEditorDeleted: (id: string) => void;
};

export function EditorOutreachTable({
  authorId,
  editors,
  onEditorAdded,
  onEditorUpdated,
  onEditorDeleted,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  function handleStageUpdate(
    outreach: EditorOutreachRecord,
    field: EditorStageField,
    value: string,
  ) {
    onEditorUpdated({ ...outreach, [field]: value });
    startTransition(async () => {
      const r = await updateEditorStageAction(outreach.id, field, value);
      if (!r.ok) onEditorUpdated(outreach);
    });
  }

  return (
    <div
      className="border-t px-4 sm:px-6 py-4"
      style={{ borderColor: "var(--color-rule-soft)" }}
    >
      <div className="flex items-center justify-between mb-3">
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
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-[0.78rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors px-3 py-1.5"
          >
            + Add Editor
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {editors.map((ed) => (
            <EditorCard
              key={ed.id}
              editor={ed}
              onStageUpdate={(field, val) => handleStageUpdate(ed, field, val)}
              onUpdated={onEditorUpdated}
              onDeleted={onEditorDeleted}
            />
          ))}
        </AnimatePresence>

        {editors.length === 0 && !adding && (
          <p
            className="text-[0.85rem] italic py-1"
            style={{ color: "var(--color-ink-muted)" }}
          >
            No editors yet — add one to start tracking outreach.
          </p>
        )}

        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24 }}
              style={{ overflow: "hidden" }}
            >
              <div
                className="p-3.5 rounded-[3px]"
                style={{
                  border: "1px solid var(--color-rule-soft)",
                  background: "var(--color-paper-soft)",
                }}
              >
                <EditorForm
                  submitLabel="Add editor"
                  onSubmit={(values) => createEditorAction(authorId, values)}
                  onDone={() => setAdding(false)}
                  onCancel={() => setAdding(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EditorCard({
  editor,
  onStageUpdate,
  onUpdated,
  onDeleted,
}: {
  editor: EditorOutreachRecord;
  onStageUpdate: (field: EditorStageField, value: string) => void;
  onUpdated: (updated: EditorOutreachRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  const stages: EditorStages = {
    proposalStage: editor.proposalStage,
    authorMeetingStage: editor.authorMeetingStage,
    bidStage: editor.bidStage,
    dealMemoStage: editor.dealMemoStage,
    paymentReceivedStage: editor.paymentReceivedStage,
    paymentSentToAuthorStage: editor.paymentSentToAuthorStage,
  };

  function handleEditSubmit(values: EditorFormValues) {
    return updateEditorAction(editor.id, values).then((r) => {
      if (r.ok) onUpdated(r.editor);
      return r;
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const r = await deleteEditorAction(editor.id);
      if (r.ok) {
        setConfirmOpen(false);
        onDeleted(editor.id);
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-[3px] p-3.5"
      style={{
        border: "1px solid var(--color-rule-soft)",
        background: "var(--color-paper-soft)",
      }}
    >
      {editing ? (
        <EditorForm
          initial={{
            editorFirstName: editor.editorFirstName,
            editorLastName: editor.editorLastName,
            editorEmail: editor.editorEmail,
            publishingHouse: editor.publishingHouse,
          }}
          submitLabel="Save changes"
          onSubmit={handleEditSubmit}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div
              className="font-serif text-[1.05rem] leading-tight"
              style={{ color: "var(--color-ink)" }}
            >
              {editor.editorFirstName} {editor.editorLastName}
            </div>
            <div
              className="mt-0.5 flex flex-wrap gap-x-3 text-[0.78rem] font-sans"
              style={{ color: "var(--color-ink-muted)" }}
            >
              <span>{editor.publishingHouse}</span>
              <span className="opacity-80">{editor.editorEmail}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[0.74rem] smallcaps transition-colors hover:text-ink"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Edit
            </button>
            <span style={{ color: "var(--color-rule)" }}>·</span>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="text-[0.74rem] smallcaps transition-colors hover:text-wine"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {!editing && (
        <EditorStageTimeline
          outreachId={editor.id}
          stages={stages}
          onUpdate={onStageUpdate}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete editor?"
        message={`Remove ${editor.editorFirstName} ${editor.editorLastName} and all of their outreach stages. This cannot be undone.`}
        pending={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </motion.div>
  );
}
