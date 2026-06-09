import React from "react";

/**
 * Loop Toast — a small slip of paper that rises from the bottom to confirm
 * something quietly ("Saved to Priya's story"). Warm shadow, soft sage dot for
 * a positive note. It reassures; it never alarms. Auto-dismisses after a beat.
 */
export function Toast({
  open = false,
  onClose,
  message,
  icon = null,
  tone = "neutral", // "neutral" | "positive"
  action,
  duration = 3200,
  inline = false, // position within a relative parent instead of the viewport
  style,
}) {
  React.useEffect(() => {
    if (!open || !duration || !onClose) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  const dotColor = tone === "positive" ? "var(--sage)" : "var(--accent)";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: inline ? "absolute" : "fixed",
        left: "50%",
        bottom: inline ? 20 : 32,
        transform: "translateX(-50%)",
        zIndex: 120,
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        maxWidth: "min(92vw, 420px)",
        padding: action ? "12px 12px 12px 18px" : "13px 20px",
        background: "var(--bg)",
        borderRadius: "var(--radius-full)",
        boxShadow: "var(--shadow-xl)",
        fontFamily: "var(--font-sans)",
        animation: "loopToastIn var(--duration-base) var(--ease-out)",
        ...style,
      }}
    >
      <span style={{
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: dotColor,
      }}>
        {icon || <span style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: dotColor }} />}
      </span>
      <span style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.4 }}>{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            flex: "none", border: "none", cursor: "pointer",
            background: "var(--surface-raised)", color: "var(--accent)",
            fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
            padding: "7px 14px", borderRadius: "var(--radius-full)",
          }}
        >{action.label}</button>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loopToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px) }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="status"] { animation: none !important }
        }
      ` }} />
    </div>
  );
}
