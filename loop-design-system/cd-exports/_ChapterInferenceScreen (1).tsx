// ChapterInferenceScreen.tsx — Loop (MAV-53 v2)
// Destination: src/renderer/src/screens/ChapterInferenceScreen.tsx
//
// AHA moment: Loop has scanned WhatsApp and found chapters.
// Chapter cards in pending/confirmed states. CTA gated until ≥1 confirmed.

import React, { useState } from "react";
type CSS = React.CSSProperties;

const TOKEN_CSS = `
:root {
  --bg: #F9F5EE; --surface: #EFE6D6; --surface-raised: #E8DBCA;
  --text-primary: #2A1F1B; --text-secondary: #6B5447; --text-muted: #A38F85;
  --text-on-accent: #F9F5EE;
  --accent: #B8624A; --accent-hover: #A6543E; --terracotta-faint: #F5EAD8;
  --rose: #C49A8A; --terracotta-light: #D4856E; --sage: #6A9470;
  --positive: #6A9470; --positive-faint: #EAF2EB;
  --border: #DDD0C0; --border-light: #EDE3D5;
  --font-serif: "Lora", Georgia, serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-md: 12px; --radius-lg: 18px; --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgba(42,31,27,0.05), 0 1px 3px rgba(42,31,27,0.04);
  --shadow-md: 0 1px 2px rgba(42,31,27,0.05), 0 4px 12px rgba(42,31,27,0.07);
  --shadow-lg: 0 2px 4px rgba(42,31,27,0.06), 0 8px 24px rgba(42,31,27,0.10);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --duration-fast: 120ms; --duration-base: 200ms;
}`;

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const tints = ["#C49A8A", "#D4856E", "#6A9470", "#C49A8A", "#B8624A"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <div style={{ width: size, height: size, borderRadius: "var(--radius-full)", flex: "none", background: tints[h % tints.length], color: "#F9F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: Math.round(size * 0.38), letterSpacing: "0.01em", boxShadow: "var(--shadow-sm)" }}>{initials}</div>
  );
}

function AvatarStack({ names }: { names: string[] }) {
  const show = names.slice(0, 4);
  const rest  = names.length - show.length;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {show.map((n, i) => (
        <div key={n} style={{ marginLeft: i ? -10 : 0, position: "relative", zIndex: show.length - i }}>
          <Avatar name={n} size={32}></Avatar>
        </div>
      ))}
      {rest > 0 && (
        <div style={{ marginLeft: -10, width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--surface-raised)", zIndex: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>+{rest}</div>
      )}
    </div>
  );
}

function Button({ variant = "primary", disabled = false, onClick, children }: {
  variant?: "primary" | "ghost"; disabled?: boolean;
  onClick?: () => void; children?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  return (
    <button type="button" onClick={!disabled ? onClick : undefined} disabled={disabled}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => !disabled && setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        height: 44, padding: "0 24px",
        fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600,
        borderRadius: "var(--radius-full)", border: "none",
        cursor: disabled ? "not-allowed" : "pointer", userSelect: "none",
        opacity: disabled ? 0.4 : 1,
        transition: "all var(--duration-fast) var(--ease-out)",
        ...(variant === "primary"
          ? { background: hover ? "var(--accent-hover)" : "var(--accent)", color: "var(--text-on-accent)", boxShadow: "var(--shadow-sm)" }
          : { background: "transparent", color: "var(--accent)" }),
        ...(press ? { transform: "scale(0.985)" } : {}),
      }}
    >{children}</button>
  );
}

// ---------------------------------------------------------------------------
// Chapter card
// ---------------------------------------------------------------------------

export interface InferredChapter {
  id: string;
  name: string;
  years: string;
  status: "active" | "closed";
  memberNames: string[];          // used for avatar stack
  memberCount: number;            // total, including those beyond the 4 shown
}

