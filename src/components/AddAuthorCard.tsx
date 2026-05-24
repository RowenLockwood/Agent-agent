"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { createAuthorAction } from "@/app/actions";
import type { AuthorRecord } from "@/lib/authors";
import { Field } from "./Field";

type Props = {
  onSaved: (author: AuthorRecord) => void;
};

type FormState = {
  name: string;
  email: string;
  headAgent: string;
  title: string;
  editor: string;
  publisher: string;
};

const EMPTY: FormState = {
  name: "",
  email: "",
  headAgent: "",
  title: "",
  editor: "",
  publisher: "",
};

export function AddAuthorCard({ onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update<K extends keyof FormState>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    if (error) setError(null);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const name = form.name.trim();
    if (!name) {
      setError("Author name is required.");
      nameRef.current?.focus();
      return;
    }

    startTransition(async () => {
      const result = await createAuthorAction({
        name,
        email: form.email,
        headAgent: form.headAgent,
        title: form.title,
        editor: form.editor,
        publisher: form.publisher,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm(EMPTY);
      setSuccess(`${result.author.name} added to your list.`);
      onSaved(result.author);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(null), 3200);
      nameRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field
        ref={nameRef}
        label="Author"
        required
        autoComplete="off"
        value={form.name}
        onChange={(e) => update("name", e.currentTarget.value)}
        disabled={pending}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="off"
        value={form.email}
        onChange={(e) => update("email", e.currentTarget.value)}
        disabled={pending}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field
          label="Head agent"
          autoComplete="off"
          value={form.headAgent}
          onChange={(e) => update("headAgent", e.currentTarget.value)}
          disabled={pending}
        />
        <Field
          label="Title"
          autoComplete="off"
          value={form.title}
          onChange={(e) => update("title", e.currentTarget.value)}
          disabled={pending}
        />
        <Field
          label="Editor"
          autoComplete="off"
          value={form.editor}
          onChange={(e) => update("editor", e.currentTarget.value)}
          disabled={pending}
        />
        <Field
          label="Publisher"
          autoComplete="off"
          value={form.publisher}
          onChange={(e) => update("publisher", e.currentTarget.value)}
          disabled={pending}
        />
      </div>

      <div className="pt-1 flex items-center justify-between gap-4">
        <div className="min-h-[1.25rem] text-[0.82rem] leading-tight">
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
            {success && !error && (
              <motion.span
                key="ok"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.28 }}
                className="text-forest italic font-serif text-[0.95rem]"
              >
                {success}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="submit"
          disabled={pending}
          whileTap={{ scale: 0.985 }}
          className="group relative inline-flex items-center gap-2 px-5 py-2 text-[0.78rem] smallcaps text-paper bg-ink hover:bg-forest transition-colors disabled:opacity-60"
        >
          <span>{pending ? "Saving" : "Save author"}</span>
          <span aria-hidden="true" className="inline-block">
            <AnimatePresence mode="wait" initial={false}>
              {pending ? (
                <motion.span
                  key="dot"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="inline-block w-1.5 h-1.5 rounded-full bg-paper"
                  style={{
                    animation: "platoPulse 1.1s ease-in-out infinite",
                  }}
                />
              ) : (
                <motion.span
                  key="arrow"
                  initial={{ opacity: 0, x: -2 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 2 }}
                  transition={{ duration: 0.18 }}
                  className="inline-block"
                >
                  →
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.button>
      </div>
      <style>{`
        @keyframes platoPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </form>
  );
}
