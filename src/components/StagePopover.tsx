"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };

type Props = {
  /** The trigger element (the diamond button). */
  trigger: ReactNode;
  options: Option[];
  currentValue: string;
  onChange: (value: string) => void;
  /** If locked, the trigger shows gray and no popover opens. */
  locked?: boolean;
  lockReason?: string;
  /** Tooltip text for the stage name (shown on hover even when locked). */
  stageLabel: string;
  disabled?: boolean;
};

export function StagePopover({
  trigger,
  options,
  currentValue,
  onChange,
  locked,
  lockReason,
  stageLabel,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      top: r.top - 8, // will be adjusted with translate
      left: r.left + r.width / 2,
    });
  }, []);

  function openPopover() {
    if (locked || disabled) return;
    calcPos();
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !popoverRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const popoverContent = mounted ? createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          key="popover"
          role="listbox"
          aria-label={`${stageLabel} options`}
          initial={{ opacity: 0, y: 4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.2, 0.6, 0.2, 1] }}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
            minWidth: 150,
          }}
          className="bg-paper border border-rule shadow-[0_12px_32px_-12px_rgba(26,23,20,0.45)] py-1"
        >
          {options.map((opt) => {
            const isSelected = opt.value === currentValue;
            return (
              <button
                key={opt.value}
                role="option"
                type="button"
                aria-selected={isSelected}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full text-left px-3.5 py-2 text-[0.85rem] font-sans flex items-center gap-2.5 focus:outline-none"
                style={{
                  color: isSelected ? "var(--color-wine)" : "var(--color-ink)",
                  backgroundColor: isSelected ? "rgba(107,26,37,0.06)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(107,26,37,0.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = isSelected
                    ? "rgba(107,26,37,0.06)"
                    : "transparent";
                }}
              >
                {isSelected && (
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                    <path d="M1 4.5L3 6.5L7 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
                {!isSelected && <span className="w-2" />}
                {opt.label}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null;

  // Tooltip for stage label (and lock reason)
  const tooltipContent = mounted ? createPortal(
    <AnimatePresence>
      {tooltip && !open && (
        <motion.div
          key="tooltip"
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          style={{
            position: "fixed",
            top: (triggerRef.current?.getBoundingClientRect().top ?? 0) - 6,
            left: (triggerRef.current?.getBoundingClientRect().left ?? 0) +
              (triggerRef.current?.getBoundingClientRect().width ?? 0) / 2,
            transform: "translate(-50%, -100%)",
            zIndex: 9998,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            background: "var(--color-ink)",
            color: "var(--color-paper)",
          } as React.CSSProperties}
          className="px-2.5 py-1 text-[0.72rem] font-sans rounded-sm"
        >
          {locked && lockReason ? lockReason : stageLabel}
          {/* small arrow */}
          <span
            className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-0 h-0"
            style={{
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: `4px solid var(--color-ink)`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        onFocus={() => setTooltip(true)}
        onBlur={() => setTooltip(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${stageLabel}: ${options.find((o) => o.value === currentValue)?.label ?? currentValue}`}
        disabled={disabled}
        className="focus:outline-none focus-visible:ring-1 focus-visible:ring-bronze rounded-sm"
        style={{ cursor: locked || disabled ? "default" : "pointer" }}
      >
        {trigger}
      </button>
      {popoverContent}
      {tooltipContent}
    </>
  );
}
