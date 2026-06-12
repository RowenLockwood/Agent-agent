"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";
import {
  deleteAuthorAction,
  listEditorOutreachAction,
  updateAuthorStageAction,
  updatePaymentStageAction,
} from "@/app/actions";
import type { AuthorRecord } from "@/lib/authors";
import type { EditorOutreachRecord } from "@/lib/editorOutreach";
import type { AuthorPaymentDetailsRecord } from "@/lib/paymentDetails";
import {
  buildAuthorStageCascade,
  buildPaymentStageCascade,
  type AuthorStageField,
  type AuthorStages,
  type PaymentStageField,
  type PaymentStages,
} from "@/lib/stages";
import { AuthorStageTimeline } from "./AuthorStageTimeline";
import { ConfirmDialog } from "./ConfirmDialog";
import { EditorOutreachTable } from "./EditorOutreachTable";
import { PaymentDetailsDropdown } from "./PaymentDetailsDropdown";

type Props = {
  author: AuthorRecord;
  onEdit: (author: AuthorRecord) => void;
  onDeleted: (id: string) => void;
};

function stagesFromAuthor(a: AuthorRecord): AuthorStages {
  return {
    authorOnboarded: a.authorOnboarded,
    proposalSentToEditors: a.proposalSentToEditors,
    authorMeetings: a.authorMeetings,
    bidSent: a.bidSent,
    dealMemoSent: a.dealMemoSent,
    dealMemoAccepted: a.dealMemoAccepted,
    paymentReceived: a.paymentReceived,
    paymentSentToAuthor: a.paymentSentToAuthor,
  };
}

function paymentStagesFromRecord(p: AuthorPaymentDetailsRecord): PaymentStages {
  return {
    contractSentToEditorStage: p.contractSentToEditorStage,
    backAndForthWithEditorStage: p.backAndForthWithEditorStage,
    contractSignedByAuthorStage: p.contractSignedByAuthorStage,
    contractSignedByEditorStage: p.contractSignedByEditorStage,
    contractSignedByAllPartiesStage: p.contractSignedByAllPartiesStage,
    paymentReceivedFromEditorStage: p.paymentReceivedFromEditorStage,
    paymentSentToAuthorStage: p.paymentSentToAuthorStage,
  };
}

export function AuthorTableRow({ author, onEdit, onDeleted }: Props) {
  const [stages, setStages] = useState<AuthorStages>(stagesFromAuthor(author));
  const [paymentDetails, setPaymentDetails] = useState<AuthorPaymentDetailsRecord>(
    author.paymentDetails,
  );
  const [expanded, setExpanded] = useState(false);
  const [editors, setEditors] = useState<EditorOutreachRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
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

  // Apply a stage cascade locally so the UI updates instantly; the server
  // returns the authoritative state which we use to reconcile on success.
  // On failure, revert to the previous snapshot.
  function handleStageUpdate(field: AuthorStageField, value: string) {
    const prevStages = stages;
    const prevPayment = paymentDetails;
    const cascade = buildAuthorStageCascade(
      field,
      value,
      stages,
      paymentStagesFromRecord(paymentDetails),
    );
    setStages((s) => ({ ...s, ...cascade.author }));
    if (Object.keys(cascade.payment).length > 0) {
      setPaymentDetails((p) => ({ ...p, ...cascade.payment }));
    }
    startTransition(async () => {
      const r = await updateAuthorStageAction(author.id, field, value);
      if (r.ok) {
        setStages(r.authorStages);
        setPaymentDetails(r.paymentDetails);
      } else {
        setStages(prevStages);
        setPaymentDetails(prevPayment);
      }
    });
  }

  function handlePaymentStageUpdate(field: PaymentStageField, value: string) {
    const prevStages = stages;
    const prevPayment = paymentDetails;
    const cascade = buildPaymentStageCascade(
      field,
      value,
      paymentStagesFromRecord(paymentDetails),
      stages,
    );
    setPaymentDetails((p) => ({ ...p, ...cascade.payment }));
    if (Object.keys(cascade.author).length > 0) {
      setStages((s) => ({ ...s, ...cascade.author }));
    }
    startTransition(async () => {
      const r = await updatePaymentStageAction(author.id, field, value);
      if (r.ok) {
        setStages(r.authorStages);
        setPaymentDetails(r.paymentDetails);
      } else {
        setStages(prevStages);
        setPaymentDetails(prevPayment);
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const r = await deleteAuthorAction(author.id);
      if (r.ok) {
        setConfirmOpen(false);
        onDeleted(author.id);
      }
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
  function handleEditorDeleted(id: string) {
    setEditors((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
  }

  const editorCount = editors?.length ?? null;

  return (
    <motion.div
      layout="position"
      className="border-b"
      style={{ borderColor: "var(--color-rule-soft)" }}
    >
      <div className="px-4 sm:px-6 py-5">
        {/* Header: identity + actions */}
        <div className="flex flex-wrap items-start justify-between gap-y-3 gap-x-6">
          <div className="flex-1 min-w-0">
            <h3
              className="font-serif text-[1.25rem] leading-tight"
              style={{ color: "var(--color-ink)" }}
            >
              {author.firstName} {author.lastName}
            </h3>
            <div
              className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.8rem] font-sans"
              style={{ color: "var(--color-ink-muted)" }}
            >
              <span>
                <span className="italic">{author.title}</span>
                <span className="mx-1.5 opacity-50">·</span>
                {author.genre}
              </span>
              <span>{author.email}</span>
              <span>
                Agent:{" "}
                <span style={{ color: "var(--color-ink-soft)" }}>
                  {author.headAgent}
                </span>
                <span className="ml-1 opacity-70">({author.headAgentEmail})</span>
              </span>
              <span>
                Assistant:{" "}
                <span style={{ color: "var(--color-ink-soft)" }}>
                  {author.assignedAssistant}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => onEdit(author)}
              className="text-[0.76rem] smallcaps transition-colors hover:text-ink"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Edit
            </button>
            <span style={{ color: "var(--color-rule)" }}>·</span>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="text-[0.76rem] smallcaps transition-colors hover:text-wine"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Stages */}
        <div className="mt-5">
          <div
            className="smallcaps text-[0.82rem] mb-2.5"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Stages
          </div>
          <AuthorStageTimeline
            authorId={author.id}
            stages={stages}
            onUpdate={handleStageUpdate}
          />
        </div>

        {/* Expand / collapse editors */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpand}
            className="inline-flex items-center gap-1.5 text-[0.92rem] font-sans font-medium transition-colors focus:outline-none focus-visible:underline"
            style={{ color: "var(--color-ink-soft)" }}
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
                onEditorDeleted={handleEditorDeleted}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Details — sibling of the editors dropdown, independently collapsible. */}
      <div className="px-4 sm:px-6 pb-5">
        <PaymentDetailsDropdown
          authorId={author.id}
          paymentDetails={paymentDetails}
          onPaymentStageUpdate={handlePaymentStageUpdate}
          onPaymentDetailsChange={setPaymentDetails}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete author?"
        message={`Permanently remove ${author.firstName} ${author.lastName}, their stages, and every editor reached out to for them. This cannot be undone.`}
        pending={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </motion.div>
  );
}
