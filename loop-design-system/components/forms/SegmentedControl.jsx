import React from "react";

/**
 * Loop SegmentedControl — a small paper toggle between a few related views,
 * e.g. switching a chapter between "Timeline" and "People". The selected
 * segment rises on a soft white pill; the track is a sunk well.
 */
export function SegmentedControl({ options = [], value, onChange, style }) {
  const wrap = {
    display: "inline-flex",
    padding: 3,
    gap: 2,
    background: "var(--surface)",
    borderRadius: "var(--radius-full)",
    boxShadow: "var(--shadow-inset)",
    fontFamily: "var(--font-sans)",
    ...style,
  };
  return (
    <div style={wrap} role="tablist">
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const lbl = typeof opt === "string" ? opt : opt.label;
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(v)}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              borderRadius: "var(--radius-full)",
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              background: active ? "var(--bg)" : "transparent",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              transition: "all var(--duration-fast) var(--ease-out)",
            }}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  );
}
