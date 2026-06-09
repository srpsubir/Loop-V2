import React from "react";

/**
 * Loop Dropdown — a small menu of actions on a sheet of paper, opened from a
 * trigger (an IconButton "…", a name, a chevron). Items wash to the surface
 * tint on hover; a chosen item shows a soft terracotta check. A "remove" item
 * can read terracotta, but there are no loud red destructive rows.
 */
export function Dropdown({
  trigger,
  items = [],
  align = "start", // "start" | "end"
  width = 220,
  open: controlledOpen,
  onOpenChange,
  style,
}) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen != null ? controlledOpen : uncontrolled;
  const setOpen = (v) => {
    if (onOpenChange) onOpenChange(v);
    if (controlledOpen == null) setUncontrolled(v);
  };
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex", ...style }}>
      <span onClick={() => setOpen(!open)} style={{ display: "inline-flex" }}>
        {trigger}
      </span>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            [align === "end" ? "right" : "left"]: 0,
            zIndex: 110,
            width,
            background: "var(--bg)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: 6,
            fontFamily: "var(--font-sans)",
            animation: "loopMenuIn var(--duration-fast) var(--ease-out)",
          }}
        >
          {items.map((it, i) =>
            it.divider ? (
              <div key={`d${i}`} style={{ height: 1, background: "var(--border-light)", margin: "6px 8px" }} />
            ) : it.header ? (
              <div key={`h${i}`} style={{
                fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase",
                color: "var(--text-muted)", fontWeight: 600, padding: "8px 10px 4px",
              }}>{it.header}</div>
            ) : (
              <MenuItem key={i} item={it} onClose={() => setOpen(false)} />
            )
          )}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes loopMenuIn {
              from { opacity: 0; transform: translateY(-4px) scale(0.99) }
              to   { opacity: 1; transform: none }
            }
          ` }} />
        </div>
      )}
    </span>
  );
}

function MenuItem({ item, onClose }) {
  const [hover, setHover] = React.useState(false);
  const fg = item.tone === "accent" ? "var(--accent)" : "var(--text-primary)";
  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { if (!item.disabled) { item.onClick && item.onClick(); onClose(); } }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        textAlign: "left",
        border: "none",
        cursor: item.disabled ? "not-allowed" : "pointer",
        background: hover && !item.disabled ? "var(--surface)" : "transparent",
        color: fg,
        opacity: item.disabled ? 0.45 : 1,
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 500,
        padding: "9px 10px",
        borderRadius: "var(--radius-sm)",
        transition: "background var(--duration-fast) var(--ease-out)",
      }}
    >
      {item.icon && (
        <span style={{ display: "inline-flex", color: item.tone === "accent" ? "var(--accent)" : "var(--text-muted)", flex: "none" }}>
          {item.icon}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
      {item.selected && (
        <span style={{ display: "inline-flex", color: "var(--accent)", flex: "none" }}>{item.checkIcon || "✓"}</span>
      )}
      {item.trailing && <span style={{ color: "var(--text-muted)", fontSize: 12, flex: "none" }}>{item.trailing}</span>}
    </button>
  );
}
