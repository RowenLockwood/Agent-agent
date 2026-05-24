"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

export function FileUploadControl() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (file) setFilename(file.name);
    // Reset so the same file can be re-selected
    e.currentTarget.value = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2.5 px-4 py-2 border text-[0.82rem] font-sans transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-bronze"
        style={{
          borderColor: "var(--color-rule)",
          color: "var(--color-ink-muted)",
          borderStyle: "dashed",
          cursor: "default",
          opacity: 0.7,
        }}
        aria-describedby="upload-hint"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1v8M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1 10v1.5A1.5 1.5 0 002.5 13h9a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Upload Editor List
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <AnimatePresence mode="wait">
        {filename ? (
          <motion.p
            key="file"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[0.75rem] font-sans italic"
            style={{ color: "var(--color-ink-muted)" }}
            id="upload-hint"
          >
            "{filename}" — import parsing not enabled yet.
          </motion.p>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[0.75rem] font-sans italic"
            style={{ color: "var(--color-ink-muted)" }}
            id="upload-hint"
          >
            File parsing coming soon.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
