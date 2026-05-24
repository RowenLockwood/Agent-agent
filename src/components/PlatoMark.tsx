type Props = {
  className?: string;
};

// A small editorial fleuron / ornament used to mark sections and dividers.
// Hand-tuned SVG (not a stock icon) — three intersecting wedges with a center disk.
export function PlatoMark({ className }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      >
        <path d="M16 4 C 12 10, 12 14, 16 16 C 20 14, 20 10, 16 4 Z" />
        <path d="M4 16 C 10 12, 14 12, 16 16 C 14 20, 10 20, 4 16 Z" />
        <path d="M28 16 C 22 12, 18 12, 16 16 C 18 20, 22 20, 28 16 Z" />
        <path d="M16 28 C 12 22, 12 18, 16 16 C 20 18, 20 22, 16 28 Z" />
      </g>
      <circle cx="16" cy="16" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function HairlineRule({ className }: Props) {
  return (
    <div
      className={className}
      style={{
        height: "1px",
        backgroundImage:
          "linear-gradient(to right, transparent, var(--color-rule) 18%, var(--color-rule) 82%, transparent)",
      }}
    />
  );
}
