import React from "react";

/**
 * Loop Tag — a soft, low-contrast label for chapters, places, and quiet
 * status. Tinted paper, no hard border. Never a loud status dot.
 */
export function Tag({ children, tone = "neutral", icon = null, style }) {
  const tones = {
    neutral: { bg: "var(--surface-raised)", fg: "var(--text-secondary)" },
    chapter: { bg: "var(--terracotta-faint)", fg: "var(--accent-hover)" },
    people: { bg: "var(--rose-faint)", fg: "#9C6E5C" },
    positive: { bg: "var(--sage-faint)", fg: "#4C7353" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: icon ? "4px 11px 4px 9px" : "4px 11px",
        background: t.bg,
        color: t.fg,
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
        borderRadius: "var(--radius-full)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
      {children}
    </span>
  );
}
