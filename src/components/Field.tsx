"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";

type BaseProps = {
  label: string;
  hint?: string;
  required?: boolean;
  /** Show a brief highlight pulse when the value changes (e.g. auto-fill). */
  highlightOnChange?: boolean;
};

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export const Field = forwardRef<HTMLInputElement, InputProps>(function Field(
  { label, hint, required, highlightOnChange, className, value, onFocus, onBlur, onChange, ...rest },
  ref,
) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [pulseKey, setPulseKey] = useState<string | number>(0);

  return (
    <div className="group relative pt-1">
      <label
        htmlFor={id}
        className="smallcaps block text-[0.78rem] text-ink-muted mb-1.5 transition-colors duration-300"
        data-active={focused ? "true" : "false"}
        style={{ color: focused ? "var(--color-wine)" : undefined }}
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
          ref={ref}
          value={value}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onChange={(e) => {
            if (highlightOnChange) setPulseKey(String(e.currentTarget.value));
            onChange?.(e);
          }}
          aria-required={required || undefined}
          className={
            "w-full bg-transparent border-0 border-b border-rule px-0 py-2 text-[1.05rem] text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-0 transition-colors " +
            (className ?? "")
          }
        />
        {/* Animated focus underline */}
        <motion.span
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 h-px origin-left bg-ink"
          initial={false}
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.36, ease: [0.2, 0.6, 0.2, 1] }}
        />
        {/* Auto-fill highlight pulse */}
        <AnimatePresence>
          {highlightOnChange && (
            <motion.span
              key={pulseKey}
              aria-hidden="true"
              initial={{ opacity: 0.55 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="pointer-events-none absolute -inset-x-1 -inset-y-0.5 rounded-sm"
              style={{ background: "rgba(138,106,50,0.10)" }}
            />
          )}
        </AnimatePresence>
      </div>
      {hint && (
        <p className="mt-1.5 text-[0.82rem] text-ink-muted italic">{hint}</p>
      )}
    </div>
  );
});

type SelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement>;

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(
  function SelectField(
    { label, hint, required, children, className, onFocus, onBlur, ...rest },
    ref,
  ) {
    const id = useId();
    const [focused, setFocused] = useState(false);

    return (
      <div className="group relative pt-1">
        <label
          htmlFor={id}
          className="smallcaps block text-[0.78rem] text-ink-muted mb-1.5 transition-colors duration-300"
          style={{ color: focused ? "var(--color-wine)" : undefined }}
        >
          {label}
          {required && (
            <span className="ml-1 text-wine" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <div className="relative">
          <select
            id={id}
            ref={ref}
            {...rest}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className={
              "select-arrow w-full appearance-none bg-transparent border-0 border-b border-rule pl-0 pr-6 py-2 text-[1.05rem] text-ink focus:outline-none focus:ring-0 cursor-pointer " +
              (className ?? "")
            }
          >
            {children}
          </select>
          <motion.span
            aria-hidden="true"
            className="absolute left-0 right-0 bottom-0 h-px origin-left bg-ink"
            initial={false}
            animate={{ scaleX: focused ? 1 : 0 }}
            transition={{ duration: 0.36, ease: [0.2, 0.6, 0.2, 1] }}
          />
        </div>
        {hint && (
          <p className="mt-1.5 text-[0.82rem] text-ink-muted italic">{hint}</p>
        )}
      </div>
    );
  },
);
