import React from "react";

/**
 * Loop Avatar — a round portrait. Falls back to warm initials on a tinted
 * paper disc when no photo. Optional soft ring to mark "still close" (sage)
 * or a highlighted person (terracotta).
 */
export function Avatar({
  src,
  name = "",
  size = 44,
  ring = "none", // "none" | "sage" | "terracotta"
  style,
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Deterministic warm tint from the name
  const tints = ["var(--rose)", "var(--terracotta-light)", "var(--sage)", "var(--rose)", "var(--terracotta)"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const bg = tints[h % tints.length];

  const ringColor = ring === "sage" ? "var(--sage)" : ring === "terracotta" ? "var(--accent)" : null;

  const wrap = {
    width: size,
    height: size,
    borderRadius: "var(--radius-full)",
    flex: "none",
    position: "relative",
    boxShadow: ringColor ? `0 0 0 2px var(--bg), 0 0 0 4px ${ringColor}` : "var(--shadow-sm)",
    ...style,
  };
  const inner = {
    width: "100%",
    height: "100%",
    borderRadius: "var(--radius-full)",
    objectFit: "cover",
    display: "block",
  };

  return (
    <div style={wrap}>
      {src ? (
        <img src={src} alt={name} style={inner} />
      ) : (
        <div
          style={{
            ...inner,
            background: bg,
            color: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: Math.round(size * 0.38),
            letterSpacing: "0.01em",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
