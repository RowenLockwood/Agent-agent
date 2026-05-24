"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { createAuthorAction, updateAuthorAction } from "@/app/actions";
import type { AuthorRecord } from "@/lib/authors";
import { Field } from "./Field";
import { FileUploadControl } from "./FileUploadControl";

type Props = {
  open: boolean;
  /** When set, the modal edits this author instead of creating a new one. */
  author?: AuthorRecord | null;
  onClose: () => void;
  onSaved: (author: AuthorRecord) => void;
};

type Form = {
  firstName: string;
  lastName: string;
  title: string;
  genre: string;
  email: string;
  headAgent: string;
  headAgentEmail: string;
  assignedAssistant: string;
};

const EMPTY: Form = {
  firstName: "",
  lastName: "",
  title: "",
  genre: "",
  email: "",
  headAgent: "",
  headAgentEmail: "",
  assignedAssistant: "",
};

function formFromAuthor(a: AuthorRecord): Form {
  return {
    firstName: a.firstName,
    lastName: a.lastName,
    title: a.title,
    genre: a.genre,
    email: a.email,
    headAgent: a.headAgent,
    headAgentEmail: a.headAgentEmail,
    assignedAssistant: a.assignedAssistant,
  };
}

export function AddAuthorModal({ open, author, onClose, onSaved }: Props) {
  const isEdit = !!author;
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firstRef = useRef<HTMLInputElement>(null);

  // Seed the form when opened; reset when closed.
  useEffect(() => {
    if (open) {
      setForm(author ? formFromAuthor(author) : EMPTY);
      setError(null);
      setTimeout(() => firstRef.current?.focus(), 80);
    } else {
      setForm(EMPTY);
      setError(null);
    }
  }, [open, author]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function set<K extends keyof Form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (error) setError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const required: [keyof Form, string][] = [
      ["firstName", "First name is required."],
      ["lastName", "Last name is required."],
      ["title", "Book title is required."],
      ["genre", "Genre is required."],
      ["email", "Author email is required."],
      ["headAgent", "Head agent is required."],
      ["headAgentEmail", "Head agent email is required."],
      ["assignedAssistant", "Assigned assistant is required."],
    ];
    for (const [key, msg] of required) {
      if (!form[key].trim()) {
        setError(msg);
        return;
      }
    }
    startTransition(async () => {
      const r = author
        ? await updateAuthorAction(author.id, form)
        : await createAuthorAction(form);
      if (!r.ok) { setError(r.error); return; }
      onSaved(r.author);
      onClose();
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(26,23,20,0.55)" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Centering container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-author-heading"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.99 }}
              transition={{ duration: 0.3, ease: [0.2, 0.6, 0.2, 1] }}
              className="pointer-events-auto w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-[0_32px_80px_-20px_rgba(26,23,20,0.55)]"
              style={{
                background: "var(--color-paper)",
                border: "1px solid var(--color-rule)",
              }}
            >
              <div className="px-7 py-7">
                <div className="flex items-start justify-between mb-7">
                  <h2
                    id="add-author-heading"
                    className="font-serif text-[1.75rem] leading-none"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {isEdit ? "Edit Author" : "Add New Author"}
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="mt-1 w-7 h-7 flex items-center justify-center focus:outline-none"
                    style={{ color: "var(--color-ink-muted)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                    <Field
                      ref={firstRef}
                      label="First name"
                      required
                      autoComplete="off"
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.currentTarget.value)}
                      disabled={pending}
                    />
                    <Field
                      label="Last name"
                      required
                      autoComplete="off"
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.currentTarget.value)}
                      disabled={pending}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                    <Field
                      label="Book title"
                      required
                      autoComplete="off"
                      value={form.title}
                      onChange={(e) => set("title", e.currentTarget.value)}
                      disabled={pending}
                    />
                    <Field
                      label="Genre"
                      required
                      autoComplete="off"
                      value={form.genre}
                      onChange={(e) => set("genre", e.currentTarget.value)}
                      disabled={pending}
                    />
                  </div>

                  <Field
                    label="Author email"
                    type="email"
                    required
                    autoComplete="off"
                    value={form.email}
                    onChange={(e) => set("email", e.currentTarget.value)}
                    disabled={pending}
                  />

                  <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                    <Field
                      label="Head agent"
                      required
                      autoComplete="off"
                      value={form.headAgent}
                      onChange={(e) => set("headAgent", e.currentTarget.value)}
                      disabled={pending}
                    />
                    <Field
                      label="Head agent email"
                      type="email"
                      required
                      autoComplete="off"
                      value={form.headAgentEmail}
                      onChange={(e) => set("headAgentEmail", e.currentTarget.value)}
                      disabled={pending}
                    />
                  </div>

                  <Field
                    label="Assigned assistant"
                    required
                    autoComplete="off"
                    value={form.assignedAssistant}
                    onChange={(e) => set("assignedAssistant", e.currentTarget.value)}
                    disabled={pending}
                  />

                  <div
                    className="pt-4"
                    style={{ borderTop: "1px solid var(--color-rule-soft)" }}
                  >
                    <FileUploadControl />
                  </div>

                  <div
                    className="pt-1"
                    style={{
                      borderTop: "1px solid var(--color-rule-soft)",
                      marginTop: "0.25rem",
                    }}
                  >
                    <div className="pt-4 flex items-center justify-between gap-4">
                      <AnimatePresence mode="wait">
                        {error && (
                          <motion.span
                            key="err"
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-[0.85rem] font-sans"
                            style={{ color: "var(--color-wine)" }}
                          >
                            {error}
                          </motion.span>
                        )}
                        {!error && <span />}
                      </AnimatePresence>

                      <motion.button
                        type="submit"
                        disabled={pending}
                        whileTap={{ scale: 0.985 }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-[0.85rem] smallcaps text-paper bg-ink hover:bg-forest transition-colors disabled:opacity-60"
                      >
                        {pending
                          ? "Saving…"
                          : isEdit
                            ? "Save changes"
                            : "Save author"}
                        {!pending && <span aria-hidden="true">→</span>}
                      </motion.button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
