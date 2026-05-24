"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  pending,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(26,23,20,0.55)" }}
            onClick={onCancel}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label={title}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.24, ease: [0.2, 0.6, 0.2, 1] }}
              className="pointer-events-auto w-full max-w-[400px] px-7 py-6 shadow-[0_32px_80px_-20px_rgba(26,23,20,0.55)]"
              style={{
                background: "var(--color-paper)",
                border: "1px solid var(--color-rule)",
              }}
            >
              <h2
                className="font-serif text-[1.4rem] leading-tight"
                style={{ color: "var(--color-ink)" }}
              >
                {title}
              </h2>
              <p
                className="mt-2.5 text-[0.9rem] font-sans leading-relaxed"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {message}
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={pending}
                  className="px-4 py-2 text-[0.82rem] smallcaps transition-colors disabled:opacity-60"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  onClick={onConfirm}
                  disabled={pending}
                  whileTap={{ scale: 0.985 }}
                  className="px-5 py-2 text-[0.82rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors disabled:opacity-60"
                >
                  {pending ? "Deleting…" : confirmLabel}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
