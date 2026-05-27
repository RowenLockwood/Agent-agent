"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useTransition } from "react";
import type { AuthorRecord } from "@/lib/authors";
import { buildAuthorAgreementEmail } from "@/lib/format";
import { requestEmailRefinement } from "@/lib/refineEmailClient";
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
};

const REVISION_PLACEHOLDER =
  "Try: “Make this warmer,” “Make it more formal,” “Shorten this,” or “Add that the agreement is our standard terms.”";

export function AuthorAgreementEmail({ authors, authorsError }: Props) {
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

  // When the composed email clears (any form edit), retire the revision panel
  // so it never lingers without an email to act on.
  useEffect(() => {
    if (email === null) {
      setRevisionInstruction("");
      setRefineError(null);
      setRefineSuccess(false);
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
    </div>
  );
}
