import React from "react";
import { Avatar } from "./Avatar";

/**
 * Loop PersonRow — the signature unit. A person, rendered like a line in a
 * photo album: portrait, name in serif, and a soft human line of metadata
 * ("Last spoke 3 weeks ago"). No status dots, no table cells.
 */
export function PersonRow({
  name,
  src,
  meta,
  note,
  ring = "none",
  trailing = null,
  onClick,
  style,
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        background: hover ? "var(--surface)" : "transparent",
        transition: "background var(--duration-fast) var(--ease-out)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      <Avatar src={src} name={name} size={46} ring={ring} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 18,
            fontWeight: 500,
            color: "var(--text-primary)",
            lineHeight: 1.25,
          }}
        >
          {name}
        </div>
        {(meta || note) && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-muted)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {note || meta}
          </div>
        )}
      </div>
      {trailing && <div style={{ flex: "none" }}>{trailing}</div>}
    </div>
  );
}
