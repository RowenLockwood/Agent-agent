"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { AuthorRecord } from "@/lib/authors";
import { AddAuthorModal } from "./AddAuthorModal";
import { AuthorTableRow } from "./AuthorTableRow";
import { FileUploadControl } from "./FileUploadControl";

type Props = {
  initialAuthors: AuthorRecord[];
  authorsError: string | null;
  onAuthorAdded: (a: AuthorRecord) => void;
};

export function ClientLibrary({ initialAuthors, authorsError, onAuthorAdded }: Props) {
  const [authors, setAuthors] = useState<AuthorRecord[]>(initialAuthors);
  const [modalOpen, setModalOpen] = useState(false);

  function handleSaved(author: AuthorRecord) {
    setAuthors((prev) => [author, ...prev.filter((a) => a.id !== author.id)]);
    onAuthorAdded(author);
  }

  // Keep in sync if parent adds authors (e.g. Payment Email is also adding — not in v1, but defensive)
  const merged = authors.length >= initialAuthors.length ? authors : initialAuthors;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      {/* Page header */}
      <div
        className="px-6 sm:px-10 lg:px-14 pt-10 pb-7 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-rule-soft)" }}
      >
        <div className="flex flex-wrap items-start gap-y-5 gap-x-8 justify-between">
          <div>
            <h1
              className="font-serif text-[2rem] sm:text-[2.5rem] leading-none"
              style={{ color: "var(--color-ink)" }}
            >
              Client Library
            </h1>
            <p
              className="mt-2 font-sans text-[0.9rem]"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Track authors, submissions, editor interest, deal memos, and
              payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-1">
            <FileUploadControl />
            <motion.button
              type="button"
              onClick={() => setModalOpen(true)}
              whileTap={{ scale: 0.985 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[0.85rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors"
            >
              + Add Author
            </motion.button>
          </div>
        </div>
      </div>

      {/* Author list */}
      <div className="flex-1 min-h-0">
        {authorsError && merged.length === 0 ? (
          <div
            className="px-6 sm:px-10 lg:px-14 py-10 text-[0.9rem] font-sans"
            style={{ color: "var(--color-wine)" }}
          >
            {authorsError}
          </div>
        ) : merged.length === 0 ? (
          <EmptyState onAddClick={() => setModalOpen(true)} />
        ) : (
          <div>
            {/* Column headers */}
            <div
              className="hidden sm:flex px-6 sm:px-10 lg:px-14 py-2.5 border-b"
              style={{ borderColor: "var(--color-rule-soft)" }}
            >
              <div className="flex-1">
                <span
                  className="smallcaps text-[0.67rem]"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  Author
                </span>
              </div>
              <div className="flex-shrink-0 pr-2">
                <span
                  className="smallcaps text-[0.67rem]"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  Pipeline
                </span>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {merged.map((author) => (
                <motion.div
                  key={author.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28 }}
                  className="px-6 sm:px-10 lg:px-14"
                >
                  <AuthorTableRow author={author} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AddAuthorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}

function EmptyState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <div
        className="w-10 h-10 rotate-45 border mb-8"
        style={{ borderColor: "var(--color-rule)", opacity: 0.6 }}
        aria-hidden="true"
      />
      <h2
        className="font-serif text-[1.5rem] leading-tight"
        style={{ color: "var(--color-ink-soft)" }}
      >
        No authors yet
      </h2>
      <p
        className="mt-2 text-[0.88rem] font-sans max-w-xs"
        style={{ color: "var(--color-ink-muted)" }}
      >
        Add your first author to begin tracking their publishing pipeline.
      </p>
      <button
        type="button"
        onClick={onAddClick}
        className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 text-[0.85rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors"
      >
        + Add Author
      </button>
    </motion.div>
  );
}
