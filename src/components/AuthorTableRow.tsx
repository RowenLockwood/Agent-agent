"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";
import { listEditorOutreachAction, updateAuthorStageAction } from "@/app/actions";
import type { AuthorRecord } from "@/lib/authors";
import type { EditorOutreachRecord } from "@/lib/editorOutreach";
import type { AuthorStageField } from "@/lib/stages";
import { AUTHOR_STAGE_FIELDS } from "@/lib/stages";
import { AuthorStageTimeline } from "./AuthorStageTimeline";
import { EditorOutreachTable } from "./EditorOutreachTable";

type Props = {
  author: AuthorRecord;
};

type AuthorStages = Record<AuthorStageField, string>;

function stagesFromAuthor(a: AuthorRecord): AuthorStages {
  return {
    proposalSentToEditors: a.proposalSentToEditors,
    authorMeetings: a.authorMeetings,
    bidSent: a.bidSent,
    dealMemoSent: a.dealMemoSent,
    dealMemoAccepted: a.dealMemoAccepted,
    paymentReceived: a.paymentReceived,
    paymentSentToAuthor: a.paymentSentToAuthor,
  };
}

export function AuthorTableRow({ author }: Props) {
  const [stages, setStages] = useState<AuthorStages>(stagesFromAuthor(author));
  const [expanded, setExpanded] = useState(false);
  const [editors, setEditors] = useState<EditorOutreachRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && editors === null) {
      startTransition(async () => {
        const r = await listEditorOutreachAction(author.id);
        if (r.ok) setEditors(r.editors);
        else setLoadError(r.error);
      });
    }
  }

  function handleStageUpdate(field: AuthorStageField, value: string) {
    const prev = stages[field];
    setStages((s) => ({ ...s, [field]: value }));
    startTransition(async () => {
      const r = await updateAuthorStageAction(author.id, field, value);
      if (!r.ok) setStages((s) => ({ ...s, [field]: prev }));
    });
  }

  function handleEditorAdded(editor: EditorOutreachRecord) {
    setEditors((prev) => (prev ? [...prev, editor] : [editor]));
  }

  function handleEditorUpdated(updated: EditorOutreachRecord) {
    setEditors((prev) =>
      prev ? prev.map((e) => (e.id === updated.id ? updated : e)) : prev,
    );
  }

  const editorCount = editors?.length ?? null;

  return (
    <motion.div
      layout="position"
      className="border-b"
      style={{ borderColor: "var(--color-rule-soft)" }}
    >
      {/* Author info row */}
      <div className="px-4 sm:px-6 py-5">
        <div className="flex flex-wrap items-start gap-y-3 gap-x-6">
          {/* Name + metadata */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-serif text-[1.35rem] leading-tight"
              style={{ color: "var(--color-ink)" }}
            >
              {author.firstName} {author.lastName}
            </h3>
            <div
              className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.8rem] font-sans"
              style={{ color: "var(--color-ink-muted)" }}
            >
              {author.email && <span>{author.email}</span>}
              {author.headAgent && (
                <span>
                  Agent:{" "}
                  <span style={{ color: "var(--color-ink-soft)" }}>
                    {author.headAgent}
                  </span>
                  {author.headAgentEmail && (
                    <span className="ml-1 opacity-70">({author.headAgentEmail})</span>
                  )}
                </span>
              )}
              {author.assignedAssistant && (
                <span>
                  Assistant:{" "}
                  <span style={{ color: "var(--color-ink-soft)" }}>
                    {author.assignedAssistant}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Stage timeline */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <div
              className="smallcaps text-[0.65rem] mb-1"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Pipeline
            </div>
            <AuthorStageTimeline
              authorId={author.id}
              stages={stages}
              onUpdate={handleStageUpdate}
            />
          </div>
        </div>

        {/* Expand / collapse button */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpand}
            className="inline-flex items-center gap-1.5 text-[0.78rem] font-sans transition-colors focus:outline-none focus-visible:underline"
            style={{ color: "var(--color-ink-muted)" }}
            aria-expanded={expanded}
          >
            <motion.span
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="inline-block"
              aria-hidden="true"
            >
              ›
            </motion.span>
            {editorCount !== null
              ? `${editorCount} ${editorCount === 1 ? "editor" : "editors"}`
              : "Editors"}
          </button>
          {loadError && (
            <span className="text-[0.78rem]" style={{ color: "var(--color-wine)" }}>
              {loadError}
            </span>
          )}
        </div>
      </div>

      {/* Editor outreach drawer */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="editors"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.2, 0.6, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            {editors === null ? (
              <div
                className="px-6 py-5 text-[0.85rem] italic"
                style={{ color: "var(--color-ink-muted)" }}
              >
                Loading editors…
              </div>
            ) : (
              <EditorOutreachTable
                authorId={author.id}
                editors={editors}
                onEditorAdded={handleEditorAdded}
                onEditorUpdated={handleEditorUpdated}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
