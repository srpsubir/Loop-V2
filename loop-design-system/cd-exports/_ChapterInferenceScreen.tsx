// ChapterInferenceScreen.tsx — Loop (MAV-53 v3)
// Destination: src/renderer/src/screens/ChapterInferenceScreen.tsx
//
// WhatsApp-first AHA moment flow.
// Loading state: spinner + "Finding your chapters…"
// Results state: pre-confirmed candidate cards, tap to deselect, inline rename.
// CTA gated until ≥1 card confirmed.
//
// TODO(loop): set `initialLoading={false}` and pass `candidates` from the
// real WhatsApp scanner once the scan resolves. The `simulatedDelay` prop
// controls the fake loading duration for demo/testing.

import React, { useState, useEffect, useRef } from "react";

type CSS = React.CSSProperties;

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const TOKEN_CSS = `
:root {
  --bg: #F9F5EE; --surface: #EFE6D6; --surface-raised: #E8DBCA;
  --text-primary: #2A1F1B; --text-secondary: #6B5447; --text-muted: #A38F85;
  --text-on-accent: #F9F5EE;
  --accent: #B8624A; --accent-hover: #A6543E; --terracotta-faint: #F5EAD8;
  --positive: #6A9470; --positive-faint: #EAF2EB;
  --border: #DDD0C0; --border-light: #EDE3D5;
  --font-serif: "Lora", Georgia, serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-md: 12px; --radius-lg: 18px; --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgba(42,31,27,0.05), 0 1px 3px rgba(42,31,27,0.04);
  --shadow-md: 0 1px 2px rgba(42,31,27,0.05), 0 4px 12px rgba(42,31,27,0.07);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --duration-fast: 120ms; --duration-base: 200ms;
}
@keyframes loopSpin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .loop-spinner { animation: none !important; } }`;

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="loop-spinner" style={{
      width: 40, height: 40, borderRadius: "50%",
      border: "2.5px solid var(--border)",
      borderTopColor: "var(--accent)",
      animation: "loopSpin 0.8s linear infinite",
    }}></div>
  );
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: 48, textAlign: "center",
    }}>
      <Spinner></Spinner>
      <h1 style={{
        fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 600,
        color: "var(--text-primary)", letterSpacing: "-0.01em",
        lineHeight: 1.25, margin: "28px 0 12px",
      }}>Finding your chapters…</h1>
      <p style={{
        fontFamily: "var(--font-sans)", fontSize: 15, lineHeight: 1.65,
        color: "var(--text-secondary)", margin: 0, maxWidth: 340,
      }}>Reading through your groups. Give it a moment.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline-editable name
// ---------------------------------------------------------------------------

