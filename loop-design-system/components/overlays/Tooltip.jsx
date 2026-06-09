import React from "react";

/**
 * Loop Tooltip — a quiet word of explanation on hover or focus. A small ink
 * bubble (warm brown, never black) with paper text, used for icon-only
 * controls. Appears after a brief pause so it never feels twitchy.
 */
export function Tooltip({
  label,
  children,
  side = "top", // "top" | "bottom" | "left" | "right"
  delay = 320,
  style,
}) {
  const [show, setShow] = React.useState(false);
  const timer = React.useRef(null);

  const open = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(true), delay);
  };
  const close = () => {
    clearTimeout(timer.current);
    setShow(false);
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const gap = 8;
  const pos = {
    top:    { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: gap },
    bottom: { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: gap },
    left:   { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: gap },
    right:  { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: gap },
  };

  return (
    <span
      style={{ position: "relative", display: "inline-flex", ...style }}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 130,
            ...pos[side],
            background: "var(--ink)",
            color: "var(--bg)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.3,
            letterSpacing: "0.005em",
            padding: "6px 10px",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-lg)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            animation: "loopTipIn 140ms var(--ease-out)",
          }}
        >
          {label}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes loopTipIn { from { opacity: 0 } to { opacity: 1 } }
          ` }} />
        </span>
      )}
    </span>
  );
}
