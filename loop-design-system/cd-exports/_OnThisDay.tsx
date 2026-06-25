// OnThisDay.tsx — Loop (MAV-49)
// Destination: src/renderer/src/components/OnThisDay.tsx
//
// Design source of truth: Loop Design System → "MAV-49 On This Day.html"
// A polaroid-feel memory card surfacing a WhatsApp moment from the same week
// in a previous year. Self-contained: depends only on react.
//
// Usage:
//   <OnThisDay
//     yearsAgo={3}
//     weekLabel="Week of 14 May"
//     flavourText="That was the week you all drove three hours for a gig no one can quite remember."
//     person={{ id: "jo", name: "Jo Okafor" }}
//     photoUrl="path/to/photo.jpg"   // optional
//     rotation={-1.5}               // optional, degrees; randomise per instance
//   />

import React, { useState } from "react";

type CSS = React.CSSProperties;

const TOKEN_CSS = `
:root {
  --bg: #F9F5EE; --surface: #EFE6D6; --surface-raised: #E8DBCA;
  --text-primary: #2A1F1B; --text-secondary: #6B5447; --text-muted: #A38F85;
  --accent: #B8624A;
  --rose: #C49A8A; --terracotta-light: #D4856E; --sage: #6A9470;
  --border: #DDD0C0;
  --font-serif: "Lora", Georgia, serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgba(42,31,27,0.05), 0 1px 3px rgba(42,31,27,0.04);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --duration-base: 200ms;
}`;

// Warm duotone filter matching Loop's photo treatment.
const WARM_FILTER = "sepia(.32) saturate(1.05) hue-rotate(-8deg)";

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const tints = ["#C49A8A", "#D4856E", "#6A9470", "#C49A8A", "#B8624A"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <div style={{
      width: size, height: size, borderRadius: "var(--radius-full)", flex: "none",
      background: tints[h % tints.length], color: "#F9F5EE",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-sans)", fontWeight: 600,
      fontSize: Math.round(size * 0.38), letterSpacing: "0.01em",
      boxShadow: "var(--shadow-sm)",
    }}>{initials}</div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface OnThisDayPerson { id: string; name: string }

export interface OnThisDayProps {
  yearsAgo: number;
  weekLabel: string;          // e.g. "Week of 14 May"
  flavourText: string;        // Loop's warm one-line narrative
  person: OnThisDayPerson;
  photoUrl?: string;          // optional — shows placeholder when absent
  rotation?: number;          // degrees, default -1.2. Vary per instance for a scattered feel.
  onClick?: () => void;
}

export function OnThisDay({
  yearsAgo,
  weekLabel,
  flavourText,
  person,
  photoUrl,
  rotation = -1.2,
  onClick,
}: OnThisDayProps) {
  const [hov, setHov] = useState(false);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }}></style>
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 296,
          background: "#FEFCF8",
          padding: "16px 16px 36px",
          borderRadius: 4,
          boxShadow: hov
            ? "0 6px 18px rgba(42,31,27,0.14), 0 24px 48px rgba(42,31,27,0.12)"
            : "0 3px 8px rgba(42,31,27,0.09), 0 14px 36px rgba(42,31,27,0.1)",
          transform: `rotate(${hov ? rotation * 0.5 : rotation}deg) translateY(${hov ? -4 : 0}px)`,
          transition: `transform var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out)`,
          cursor: onClick ? "pointer" : "default",
        } as CSS}
      >
        {/* photo */}
        {photoUrl ? (
          <img src={photoUrl} alt="Memory" style={{
            width: "100%", height: 180, objectFit: "cover",
            display: "block", filter: WARM_FILTER, borderRadius: 2,
          }} />
        ) : (
          <div style={{
            width: "100%", height: 180, background: "var(--surface)",
            borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </div>
        )}

        {/* eyebrow */}
        <div style={{
          fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700,
          letterSpacing: ".1em", textTransform: "uppercase",
          color: "var(--accent)", marginTop: 16,
        }}>
          {`${yearsAgo} ${yearsAgo === 1 ? "year" : "years"} ago · ${weekLabel}`}
        </div>

        {/* flavour text */}
        <div style={{
          fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 16,
          color: "var(--text-primary)", lineHeight: 1.55,
          marginTop: 8, maxWidth: 240,
        }}>{flavourText}</div>

        {/* person */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14 }}>
          <Avatar name={person.name} size={28}></Avatar>
          <div style={{
            fontFamily: "var(--font-sans)", fontSize: 13,
            color: "var(--text-secondary)", lineHeight: 1.3,
          }}>{person.name}</div>
        </div>
      </div>
    </>
  );
}

export default OnThisDay;
