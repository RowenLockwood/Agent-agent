"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { updateAgencyNameAction } from "@/app/actions";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  initialValue: string;
  /** Notified with the trimmed value the server confirmed. */
  onSaved: (value: string) => void;
};

const PLACEHOLDER = "Agency Name";
const DEBOUNCE_MS = 650;
const SAVED_FLASH_MS = 1400;
const ERROR_FLASH_MS = 3200;

// SSR-safe layout effect: layout effects warn and aren't useful on the server.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function AgencyNameInput({ initialValue, onSaved }: Props) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [width, setWidth] = useState<number | null>(null);

  const mirrorRef = useRef<HTMLSpanElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    [],
  );

  // Debounced auto-save. Skips when the trimmed value matches what the server
  // last confirmed, so opening the page and tabbing away doesn't re-save.
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

  // Size the input to fit its current value (or placeholder, when empty) by
  // measuring a hidden mirror span that shares the input's font properties.
  // The +2px buffer leaves room for the caret at the end of the line.
  useIsoLayoutEffect(() => {
    if (mirrorRef.current) {
      setWidth(mirrorRef.current.offsetWidth + 2);
    }
  }, [value]);

  const statusText =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Couldn't save"
          : "";

  return (
    <span className="relative inline-flex items-baseline">
      <span
        ref={mirrorRef}
        aria-hidden="true"
        className="invisible absolute top-0 left-0 font-serif text-[2rem] sm:text-[2.5rem] leading-none whitespace-pre"
      >
        {value || PLACEHOLDER}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        placeholder={PLACEHOLDER}
        aria-label="Agency Name"
        spellCheck={false}
        autoComplete="off"
        className="bg-transparent font-serif text-[2rem] sm:text-[2.5rem] leading-none px-0 py-0 outline-none border-0 placeholder:text-ink-muted placeholder:opacity-55"
        style={{
          color: "var(--color-ink)",
          width: width != null ? `${width}px` : "auto",
        }}
      />
      <span
        aria-live="polite"
        className="absolute -bottom-4 left-0 smallcaps text-[0.62rem] pointer-events-none select-none whitespace-nowrap"
      >
        <AnimatePresence mode="wait">
          {statusText && (
            <motion.span
              key={statusText}
              initial={{ opacity: 0, y: 1 }}
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
      </span>
    </span>
  );
}