function EditableName({ value, onChange }: {
  value: string; onChange: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    const t = draft.trim() || value;
    setDraft(t); onChange(t); setEditing(false);
  };

  if (editing) {
    return (
      <input ref={inputRef} value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        style={{
          fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600,
          color: "var(--text-primary)", letterSpacing: "-0.01em",
          background: "rgba(255,255,255,0.5)", border: "none", outline: "none",
          borderBottom: "1.5px solid var(--accent)", borderRadius: 0,
          width: "100%", padding: "2px 0", display: "block",
        }}
      />
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} title="Rename"
      style={{
        fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600,
        color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: 1.3,
        background: "none", border: "none", cursor: "text", padding: 0,
        textAlign: "left", display: "block", width: "100%",
      }}
    >
      {draft}
      {/* inline pencil — vertically centred with text via verticalAlign */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ display: "inline", marginLeft: 7, verticalAlign: "middle", opacity: 0.45 }}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Chapter card
// ---------------------------------------------------------------------------

export type ChapterStatus = "active" | "closed";

export interface ChapterCandidate {
  id: string;
  name: string;           // inferred chapter name — editable
  years?: string;         // e.g. "2014 – 2019" — optional
  status: ChapterStatus;
  members: number;
}

interface CardState extends ChapterCandidate {
  confirmed: boolean;
  editedName: string;
}

function ChapterCard({ card, onToggle, onRename }: {
  card: CardState;
  onToggle: () => void;
  onRename: (name: string) => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        position: "relative",
        padding: "20px 56px 18px 22px",
        borderRadius: "var(--radius-lg)",
        cursor: "pointer",
        background: card.confirmed ? "var(--terracotta-faint)" : "var(--surface)",
        border: `1.5px solid ${card.confirmed ? "rgba(184,98,74,0.2)" : "transparent"}`,
        boxShadow: card.confirmed ? "var(--shadow-md)" : "var(--shadow-sm)",
        opacity: card.confirmed ? 1 : 0.5,
        transition: "all var(--duration-base) var(--ease-out)",
      }}
    >
      {/* confirm / deselect badge */}
      <div style={{
        position: "absolute", top: 14, right: 14,
        width: 24, height: 24, borderRadius: "var(--radius-full)",
        background: card.confirmed ? "var(--accent)" : "var(--surface-raised)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all var(--duration-fast) var(--ease-out)",
      }}>
        {card.confirmed ? (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1.5 5L4.5 8L10.5 1.5" stroke="#FEFCF8" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M8 2L2 8M2 2l6 6" stroke="var(--text-muted)"
              strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* badges */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {card.years && (
          <span style={{
            fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
            letterSpacing: ".07em", textTransform: "uppercase",
            color: "var(--text-muted)", padding: "3px 8px",
            borderRadius: "var(--radius-full)",
            background: card.confirmed ? "rgba(184,98,74,0.1)" : "var(--surface-raised)",
            whiteSpace: "nowrap",
          }}>{card.years}</span>
        )}
        {card.status === "active" && (
          <span style={{
            fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700,
            letterSpacing: ".07em", textTransform: "uppercase",
            color: "var(--positive)", padding: "3px 8px",
            borderRadius: "var(--radius-full)", background: "var(--positive-faint)",
          }}>Ongoing</span>
        )}
      </div>

      {/* inline-editable name — stop propagation so tap doesn't toggle */}
      <div onClick={(e) => e.stopPropagation()}>
        <EditableName value={card.editedName} onChange={onRename}></EditableName>
      </div>

      {/* member count */}
      <div style={{
        fontFamily: "var(--font-sans)", fontSize: 13,
        color: "var(--text-muted)", marginTop: 10,
      }}>{card.members} {card.members === 1 ? "person" : "people"}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CTA button
// ---------------------------------------------------------------------------

function Button({ disabled = false, onClick, children }: {
  disabled?: boolean; onClick?: () => void; children?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={!disabled ? onClick : undefined} disabled={disabled}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", height: 48,
        fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600,
        borderRadius: "var(--radius-full)", border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.38 : 1,
        background: hover ? "var(--accent-hover)" : "var(--accent)",
        color: "var(--text-on-accent)", boxShadow: "var(--shadow-sm)",
        transition: "all var(--duration-fast) var(--ease-out)",
      }}
    >{children}</button>
  );
}

// ---------------------------------------------------------------------------
// Sample data — replace with real scanner output
// ---------------------------------------------------------------------------

const SAMPLE_CANDIDATES: ChapterCandidate[] = [
  { id: "g1", name: "The London Years",  years: "2014 – 2019", status: "closed", members: 5  },
  { id: "g2", name: "Edinburgh Masters", years: "2019 – 2020", status: "closed", members: 12 },
  { id: "g3", name: "Home & Family",     years: "Always",      status: "active", members: 6  },
  { id: "g4", name: "Work years",        years: "2016 – 2019", status: "closed", members: 8  },
  { id: "g5", name: "Running & fitness", years: "2022 – now",  status: "active", members: 14 },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export interface ChapterInferenceScreenProps {
  /** Pass real scanner results here once the scan completes. */
  candidates?: ChapterCandidate[];
  /** Start in loading state; flip to false once results arrive. */
  initialLoading?: boolean;
  /** Milliseconds to show the loading spinner in demo/test mode. Default 1800. */
  simulatedDelay?: number;
  onConfirm?: (accepted: { id: string; name: string }[]) => void;
  onSkip?: () => void;
}

export function ChapterInferenceScreen({
  candidates = SAMPLE_CANDIDATES,
  initialLoading = true,
  simulatedDelay = 1800,
  onConfirm,
  onSkip,
}: ChapterInferenceScreenProps) {
  const [loading, setLoading] = useState(initialLoading);
  const [cards, setCards] = useState<CardState[]>(
    candidates.map((c) => ({ ...c, confirmed: true, editedName: c.name }))
  );

  // Simulate scan completing after delay (remove in production — let real
  // scan result drive `initialLoading` prop instead).
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), simulatedDelay);
    return () => clearTimeout(t);
  }, [loading, simulatedDelay]);

  const toggle  = (id: string) => setCards((p) => p.map((c) => c.id === id ? { ...c, confirmed: !c.confirmed } : c));
  const rename  = (id: string, name: string) => setCards((p) => p.map((c) => c.id === id ? { ...c, editedName: name } : c));

  const confirmed = cards.filter((c) => c.confirmed);
  const count = confirmed.length;

  const handleConfirm = () => onConfirm?.(confirmed.map((c) => ({ id: c.id, name: c.editedName })));

  if (loading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }}></style>
        <LoadingState></LoadingState>
      </div>
    );
  }

  return (
    <div data-screen-label="ChapterInference" style={{ background: "var(--bg)", minHeight: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }}></style>

      <div style={{ maxWidth: 680, width: "100%", margin: "0 auto", padding: "52px 40px 140px" }}>
        <header style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 600,
            color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 14px",
          }}>{`Loop found ${cards.length} chapter${cards.length !== 1 ? "s" : ""}`}</h1>
          <p style={{
            fontFamily: "var(--font-serif)", fontStyle: "italic",
            fontSize: 17, lineHeight: 1.65,
            color: "var(--text-secondary)", margin: 0, maxWidth: 480,
          }}>
            These look like the chapters of your life. Tap any that don't belong.
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cards.map((c) => (
            <ChapterCard
              key={c.id} card={c}
              onToggle={() => toggle(c.id)}
              onRename={(name) => rename(c.id, name)}
            ></ChapterCard>
          ))}
        </div>
      </div>

      {/* sticky footer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: "16px 40px 28px",
        background: "linear-gradient(to top, var(--bg) 70%, transparent)",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <Button disabled={count === 0} onClick={handleConfirm}>
            {count === 0 ? "These are my chapters →" : `These are my chapters — ${count} →`}
          </Button>
          <button type="button" onClick={onSkip}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "4px 0",
              fontFamily: "var(--font-sans)", fontSize: 13,
              color: "var(--text-muted)", textAlign: "center",
            }}>
            Not right — let me set this up myself
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChapterInferenceScreen;
