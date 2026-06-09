import React from "react";

/**
 * Loop IconButton — a soft circular control for a single icon.
 * Used for toolbar actions, close buttons, "add" affordances.
 * Pass a Lucide (or any) SVG/element as `icon`.
 */
export function IconButton({
  icon,
  size = "md",
  variant = "ghost",
  disabled = false,
  label,
  onClick,
  style,
  ...rest
}) {
  const dims = { sm: 30, md: 36, lg: 44 };
  const d = dims[size];

  const variants = {
    ghost: { background: "transparent", color: "var(--text-secondary)" },
    soft: { background: "var(--surface-raised)", color: "var(--text-primary)", boxShadow: "var(--shadow-sm)" },
    primary: { background: "var(--accent)", color: "var(--text-on-accent)", boxShadow: "var(--shadow-sm)" },
  };
  const hoverBg = {
    ghost: "var(--surface-raised)",
    soft: "var(--terracotta-faint)",
    primary: "var(--accent-hover)",
  };

  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const merged = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: d,
    height: d,
    borderRadius: "var(--radius-full)",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)",
    ...variants[variant],
    ...(hover && !disabled ? { background: hoverBg[variant] } : null),
    ...(press && !disabled ? { transform: "scale(0.92)" } : null),
    ...style,
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={merged}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      {...rest}
    >
      {icon}
    </button>
  );
}
