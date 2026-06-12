"use client";

import { motion, AnimatePresence } from "framer-motion";

export const MAX_REVISION_INSTRUCTION = 1000;

const DEFAULT_PLACEHOLDER =
  "Try: “Make this warmer,” “Make it more formal,” “Shorten this,” or “Mention the publisher is sometimes slow.”";

type Props = {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isRefining: boolean;
  error: string | null;
  success: boolean;
  placeholder?: string;
};

/**
 * The LLM "Edit Email" panel: appears once an email exists, takes a free-text
 * instruction, and reports loading / success / error states. Shared across the
 * email-composing tabs; the OpenAI call happens server-side via the caller.
 */
export function EmailRevisionPanel({
  visible,
  value,
  onChange,
  onSubmit,
  isRefining,
  error,
  success,
  placeholder = DEFAULT_PLACEHOLDER,
}: Props) {
  const canSubmit = value.trim().length > 0 && !isRefining;

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          key="refine-panel"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.42, ease: [0.2, 0.6, 0.2, 1], delay: 0.05 }}
          style={{ transformOrigin: "top" }}
          className="mt-5 border border-rule-soft bg-paper-soft px-5 py-5"
        >
          <div className="flex items-center gap-3 mb-2.5">
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--color-bronze)" }}
            />
            <h3 className="smallcaps text-[0.82rem] text-ink-muted">
              Revise with Plato
            </h3>
          </div>
          <p className="font-serif italic text-[1.02rem] leading-snug text-ink-soft mb-3.5">
            Looking for something different? Tell me here and I&rsquo;ll edit the
            email.
          </p>

          <div className="relative">
            <textarea
              value={value}
              onChange={(e) => onChange(e.currentTarget.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              disabled={isRefining}
              maxLength={MAX_REVISION_INSTRUCTION}
              rows={3}
              placeholder={placeholder}
              className="w-full bg-paper border border-rule-soft px-4 py-3 font-serif text-[1.02rem] leading-[1.6] text-ink placeholder:text-ink-muted/55 resize-none focus:outline-none focus:border-ink/60 transition-colors disabled:opacity-60"
              spellCheck
            />
            <AnimatePresence>
              {value.length > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute bottom-2 right-3 text-[0.7rem] tabular-nums text-ink-muted/70"
                >
                  {value.length}/{MAX_REVISION_INSTRUCTION}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-4">
            <div className="min-h-[1.25rem] text-[0.9rem] leading-tight">
              <AnimatePresence mode="wait" initial={false}>
                {error ? (
                  <motion.span
                    key="refine-err"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.24 }}
                    className="text-wine"
                  >
                    {error}
                  </motion.span>
                ) : success ? (
                  <motion.span
                    key="refine-ok"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.24 }}
                    className="inline-flex items-center gap-1.5 italic font-serif"
                    style={{ color: "var(--color-forest)" }}
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
                    Plato revised your email.
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            <motion.button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              whileTap={{ scale: canSubmit ? 0.985 : 1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[0.85rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefining ? (
                <>
                  <motion.svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.35"
                      strokeWidth="2"
                    />
                    <path
                      d="M8 2 a6 6 0 0 1 6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </motion.svg>
                  <span>Editing</span>
                </>
              ) : (
                <>
                  <span>Edit email</span>
                  <span aria-hidden="true">→</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
