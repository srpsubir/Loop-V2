import React from "react";

/**
 * Loop Button — a warm, low-chrome action.
 * Primary is a solid terracotta stamp; secondary is paper-on-paper;
 * ghost is text-only. No hard borders, soft warm shadows.
 */
export function Button({
  variant = "primary",
  size = "md",
  iconLeft = null,
  iconRight = null,
  disabled = false,
  type = "button",
  onClick,
  children,
  style,
  ...rest
}) {
  const heights = { sm: 30, md: 38, lg: 46 };
  const pads = { sm: "0 12px", md: "0 18px", lg: "0 24px" };
  const fonts = { sm: 13, md: 14, lg: 15 };

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: heights[size],
    padding: pads[size],
    fontFamily: "var(--font-sans)",
    fontSize: fonts[size],
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: "var(--radius-full)",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)",
    whiteSpace: "nowrap",
    userSelect: "none",
  };

  const variants = {
    primary: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      boxShadow: "var(--shadow-sm)",
    },
    secondary: {
      background: "var(--surface-raised)",
      color: "var(--text-primary)",
      boxShadow: "var(--shadow-sm)",
    },
    ghost: {
      background: "transparent",
      color: "var(--accent)",
      boxShadow: "none",
    },
  };

  const hoverBg = {
    primary: "var(--accent-hover)",
    secondary: "var(--terracotta-faint)",
    ghost: "var(--terracotta-faint)",
  };

  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const merged = {
    ...base,
    ...variants[variant],
    ...(hover && !disabled ? { background: hoverBg[variant] } : null),
    ...(press && !disabled ? { transform: "translateY(0.5px) scale(0.985)" } : null),
    ...style,
  };

  return (
    <button
      type={type}
      style={merged}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
