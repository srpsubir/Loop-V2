import React from "react";

/**
 * Loop Dialog — a sheet of paper that floats above the app for a single,
 * deliberate decision (confirm a delete, name a new chapter). A warm-tinted
 * scrim dims the paper behind it — never a hard black overlay. Title is serif,
 * body is sans. It fades and lifts in gently; it never snaps.
 */
export function Dialog({
  open = false,
  onClose,
  title,
  description,
  children,
  footer,
  icon = null,
  width = 440,
  closeOnScrim = true,
  inline = false, // scope the scrim to a relative parent (e.g. a device frame)
  style,
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && onClose) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (closeOnScrim && e.target === e.currentTarget && onClose) onClose(); }}
      style={{
        position: inline ? "absolute" : "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        // Warm ink scrim — brown, low alpha. Never neutral black.
        background: "rgba(42, 31, 27, 0.32)",
        backdropFilter: "saturate(1.05) blur(1px)",
        animation: "loopDialogScrim var(--duration-base) var(--ease-out)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        style={{
          width: "100%",
          maxWidth: width,
          background: "var(--bg)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          padding: 28,
          fontFamily: "var(--font-sans)",
          animation: "loopDialogIn var(--duration-base) var(--ease-out)",
          ...style,
        }}
      >
        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: "var(--radius-full)",
            background: "var(--terracotta-faint)", color: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>{icon}</div>
        )}
        {title && (
          <div style={{
            fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600,
            color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: 1.25,
          }}>{title}</div>
        )}
        {description && (
          <div style={{
            fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55,
            marginTop: 8,
          }}>{description}</div>
        )}
        {children && <div style={{ marginTop: title || description ? 18 : 0 }}>{children}</div>}
        {footer && (
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24,
          }}>{footer}</div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loopDialogScrim { from { opacity: 0 } to { opacity: 1 } }
        @keyframes loopDialogIn {
          from { opacity: 0; transform: translateY(8px) scale(0.985) }
          to   { opacity: 1; transform: none }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"], [role="presentation"] { animation: none !important }
        }
      ` }} />
    </div>
  );
}
