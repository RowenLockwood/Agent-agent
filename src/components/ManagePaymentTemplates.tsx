"use client";

import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import {
  deletePaymentEmailTemplateAction,
  renamePaymentEmailTemplateAction,
  setAgencyDefaultPaymentEmailTemplateAction,
} from "@/app/paymentEmailActions";
import type { PaymentEmailTemplateRecord } from "@/lib/paymentEmail/types";

type Props = {
  templates: PaymentEmailTemplateRecord[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onBuildNew: () => void;
  onDuplicate: (t: PaymentEmailTemplateRecord) => void;
  onCreateVersion: (t: PaymentEmailTemplateRecord) => void;
  /** Called after a server-side change so the parent can re-fetch. */
  onChanged: (preferId?: string | null) => Promise<void>;
};

export function ManagePaymentTemplates({
  templates,
  onClose,
  onSelect,
  onBuildNew,
  onDuplicate,
  onCreateVersion,
  onChanged,
}: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rename(t: PaymentEmailTemplateRecord) {
    setRenaming(t.id);
    setRenameValue(t.name);
  }

  function commitRename(id: string) {
    const value = renameValue.trim();
    if (!value) {
      setError("Template name is required.");
      return;
    }
    startTransition(async () => {
      const r = await renamePaymentEmailTemplateAction(id, value);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setRenaming(null);
      setError(null);
      await onChanged(id);
    });
  }

  function deleteTpl(id: string) {
    startTransition(async () => {
      const r = await deletePaymentEmailTemplateAction(id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setConfirmDelete(null);
      await onChanged(null);
    });
  }

  function setDefault(id: string) {
    startTransition(async () => {
      const r = await setAgencyDefaultPaymentEmailTemplateAction(id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      await onChanged(id);
    });
  }

  return (
    <>
      <motion.div
        key="manage-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(26,23,20,0.55)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        key="manage-panel"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.3, ease: [0.2, 0.6, 0.2, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label="Manage Payment Email Templates"
        className="fixed inset-6 sm:inset-12 z-50 flex flex-col"
        style={{
          background: "var(--color-paper)",
          border: "1px solid var(--color-rule)",
          boxShadow: "0 32px 80px -20px rgba(26,23,20,0.55)",
        }}
      >
        <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b" style={{ borderColor: "var(--color-rule-soft)" }}>
          <h2 className="font-serif text-[1.75rem]" style={{ color: "var(--color-ink)" }}>
            Manage Payment Email Templates
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBuildNew}
              className="px-4 py-2 text-[0.78rem] smallcaps text-paper bg-ink hover:bg-forest transition-colors"
            >
              Build New Template
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[0.78rem] smallcaps border border-ink/40 text-ink hover:bg-ink hover:text-paper transition-colors"
            >
              Close
            </button>
          </div>
        </header>

        {error && (
          <div className="px-6 sm:px-10 pt-3 text-[0.88rem] text-wine">{error}</div>
        )}

        <div className="flex-1 min-h-0 overflow-auto px-6 sm:px-10 py-6">
          <div className="grid grid-cols-1 gap-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="border border-rule-soft rounded-[3px] px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-3"
                style={{ background: "var(--color-paper-soft)" }}
              >
                <div className="flex-1 min-w-[16rem]">
                  {renaming === t.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(t.id);
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        className="bg-transparent border-b border-rule px-1 py-1 font-serif text-[1.05rem] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => commitRename(t.id)}
                        disabled={pending}
                        className="text-[0.78rem] smallcaps text-paper bg-ink px-3 py-1"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenaming(null)}
                        className="text-[0.78rem] smallcaps text-ink-muted hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3
                      className="font-serif text-[1.15rem]"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {t.name}
                    </h3>
                  )}
                  <div
                    className="mt-1 text-[0.82rem] flex flex-wrap gap-x-3 gap-y-0.5"
                    style={{ color: "var(--color-ink-muted)" }}
                  >
                    {t.isSystemDefault && (
                      <span className="smallcaps text-bronze-deep">Plato default</span>
                    )}
                    {t.isAgencyDefault && (
                      <span className="smallcaps text-forest">Agency default</span>
                    )}
                    <span>v{t.versionNumber}</span>
                    <span>{`Updated ${formatDate(t.updatedAt)}`}</span>
                    {t.description && <span className="italic">{t.description}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className="px-3 py-1.5 text-[0.78rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors"
                  >
                    Use Template
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateVersion(t)}
                    className="px-3 py-1.5 text-[0.78rem] smallcaps border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
                  >
                    Create New Version
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(t)}
                    className="px-3 py-1.5 text-[0.78rem] smallcaps border border-ink/60 text-ink hover:bg-ink hover:text-paper transition-colors"
                  >
                    Duplicate
                  </button>
                  {!t.isAgencyDefault && (
                    <button
                      type="button"
                      onClick={() => setDefault(t.id)}
                      disabled={pending}
                      className="px-3 py-1.5 text-[0.78rem] smallcaps text-ink-muted hover:text-ink transition-colors"
                    >
                      Set as Agency Default
                    </button>
                  )}
                  {!t.isSystemDefault && (
                    <button
                      type="button"
                      onClick={() => rename(t)}
                      className="px-3 py-1.5 text-[0.78rem] smallcaps text-ink-muted hover:text-ink transition-colors"
                    >
                      Rename
                    </button>
                  )}
                  {!t.isSystemDefault && (
                    <button
                      type="button"
                      onClick={() =>
                        confirmDelete === t.id ? deleteTpl(t.id) : setConfirmDelete(t.id)
                      }
                      disabled={pending}
                      className="px-3 py-1.5 text-[0.78rem] smallcaps text-ink-muted hover:text-wine transition-colors"
                    >
                      {confirmDelete === t.id ? "Confirm Archive" : "Archive"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}
