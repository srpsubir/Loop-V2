import React from "react";

/**
 * Loop PaperCard — the fundamental container. A sheet of warm paper lifted
 * by a soft shadow. No border. Hover raises it gently when interactive.
 */
export function PaperCard({
  children,
  raised = false,
  interactive = false,
  padding = 20,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const base = {
    background: raised ? "var(--surface)" : "var(--bg)",
    borderRadius: "var(--radius-lg)",
    boxShadow: interactive && hover ? "var(--shadow-lg)" : "var(--shadow-md)",
    padding,
    transition: "box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)",
    cursor: interactive ? "pointer" : "default",
    transform: interactive && hover ? "translateY(-2px)" : "none",
    ...style,
  };
  return (
    <div
      style={base}
      onClick={onClick}
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
