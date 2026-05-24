"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AuthorRecord } from "@/lib/authors";

type Props = {
  label: string;
  authors: AuthorRecord[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Brief "newly added" pulse for an author id. */
  highlightId?: string | null;
  emptyHint?: string;
  required?: boolean;
};

export function AuthorPicker({
  label,
  authors,
  value,
  onChange,
  highlightId,
  emptyHint = "No authors yet — save one on the left.",
  required,
}: Props) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selected = useMemo(
    () => authors.find((a) => a.id === value) ?? null,
    [authors, value],
  );

  // Sync activeIndex to selection when opening.
  useEffect(() => {
    if (!open) return;
    if (selected) {
      const idx = authors.findIndex((a) => a.id === selected.id);
      setActiveIndex(idx >= 0 ? idx : 0);
    } else if (authors.length > 0) {
      setActiveIndex(0);
    }
  }, [open, selected, authors]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  const choose = useCallback(
    (next: AuthorRecord) => {
      onChange(next.id);
      close();
    },
    [onChange, close],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, authors.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(authors.length - 1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const target = authors[activeIndex];
      if (target) choose(target);
    }
  }

  const labelActive = open || !!selected;

  return (
    <div className="relative pt-1" ref={rootRef}>
      <label
        htmlFor={id}
        className="smallcaps block text-[0.78rem] text-ink-muted mb-1.5 transition-colors duration-300"
        style={{ color: labelActive ? "var(--color-wine)" : undefined }}
      >
        {label}
        {required && (
          <span className="ml-1 text-wine" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className="relative w-full text-left bg-transparent border-0 border-b border-rule pr-6 py-2 text-[1.05rem] cursor-pointer focus:outline-none"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={selected?.id ?? "placeholder"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.2, 0.6, 0.2, 1] }}
            className="inline-block"
            style={{
              color: selected ? "var(--color-ink)" : "var(--color-ink-muted)",
            }}
          >
            {selected ? selected.name : "Select an author…"}
          </motion.span>
        </AnimatePresence>
        <motion.span
          aria-hidden="true"
          className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-muted"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.28 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M2.5 4.5L6 8l3.5-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </motion.span>
        <motion.span
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 h-px origin-left bg-ink"
          initial={false}
          animate={{ scaleX: open ? 1 : 0 }}
          transition={{ duration: 0.36, ease: [0.2, 0.6, 0.2, 1] }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-activedescendant={
              authors[activeIndex]
                ? `${id}-opt-${authors[activeIndex].id}`
                : undefined
            }
            initial={{ opacity: 0, y: -6, scaleY: 0.98 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0.6, 0.2, 1] }}
            style={{ transformOrigin: "top" }}
            className="absolute z-20 mt-2 left-0 right-0 bg-paper-soft border border-rule shadow-[0_18px_40px_-22px_rgba(26,23,20,0.35)]"
          >
            {authors.length === 0 ? (
              <p className="px-3 py-3 text-[0.95rem] italic text-ink-muted">
                {emptyHint}
              </p>
            ) : (
              <ul className="max-h-64 overflow-auto py-1">
                {authors.map((a, idx) => {
                  const isActive = idx === activeIndex;
                  const isSelected = a.id === value;
                  const isNew = a.id === highlightId;
                  return (
                    <li key={a.id} role="none">
                      <button
                        id={`${id}-opt-${a.id}`}
                        role="option"
                        type="button"
                        aria-selected={isSelected}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => choose(a)}
                        className="relative w-full text-left px-3 py-2.5 text-[1.02rem] focus:outline-none transition-colors"
                        style={{
                          backgroundColor: isActive
                            ? "rgba(107,26,37,0.06)"
                            : "transparent",
                          color: "var(--color-ink)",
                        }}
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate">{a.name}</span>
                          {a.title && (
                            <span className="font-serif italic text-[0.95rem] text-ink-muted truncate">
                              {a.title}
                            </span>
                          )}
                        </span>
                        {isNew && (
                          <motion.span
                            aria-hidden="true"
                            initial={{ opacity: 0.4 }}
                            animate={{ opacity: 0 }}
                            transition={{
                              duration: 1.8,
                              ease: "easeOut",
                            }}
                            className="pointer-events-none absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(90deg, rgba(138,106,50,0.22), rgba(138,106,50,0) 70%)",
                            }}
                          />
                        )}
                        {isSelected && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-0 bottom-0 w-px"
                            style={{ background: "var(--color-wine)" }}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
