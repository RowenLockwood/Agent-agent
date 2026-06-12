"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { AuthorRecord } from "@/lib/authors";

export type AuthorSelection = {
  /** The author name to use in the email greeting. */
  name: string;
  /** Set when the name came from a Client Library author; null for free text. */
  selectedId: string | null;
};

type Props = {
  label: string;
  authors: AuthorRecord[];
  name: string;
  selectedId: string | null;
  onChange: (next: AuthorSelection) => void;
  required?: boolean;
  hint?: string;
  emptyHint?: string;
};

/**
 * A combobox over the Client Library: pick a saved author from the dropdown, or
 * type a name for someone not yet in the library. Picking reports the author's
 * id so the caller can auto-fill related fields; typing reports a null id.
 */
export function AuthorSelector({
  label,
  authors,
  name,
  selectedId,
  onChange,
  required,
  hint,
  emptyHint = "No saved authors yet — type a name, or add one in the Client Library.",
}: Props) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasAuthors = authors.length > 0;

  // Filter by typed text, but show the full roster once an author is chosen so
  // the picker stays browseable after a selection.
  const filtered = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q || selectedId) return authors;
    return authors.filter((a) =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q),
    );
  }, [authors, name, selectedId]);

  // Keep the highlighted option valid as the list filters / opens.
  useEffect(() => {
    if (!open) return;
    if (filtered.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const selIdx = selectedId
      ? filtered.findIndex((a) => a.id === selectedId)
      : -1;
    setActiveIndex(selIdx >= 0 ? selIdx : 0);
  }, [open, filtered, selectedId]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const choose = useCallback(
    (a: AuthorRecord) => {
      onChange({
        name: `${a.firstName} ${a.lastName}`.trim(),
        selectedId: a.id,
      });
      setOpen(false);
      inputRef.current?.focus();
    },
    [onChange],
  );

  function onType(value: string) {
    onChange({ name: value, selectedId: null });
    if (hasAuthors) setOpen(true);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        if (hasAuthors) setOpen(true);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      if (!open) return;
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (e.key === "Enter") {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        choose(filtered[activeIndex]);
      }
      return;
    }
    if (e.key === "Home" && open) {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End" && open) {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
    }
  }

  const labelActive = focused || open || name.trim().length > 0;

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

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-required={required || undefined}
          autoComplete="off"
          spellCheck={false}
          value={name}
          placeholder={
            hasAuthors ? "Select or type an author…" : "Type the author's name…"
          }
          onChange={(e) => onType(e.currentTarget.value)}
          onClick={() => {
            if (hasAuthors) setOpen(true);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent border-0 border-b border-rule pr-6 py-2 text-[1.05rem] text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-0 transition-colors"
        />
        {hasAuthors && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? "Close author list" : "Open author list"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen((v) => !v);
              inputRef.current?.focus();
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-muted"
          >
            <motion.span
              aria-hidden="true"
              className="inline-block"
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
          </button>
        )}
        <motion.span
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 h-px origin-left bg-ink"
          initial={false}
          animate={{ scaleX: focused || open ? 1 : 0 }}
          transition={{ duration: 0.36, ease: [0.2, 0.6, 0.2, 1] }}
        />
      </div>

      <AnimatePresence>
        {open && hasAuthors && (
          <motion.div
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scaleY: 0.98 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0.6, 0.2, 1] }}
            style={{ transformOrigin: "top" }}
            className="absolute z-20 mt-2 left-0 right-0 bg-paper-soft border border-rule shadow-[0_18px_40px_-22px_rgba(26,23,20,0.35)]"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[0.95rem] italic text-ink-muted">
                No saved author matches — “{name.trim()}” will be used as typed.
              </p>
            ) : (
              <ul className="max-h-64 overflow-auto py-1">
                {filtered.map((a, idx) => {
                  const isActive = idx === activeIndex;
                  const isSelected = a.id === selectedId;
                  return (
                    <li key={a.id} role="none">
                      <button
                        id={`${id}-opt-${a.id}`}
                        role="option"
                        type="button"
                        aria-selected={isSelected}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseDown={(e) => e.preventDefault()}
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
                          <span className="truncate">
                            {a.firstName} {a.lastName}
                          </span>
                          {a.headAgent && (
                            <span className="font-serif italic text-[0.95rem] text-ink-muted truncate">
                              {a.headAgent}
                            </span>
                          )}
                        </span>
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

      {hint && (
        <p className="mt-1.5 text-[0.82rem] text-ink-muted italic">{hint}</p>
      )}
      {!hasAuthors && (
        <p className="mt-1.5 text-[0.82rem] text-ink-muted italic">
          {emptyHint}
        </p>
      )}
    </div>
  );
}
