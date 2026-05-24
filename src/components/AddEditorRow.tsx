"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { createEditorAction } from "@/app/actions";
import type { EditorOutreachRecord } from "@/lib/editorOutreach";

type Props = {
  authorId: string;
  onAdded: (editor: EditorOutreachRecord) => void;
};

type Form = {
  editorFirstName: string;
  editorLastName: string;
  editorEmail: string;
  publishingHouse: string;
};

const EMPTY: Form = {
  editorFirstName: "",
  editorLastName: "",
  editorEmail: "",
  publishingHouse: "",
};

export function AddEditorRow({ authorId, onAdded }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firstRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (error) setError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.editorFirstName.trim()) { setError("First name required."); return; }
    if (!form.editorLastName.trim()) { setError("Last name required."); return; }
    startTransition(async () => {
      const r = await createEditorAction({ authorId, ...form });
      if (!r.ok) { setError(r.error); return; }
      onAdded(r.editor);
      setForm(EMPTY);
      setError(null);
      firstRef.current?.focus();
    });
  }

  return (
    <tr>
      <td colSpan={5} className="pt-2 pb-1 px-3">
        <form onSubmit={onSubmit} noValidate>
          <div className="flex flex-wrap items-start gap-2">
            <input
              ref={firstRef}
              placeholder="First name *"
              value={form.editorFirstName}
              onChange={(e) => set("editorFirstName", e.currentTarget.value)}
              disabled={pending}
              className="min-w-[100px] flex-1 bg-transparent border-b text-[0.85rem] px-0 py-1 focus:outline-none placeholder:text-ink-muted/50"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
            <input
              placeholder="Last name *"
              value={form.editorLastName}
              onChange={(e) => set("editorLastName", e.currentTarget.value)}
              disabled={pending}
              className="min-w-[100px] flex-1 bg-transparent border-b text-[0.85rem] px-0 py-1 focus:outline-none placeholder:text-ink-muted/50"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
            <input
              placeholder="Email"
              type="email"
              value={form.editorEmail}
              onChange={(e) => set("editorEmail", e.currentTarget.value)}
              disabled={pending}
              className="min-w-[120px] flex-1 bg-transparent border-b text-[0.85rem] px-0 py-1 focus:outline-none placeholder:text-ink-muted/50"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
            <input
              placeholder="Publishing house"
              value={form.publishingHouse}
              onChange={(e) => set("publishingHouse", e.currentTarget.value)}
              disabled={pending}
              className="min-w-[120px] flex-1 bg-transparent border-b text-[0.85rem] px-0 py-1 focus:outline-none placeholder:text-ink-muted/50"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
            <motion.button
              type="submit"
              disabled={pending}
              whileTap={{ scale: 0.985 }}
              className="px-3.5 py-1.5 text-[0.78rem] smallcaps text-paper bg-ink hover:bg-forest transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {pending ? "Adding…" : "Add editor"}
            </motion.button>
          </div>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1.5 text-[0.78rem]"
                style={{ color: "var(--color-wine)" }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </td>
    </tr>
  );
}
