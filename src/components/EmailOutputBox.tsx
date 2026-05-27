"use client";

import { motion, AnimatePresence } from "framer-motion";
import { forwardRef } from "react";

type Props = {
  email: string | null;
  onCopy: () => void;
  copied: boolean;
  /** Brief highlight + "Revised by Plato" pill after an LLM revision lands. */
  revised: boolean;
  onChange: (value: string) => void;
  title?: string;
};

/**
 * The reveal-on-generate output window: a copyable, editable email with a copy
 * button and a success state. Shared by every email-composing tab so they stay
 * visually identical.
 */
export const EmailOutputBox = forwardRef<HTMLTextAreaElement, Props>(
  function EmailOutputBox(
    { email, onCopy, copied, revised, onChange, title = "Composed email" },
    ref,
  ) {
    return (
      <AnimatePresence>
        {email && (
          <motion.section
            key="email-reveal"
            initial={{ opacity: 0, y: -8, scaleY: 0.98 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.98 }}
            transition={{ duration: 0.45, ease: [0.2, 0.6, 0.2, 1] }}
            style={{ transformOrigin: "top" }}
            className="relative mt-3 border-t border-rule pt-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--color-wine)" }}
                />
                <h3 className="smallcaps text-[0.82rem] text-ink-muted">
                  {title}
                </h3>
                <AnimatePresence>
                  {revised && (
                    <motion.span
                      key="revised-pill"
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.6, 0.2, 1] }}
                      className="inline-flex items-center gap-1 smallcaps text-[0.72rem]"
                      style={{ color: "var(--color-forest)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12">
                        <path
                          d="M2 6.5 L5 9 L10 3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Revised by Plato
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <motion.button
                type="button"
                onClick={onCopy}
                whileTap={{ scale: 0.985 }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-[0.8rem] smallcaps border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="copied"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.18 }}
                      className="inline-flex items-center gap-1.5"
                    >
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
                      Copied
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.18 }}
                    >
                      Copy email
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            <div className="relative">
              <motion.textarea
                ref={ref}
                value={email}
                onChange={(e) => onChange(e.currentTarget.value)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.4 }}
                rows={Math.max(9, email.split("\n").length + 1)}
                className="w-full bg-paper-soft border border-rule-soft px-5 py-5 font-serif text-[1.12rem] leading-[1.7] text-ink resize-none focus:outline-none focus:border-ink/60 transition-colors whitespace-pre-wrap"
                spellCheck={false}
              />
              <AnimatePresence>
                {revised && (
                  <motion.span
                    key="revise-pulse"
                    aria-hidden="true"
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    className="pointer-events-none absolute inset-0"
                    style={{ background: "rgba(15,42,31,0.10)" }}
                  />
                )}
              </AnimatePresence>
            </div>
            <div className="mt-2 text-[0.8rem] italic text-ink-muted">
              The text is yours to edit before pasting into your email client.
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    );
  },
);
