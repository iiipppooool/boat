/**
 * The wordmark. "Boat" is set in Fraunces at a light weight, "Xchange" at a
 * heavy one, so the join reads as a hinge rather than a compound word — and the
 * X, the only brass element, is the exchange itself.
 *
 * The mark beside it is a cleaver blade seen flat on: the asymmetric quadrilateral
 * every rower recognises from twenty metres away, with the shaft running off the
 * loom end. No abstract swoosh, no droplet.
 */
export function BladeMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* shaft */}
      <path d="M2 25 L13 14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      {/* collar */}
      <path d="M11.2 15.8 L14.2 12.8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {/* cleaver blade — square-ish tip, swept back toward the loom */}
      <path
        d="M13.6 13.4 L24.5 4.2 L29.4 12.1 L20.6 20.4 Z"
        fill="var(--brass-500)"
        stroke="var(--brass-600)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ size = "1.35rem" }: { size?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontFamily: "var(--font-display)",
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}
    >
      <BladeMark />
      <span>
        <span style={{ fontWeight: 300 }}>Boat</span>
        <span style={{ fontWeight: 700, color: "var(--brass-500)" }}>X</span>
        <span style={{ fontWeight: 700 }}>change</span>
      </span>
    </span>
  );
}
