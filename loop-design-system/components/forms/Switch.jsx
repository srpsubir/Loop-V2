import React from "react";

/**
 * Loop Switch — a soft on/off toggle. Terracotta when on, paper well when off.
 * Used for quiet preferences ("Remind me about this crew").
 */
export function Switch({ checked = false, onChange, disabled = false, label, style }) {
  const track = {
    width: 42,
    height: 24,
    borderRadius: "var(--radius-full)",
    background: checked ? "var(--accent)" : "var(--surface-raised)",
    boxShadow: checked ? "var(--shadow-sm)" : "var(--shadow-inset)",
    position: "relative",
    transition: "background var(--duration-base) var(--ease-out)",
    cursor: disabled ? "not-allowed" : "pointer",
    flex: "none",
  };
  const knob = {
    position: "absolute",
    top: 3,
    left: checked ? 21 : 3,
    width: 18,
    height: 18,
    borderRadius: "var(--radius-full)",
    background: "var(--bg)",
    boxShadow: "0 1px 2px rgba(42,31,27,0.25)",
    transition: "left var(--duration-base) var(--ease-out)",
  };
  const inner = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{ ...track, border: "none", padding: 0, opacity: disabled ? 0.5 : 1 }}
    >
      <span style={knob} />
    </button>
  );
  if (!label) return inner;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-primary)", cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      {inner}
      <span>{label}</span>
    </label>
  );
}
