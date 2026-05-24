"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, useTransition, type FormEvent } from "react";
import type { CreateEditorResult } from "@/app/actions";

export type EditorFormValues = {
  editorFirstName: string;
  editorLastName: string;
  editorEmail: string;
  publishingHouse: string;
};

const EMPTY: EditorFormValues = {
  editorFirstName: "",
  editorLastName: "",
  editorEmail: "",
  publishingHouse: "",
};

type Props = {
  initial?: EditorFormValues;
  submitLabel: string;
  onSubmit: (values: EditorFormValues) => Promise<CreateEditorResult>;
  onDone: () => void;
  onCancel?: () => void;
  /** Reset to empty and keep the form open after a successful submit. */
  resetOnSuccess?: boolean;
};

const FIELDS: { key: keyof EditorFormValues; placeholder: string; type?: string }[] = [
  { key: "editorFirstName", placeholder: "First name *" },
  { key: "editorLastName", placeholder: "Last name *" },
  { key: "editorEmail", placeholder: "Email *", type: "email" },
  { key: "publishingHouse", placeholder: "Publishing house *" },
];

export function EditorForm({
  initial,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
  resetOnSuccess,
}: Props) {
  const [form, setForm] = useState<EditorFormValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firstRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof EditorFormValues>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (error) setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.editorFirstName.trim()) { setError("First name is required."); return; }
    if (!form.editorLastName.trim()) { setError("Last name is required."); return; }
    if (!form.editorEmail.trim()) { setError("Email is required."); return; }
    if (!form.publishingHouse.trim()) { setError("Publishing house is required."); return; }
    startTransition(async () => {
      const r = await onSubmit(form);
      if (!r.ok) { setError(r.error); return; }
      if (resetOnSuccess) {
        setForm(EMPTY);
        firstRef.current?.focus();
      }
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {FIELDS.map((f, i) => (
          <input
            key={f.key}
            ref={i === 0 ? firstRef : undefined}
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            value={form[f.key]}
            onChange={(e) => set(f.key, e.currentTarget.value)}
            disabled={pending}
            className="bg-transparent border-b text-[0.85rem] px-0 py-1.5 focus:outline-none placeholder:text-ink-muted/50"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <motion.button
          type="submit"
          disabled={pending}
          whileTap={{ scale: 0.985 }}
          className="px-3.5 py-1.5 text-[0.78rem] smallcaps text-paper bg-ink hover:bg-forest transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </motion.button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="text-[0.78rem] smallcaps disabled:opacity-60"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Cancel
          </button>
        )}
        <AnimatePresence>
          {error && (
            <motion.span
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[0.78rem]"
              style={{ color: "var(--color-wine)" }}
            >
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
