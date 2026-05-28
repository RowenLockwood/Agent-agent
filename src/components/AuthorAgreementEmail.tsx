"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useTransition } from "react";
import { markAuthorOnboardingEmailSentAction } from "@/app/actions";
import type { AuthorRecord } from "@/lib/authors";
import { buildAuthorAgreementEmail } from "@/lib/format";
import { requestEmailRefinement } from "@/lib/refineEmailClient";
import {
  AUTHOR_STAGE_STATUS_LABELS,
  type AuthorStageStatus,
} from "@/lib/stages";
import { AuthorSelector, type AuthorSelection } from "./AuthorSelector";
import { EmailOutputBox } from "./EmailOutputBox";
import {
  EmailRevisionPanel,
  MAX_REVISION_INSTRUCTION,
} from "./EmailRevisionPanel";
import { Field } from "./Field";

type Props = {
  authors: AuthorRecord[];
  authorsError?: string | null;
  onAuthorUpdated?: (author: AuthorRecord) => void;
};

type MarkNote = { tone: "success" | "muted" | "error"; text: string };

const REVISION_PLACEHOLDER =
  "Try: “Make this warmer,” “Make it more formal,” “Shorten this,” or “Add that the agreement is our standard terms.”";

export function AuthorAgreementEmail({
  authors,
  authorsError,
  onAuthorUpdated,
}: Props) {
  const [authorName, setAuthorName] = useState("");
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [agency, setAgency] = useState("");
  const [agentName, setAgentName] = useState("");

  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const emailRef = useRef<HTMLTextAreaElement>(null);

  // Plato revision panel (LLM "Edit Email").
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [refineSuccess, setRefineSuccess] = useState(false);

  // "Mark Onboarding Email Sent" — advances the author's onboarding stage.
  const [isMarkingSent, setIsMarkingSent] = useState(false);
  const [markNote, setMarkNote] = useState<MarkNote | null>(null);

  // When the composed email clears (any form edit), retire the revision and
  // onboarding panels so they never linger without an email to act on.
  useEffect(() => {
    if (email === null) {
      setRevisionInstruction("");
      setRefineError(null);
      setRefineSuccess(false);
      setMarkNote(null);
    }
  }, [email]);

  function resetOutput() {
    setEmail(null);
    if (error) setError(null);
  }

  function onAuthorChange(next: AuthorSelection) {
    setAuthorName(next.name);
    setSelectedAuthorId(next.selectedId);
    // Picking a saved author signs the email with their head agent; typing a
    // name leaves whatever the agent field already holds untouched.
    if (next.selectedId) {
      const author = authors.find((a) => a.id === next.selectedId);
      setAgentName(author?.headAgent ?? "");
    }
    resetOutput();
  }

  function onGenerate() {
    setError(null);
    const author = authorName.trim();
    const agencyName = agency.trim();
    const agent = agentName.trim();
    if (!author) {
      setError("Select or enter an author.");
      return;
    }
    if (!agencyName) {
      setError("Enter the agency name.");
      return;
    }
    if (!agent) {
      setError("Enter the agent name.");
      return;
    }
    startTransition(() => {
      const body = buildAuthorAgreementEmail({
        authorName: author,
        agency: agencyName,
        agentName: agent,
      });
      setEmail(body);
      setCopied(false);
    });
  }

  async function onCopy() {
    if (!email) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else if (emailRef.current) {
        emailRef.current.select();
        document.execCommand("copy");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error(err);
      setError("Could not copy. Select the text and copy it manually.");
    }
  }

  function onInstructionChange(value: string) {
    setRevisionInstruction(value.slice(0, MAX_REVISION_INSTRUCTION));
    if (refineError) setRefineError(null);
    if (refineSuccess) setRefineSuccess(false);
  }

  async function onRefine() {
    if (!email) return;
    const instruction = revisionInstruction.trim();
    if (!instruction) {
      setRefineError("Tell Plato how you'd like to revise the email.");
      return;
    }
    setRefineError(null);
    setRefineSuccess(false);
    setIsRefining(true);
    const result = await requestEmailRefinement({
      emailType: "author_agreement",
      initialEmail: email,
      userInstruction: instruction,
      authorName: authorName.trim() || undefined,
      agency: agency.trim() || undefined,
      agentName: agentName.trim() || undefined,
    });
    setIsRefining(false);
    if (!result.ok) {
      setRefineError(result.error);
      return;
    }
    setEmail(result.revisedEmail);
    setRevisionInstruction("");
    setCopied(false);
    setRefineSuccess(true);
    setTimeout(() => setRefineSuccess(false), 2600);
  }

  async function onMarkSent() {
    if (!selectedAuthorId || isMarkingSent) return;
    setMarkNote(null);
    setIsMarkingSent(true);
    const result = await markAuthorOnboardingEmailSentAction(selectedAuthorId);
    setIsMarkingSent(false);
    if (!result.ok) {
      setMarkNote({ tone: "error", text: result.error });
      return;
    }
    onAuthorUpdated?.(result.author);
    if (result.changed) {
      setMarkNote({
        tone: "success",
        text: "Author Onboarded moved to In Progress.",
      });
    } else {
      const label =
        AUTHOR_STAGE_STATUS_LABELS[
          result.author.authorOnboarded as AuthorStageStatus
        ] ?? "set";
      setMarkNote({
        tone: "muted",
        text: `Author Onboarded is already ${label} — left unchanged.`,
      });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <AuthorSelector
        label="Author"
        authors={authors}
        name={authorName}
        selectedId={selectedAuthorId}
        onChange={onAuthorChange}
        hint="Pick a saved author or type a name. The greeting uses this name."
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field
          label="Agency"
          hint="Appears in the body of the agreement email."
          autoComplete="off"
          placeholder="The agency's name"
          value={agency}
          onChange={(e) => {
            setAgency(e.currentTarget.value);
            resetOutput();
          }}
          required
        />
        <Field
          label="Agent"
          hint="Signs the email. Auto-fills from the author's head agent."
          autoComplete="off"
          highlightOnChange
          value={agentName}
          onChange={(e) => {
            setAgentName(e.currentTarget.value);
            resetOutput();
          }}
          required
        />
      </div>

      <div className="pt-1 flex items-center justify-between gap-4">
        <div className="min-h-[1.25rem] text-[0.92rem] leading-tight">
          <AnimatePresence mode="wait">
            {error && (
              <motion.span
                key="err"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.24 }}
                className="text-wine"
              >
                {error}
              </motion.span>
            )}
            {authorsError && !error && (
              <motion.span
                key="auth-err"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-wine"
              >
                {authorsError}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          whileTap={{ scale: pending ? 1 : 0.985 }}
          className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-[0.85rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{pending ? "Composing" : "Generate email"}</span>
          <span aria-hidden="true">→</span>
        </motion.button>
      </div>

      <EmailOutputBox
        email={email}
        onCopy={onCopy}
        copied={copied}
        revised={refineSuccess}
        onChange={(v) => {
          setEmail(v);
          setCopied(false);
        }}
        ref={emailRef}
      />

      <EmailRevisionPanel
        visible={!!email}
        value={revisionInstruction}
        onChange={onInstructionChange}
        onSubmit={onRefine}
        isRefining={isRefining}
        error={refineError}
        success={refineSuccess}
        placeholder={REVISION_PLACEHOLDER}
      />

      <MarkOnboardingPanel
        visible={!!email}
        canMark={!!selectedAuthorId}
        authorName={authorName.trim()}
        isMarking={isMarkingSent}
        note={markNote}
        onMark={onMarkSent}
      />
    </div>
  );
}

type MarkOnboardingPanelProps = {
  visible: boolean;
  canMark: boolean;
  authorName: string;
  isMarking: boolean;
  note: MarkNote | null;
  onMark: () => void;
};

function MarkOnboardingPanel({
  visible,
  canMark,
  authorName,
  isMarking,
  note,
  onMark,
}: MarkOnboardingPanelProps) {
  const noteColor =
    note?.tone === "error"
      ? "var(--color-wine)"
      : note?.tone === "success"
        ? "var(--color-forest)"
        : "var(--color-ink-muted)";

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          key="mark-onboarding"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.42, ease: [0.2, 0.6, 0.2, 1], delay: 0.08 }}
          style={{ transformOrigin: "top" }}
          className="mt-5 border border-rule-soft bg-paper-soft px-5 py-5"
        >
          <div className="flex items-center gap-3 mb-2.5">
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--color-forest)" }}
            />
            <h3 className="smallcaps text-[0.82rem] text-ink-muted">
              Onboarding
            </h3>
          </div>
          <p className="font-serif italic text-[1.02rem] leading-snug text-ink-soft mb-3.5">
            {canMark
              ? `Sent this agreement to ${authorName || "the author"}? Mark it sent to move their onboarding forward in the Client Library.`
              : "Select a saved Client Library author to track onboarding here — manually entered authors aren't in the library yet."}
          </p>

          <div className="flex items-center justify-between gap-4">
            <div className="min-h-[1.25rem] text-[0.9rem] leading-tight">
              <AnimatePresence mode="wait" initial={false}>
                {note && (
                  <motion.span
                    key={note.text}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.24 }}
                    className="inline-flex items-center gap-1.5 font-serif italic"
                    style={{ color: noteColor }}
                  >
                    {note.tone === "success" && (
                      <svg width="11" height="11" viewBox="0 0 12 12">
                        <path
                          d="M2 6.5 L5 9 L10 3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {note.text}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="button"
              onClick={onMark}
              disabled={!canMark || isMarking}
              whileTap={{ scale: !canMark || isMarking ? 1 : 0.985 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[0.85rem] smallcaps border border-ink text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink"
            >
              {isMarking ? (
                <>
                  <motion.svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.35"
                      strokeWidth="2"
                    />
                    <path
                      d="M8 2 a6 6 0 0 1 6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </motion.svg>
                  <span>Updating</span>
                </>
              ) : (
                <span>Mark Onboarding Email Sent</span>
              )}
            </motion.button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
