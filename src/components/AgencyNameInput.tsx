"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { updateAgencyNameAction } from "@/app/actions";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  initialValue: string;
  /** Notified with the trimmed value the server confirmed. */
  onSaved: (value: string) => void;
};

const DEBOUNCE_MS = 650;
const SAVED_FLASH_MS = 1400;
const ERROR_FLASH_MS = 3200;

export function AgencyNameInput({ initialValue, onSaved }: Props) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    [],
  );

  // Debounced auto-save on every keystroke. We only save if the trimmed value
  // actually differs from what the server last confirmed, so opening a saved
  // value and tabbing away doesn't re-save it.
  useEffect(() => {
    const next = value.trim();
    if (next === savedValue) return;

    const id = setTimeout(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setStatus("saving");

      const result = await updateAgencyNameAction(value);
      inFlightRef.current = false;

      if (result.ok) {
        setSavedValue(result.agencyName);
        onSaved(result.agencyName);
        setStatus("saved");
        flashTimerRef.current = setTimeout(
          () => setStatus("idle"),
          SAVED_FLASH_MS,
        );
      } else {
        setStatus("error");
        flashTimerRef.current = setTimeout(
          () => setStatus("idle"),
          ERROR_FLASH_MS,
        );
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [value, savedValue, onSaved]);

  const statusText =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Couldn't save"
          : "";

  return (
    <div className="relative flex-1 min-w-[160px] sm:min-w-[260px]">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        placeholder="Agency Name"
        aria-label="Agency Name"
        spellCheck={false}
        autoComplete="off"
        className="w-full bg-transparent font-serif italic text-[1.7rem] sm:text-[2.2rem] leading-none px-0 py-1 outline-none border-b transition-colors focus:border-ink"
        style={{
          color: "var(--color-ink)",
          borderColor: "var(--color-rule)",
        }}
      />
      <div
        aria-live="polite"
        className="absolute right-0 -bottom-5 smallcaps text-[0.68rem] pointer-events-none select-none"
      >
        <AnimatePresence mode="wait">
          {statusText && (
            <motion.span
              key={statusText}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -1 }}
              transition={{ duration: 0.22 }}
              style={{
                color:
                  status === "error"
                    ? "var(--color-wine)"
                    : "var(--color-ink-muted)",
              }}
            >
              {statusText}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
