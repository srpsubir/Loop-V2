import React from "react";

/**
 * Loop Input — a text field sunk gently into the paper (inset well),
 * no hard box. Warm focus ring. Optional leading icon and label.
 */
export function Input({
  label,
  icon = null,
  value,
  defaultValue,
  placeholder,
  type = "text",
  disabled = false,
  onChange,
  style,
  id,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();

  const wrap = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontFamily: "var(--font-sans)",
    ...style,
  };
  const field = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 38,
    padding: "0 14px",
    background: "var(--bg)",
    borderRadius: "var(--radius-sm)",
    boxShadow: focus
      ? "var(--shadow-inset), var(--focus-ring)"
      : "var(--shadow-inset)",
    transition: "box-shadow var(--duration-fast) var(--ease-out)",
    opacity: disabled ? 0.55 : 1,
  };
  const input = {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    color: "var(--text-primary)",
    minWidth: 0,
  };

  return (
    <label htmlFor={fid} style={wrap}>
      {label && (
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          {label}
        </span>
      )}
      <span style={field}>
        {icon && <span style={{ display: "inline-flex", color: "var(--text-muted)" }}>{icon}</span>}
        <input
          id={fid}
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={input}
          {...rest}
        />
      </span>
    </label>
  );
}