function ChapterCard({ chapter, confirmed, onToggle }: {
  chapter: InferredChapter;
  confirmed: boolean;
  onToggle: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      role="button" tabIndex={0} onClick={onToggle}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden",
        background: confirmed ? "var(--terracotta-faint)" : "var(--bg)",
        boxShadow: confirmed ? "0 2px 4px rgba(42,31,27,0.07), 0 8px 24px rgba(42,31,27,0.11)" : hov ? "var(--shadow-lg)" : "var(--shadow-md)",
        border: `1.5px solid ${confirmed ? "rgba(184,98,74,0.18)" : "transparent"}`,
        transform: hov ? "translateY(-1px)" : "none",
        transition: "all var(--duration-base) var(--ease-out)",
        cursor: "pointer", padding: "24px 22px 22px",
      }}
    >
      {/* checkmark */}
      {confirmed && (
        <div style={{ position: "absolute", top: 14, right: 14, width: 26, height: 26, borderRadius: "var(--radius-full)", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-sm)" }}>
          <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
            <path d="M1.5 5.5L5 9L11.5 1.5" stroke="#FEFCF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      {/* badges */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-muted)", lineHeight: 1, padding: "4px 8px", borderRadius: "var(--radius-full)", background: "var(--surface)", whiteSpace: "nowrap" }}>{chapter.years}</span>
        {chapter.status === "active" && (
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--positive)", lineHeight: 1, padding: "4px 8px", borderRadius: "var(--radius-full)", background: "var(--positive-faint)" }}>Ongoing</span>
        )}
      </div>
      {/* name */}
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 18 }}>{chapter.name}</div>
      {/* people */}
      <AvatarStack names={chapter.memberNames}></AvatarStack>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sample data — replace with real scanner output
// ---------------------------------------------------------------------------

const SAMPLE_CHAPTERS: InferredChapter[] = [
  { id: "london",    name: "The London Years",    years: "2014 – 2019", status: "closed", memberNames: ["Jo Okafor","Marcus Bell","Danny Mensah","Sam Whitfield","Elena Costa"],  memberCount: 5 },
  { id: "edinburgh", name: "Edinburgh Masters",   years: "2019 – 2020", status: "closed", memberNames: ["Priya Raman","Nadia Haddad","Tom Reid","Sam Whitfield"],                  memberCount: 4 },
  { id: "home",      name: "Home & Family",       years: "Always",      status: "active", memberNames: ["Tom Reid","Nadia Haddad","Priya Raman","Jo Okafor"],                      memberCount: 4 },
  { id: "first-job", name: "First job years",     years: "2014 – 2016", status: "closed", memberNames: ["Elena Costa","Danny Mensah","Marcus Bell"],                               memberCount: 3 },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export interface ChapterInferenceScreenProps {
  chapters?: InferredChapter[];
  onConfirm?: (confirmedIds: string[]) => void;
  onSkip?: () => void;
}

export function ChapterInferenceScreen({ chapters = SAMPLE_CHAPTERS, onConfirm, onSkip }: ChapterInferenceScreenProps) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setConfirmed((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const count = confirmed.size;

  return (
    <div data-screen-label="ChapterInference" style={{ minHeight: "100%", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }}></style>

      <div style={{ maxWidth: 760, width: "100%", margin: "0 auto", padding: "52px 40px 120px" }}>
        <header style={{ marginBottom: 44 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 38, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 12px" }}>Loop found your chapters</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.65, color: "var(--text-secondary)", margin: 0, maxWidth: 500 }}>
            It read through your groups and put together what it thinks are the chapters of your life. Confirm the ones that feel right.
          </p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {chapters.map((c) => (
            <ChapterCard key={c.id} chapter={c} confirmed={confirmed.has(c.id)} onToggle={() => toggle(c.id)}></ChapterCard>
          ))}
        </div>
      </div>

      {/* footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "16px 40px 28px", background: "linear-gradient(to top, var(--bg) 70%, transparent)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 14, alignItems: "center" }}>
          <Button variant="primary" disabled={count === 0} onClick={() => onConfirm?.([...confirmed])}>
            {count === 0 ? "These are my chapters" : `These are my chapters — ${count}`}
          </Button>
          <Button variant="ghost" onClick={onSkip}>Not quite right</Button>
        </div>
      </div>
    </div>
  );
}

export default ChapterInferenceScreen;
