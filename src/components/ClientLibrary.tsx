"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { AuthorRecord } from "@/lib/authors";
import { AddAuthorModal } from "./AddAuthorModal";
import { AgencyNameInput } from "./AgencyNameInput";
import { AuthorTableRow } from "./AuthorTableRow";

type Props = {
  authors: AuthorRecord[];
  authorsError: string | null;
  agencyName: string;
  onAgencyNameSaved: (value: string) => void;
  onAdded: (a: AuthorRecord) => void;
  onUpdated: (a: AuthorRecord) => void;
  onDeleted: (id: string) => void;
};

export function ClientLibrary({
  authors,
  authorsError,
  agencyName,
  onAgencyNameSaved,
  onAdded,
  onUpdated,
  onDeleted,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AuthorRecord | null>(null);

  function openAdd() {
    setEditTarget(null);
    setModalOpen(true);
  }
  function openEdit(author: AuthorRecord) {
    setEditTarget(author);
    setModalOpen(true);
  }
  function handleSaved(author: AuthorRecord) {
    if (editTarget) onUpdated(author);
    else onAdded(author);
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      {/* Page header */}
      <div
        className="px-6 sm:px-10 lg:px-14 pt-10 pb-7 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-rule-soft)" }}
      >
        <div className="flex flex-wrap items-start gap-y-5 gap-x-8 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 pr-2">
              <h1
                className="font-serif text-[2rem] sm:text-[2.5rem] leading-none whitespace-nowrap"
                style={{ color: "var(--color-ink)" }}
              >
                Client Library:
              </h1>
              <AgencyNameInput
                initialValue={agencyName}
                onSaved={onAgencyNameSaved}
              />
            </div>
            <p
              className="mt-2 font-sans text-[0.9rem]"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Track authors, submissions, editor interest, deal memos, and
              payments.
            </p>
          </div>

          <motion.button
            type="button"
            onClick={openAdd}
            whileTap={{ scale: 0.985 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[0.85rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors mt-1"
          >
            + Add Author
          </motion.button>
        </div>
      </div>

      {/* Author list */}
      <div className="flex-1 min-h-0">
        {authorsError && authors.length === 0 ? (
          <div
            className="px-6 sm:px-10 lg:px-14 py-10 text-[0.9rem] font-sans"
            style={{ color: "var(--color-wine)" }}
          >
            {authorsError}
          </div>
        ) : authors.length === 0 ? (
          <EmptyState onAddClick={openAdd} />
        ) : (
          <AnimatePresence initial={false}>
            {authors.map((author) => (
              <motion.div
                key={author.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
                className="px-6 sm:px-10 lg:px-14"
              >
                <AuthorTableRow
                  author={author}
                  onEdit={openEdit}
                  onDeleted={onDeleted}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AddAuthorModal
        open={modalOpen}
        author={editTarget}
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
