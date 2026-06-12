"use client";

import type { ReactNode } from "react";

type Props = {
  title?: string;
  message: ReactNode;
};

/**
 * Quiet "this section is locked" notice. Used by Contract Details (and any
 * other section that's gated behind a stage). Matches the editorial palette:
 * thin rule, parchment-soft background, padlock glyph, muted ink copy.
 */
export function LockedSectionNotice({ title, message }: Props) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-[3px] px-4 py-3.5"
      style={{
        border: "1px solid var(--color-rule-soft)",
        background: "var(--color-paper-soft)",
        color: "var(--color-ink-muted)",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden="true"
        className="mt-0.5 flex-shrink-0"
        style={{ color: "var(--color-ink-muted)" }}
      >
        <path
          d="M3.5 6V4.25a3.5 3.5 0 017 0V6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <rect
          x="2.25"
          y="6"
          width="9.5"
          height="6.5"
          rx="0.8"
          fill="currentColor"
          fillOpacity="0.85"
        />
      </svg>
      <div className="flex flex-col gap-0.5">
        {title && (
          <span
            className="smallcaps text-[0.72rem]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {title}
          </span>
        )}
        <span className="font-serif italic text-[0.96rem] leading-snug">
          {message}
        </span>
      </div>
    </div>
  );
}
