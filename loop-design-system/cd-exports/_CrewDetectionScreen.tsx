// CrewDetectionScreen.tsx — Loop (MAV-38)
// Destination: src/renderer/src/screens/CrewDetectionScreen.tsx
//
// Design source of truth: Loop Design System → "MAV-38 Crew Detection.html".
// Self-contained: depends only on react + lucide-react (ChevronDown).
// Private UI primitives are 1:1 ports of Loop DS components — swap for
// design-system imports if the app ships them (props match).
//
// Tokens: reads Loop CSS variables. Fallback block injected once; harmless
// if styles.css is already loaded.

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

type CSS = React.CSSProperties;

// ---------------------------------------------------------------------------
// Tokens (fallback — mirrors design-system tokens/*.css)
// ---------------------------------------------------------------------------

const TOKEN_CSS = `
:root {
  --bg: #F9F5EE; --surface: #EFE6D6; --surface-raised: #E8DBCA;
  --text-primary: #2A1F1B; --text-secondary: #6B5447; --text-muted: #A38F85;
  --text-on-accent: #F9F5EE;
  --accent: #B8624A; --accent-hover: #A6543E; --terracotta-faint: #F5EAD8;
  --border: #DDD0C0; --border-light: #EDE3D5;
  --font-serif: "Lora", Georgia, serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-md: 12px; --radius-lg: 18px; --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgba(42,31,27,0.05), 0 1px 3px rgba(42,31,27,0.04);
  --shadow-md: 0 1px 2px rgba(42,31,27,0.05), 0 4px 12px rgba(42,31,27,0.07);
  --shadow-xl: 0 4px 10px rgba(42,31,27,0.08), 0 24px 56px rgba(42,31,27,0.16);
  --shadow-inset: inset 0 1px 3px rgba(42,31,27,0.08);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --duration-fast: 120ms; --duration-base: 200ms;
}`;

// ---------------------------------------------------------------------------
// Private UI primitives
// ---------------------------------------------------------------------------

function PaperCard({ children, padding = 20, style }: {
  children?: React.ReactNode; padding?: number; style?: CSS;
}) {
  return (
    <div style={{
      background: "var(--bg)", borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-md)", padding, ...style,
    }}>{children}</div>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: i === current ? 28 : 8, height: 8,
          borderRadius: "var(--radius-full)",
          background: i === current ? "var(--accent)" : "var(--border)",
          transition: "width var(--duration-base) var(--ease-out), background var(--duration-base) var(--ease-out)",
        }}></span>
      ))}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

function Button({ variant = "primary", onClick, children, style }: {
  variant?: ButtonVariant; onClick?: () => void;
  children?: React.ReactNode; style?: CSS;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const base: CSS = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", height: 48,
    fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600,
    borderRadius: "var(--radius-full)", border: "none",
    cursor: "pointer", userSelect: "none",
    transition: "background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)",
  };
  const variants: Record<ButtonVariant, CSS> = {
    primary: { background: "var(--accent)", color: "var(--text-on-accent)", boxShadow: "var(--shadow-md)" },
    secondary: { background: "var(--surface-raised)", color: "var(--text-primary)", boxShadow: "var(--shadow-sm)" },
    ghost: { background: "transparent", color: "var(--accent)" },
  };
  const hoverBg: Record<ButtonVariant, string> = {
    primary: "var(--accent-hover)", secondary: "var(--terracotta-faint)", ghost: "var(--terracotta-faint)",
  };
  return (
    <button
      type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        ...base, ...variants[variant],
        ...(hover ? { background: hoverBg[variant] } : {}),
        ...(press ? { transform: "scale(0.985)" } : {}),
        ...style,
      }}
    >{children}</button>
  );
}

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------

function Checkbox({ checked, onChange }: {
  checked: boolean; onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 22, height: 22, borderRadius: 6, flex: "none",
        border: checked ? "none" : "1.5px solid var(--border)",
        background: checked ? "var(--accent)" : "var(--surface)",
        boxShadow: checked ? "var(--shadow-sm)" : "var(--shadow-inset)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background var(--duration-fast) var(--ease-out)",
      }}
    >
      {checked && (
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M1.5 5L4.5 8L10.5 1.5" stroke="#F9F5EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Group row
// ---------------------------------------------------------------------------

interface Group { id: string; name: string; members: string }

function GroupRow({ group, checked, onChange, divider }: {
  group: Group; checked: boolean;
  onChange: (next: boolean) => void; divider?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 16px",
        borderTop: divider ? "1px solid var(--border-light)" : "none",
        cursor: "pointer",
      }}
      onClick={() => onChange(!checked)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500,
          color: "var(--text-primary)", lineHeight: 1.3,
        }}>{group.name}</div>
        <div style={{
          fontFamily: "var(--font-sans)", fontSize: 13,
          color: "var(--text-muted)", marginTop: 2,
        }}>{group.members}</div>
      </div>
      <Checkbox checked={checked} onChange={onChange}></Checkbox>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chapter card
// ---------------------------------------------------------------------------

interface Chapter { id: string; title: string; years: string; tint: string; groups: Group[] }

function ChapterCard({ chapter, checked, onToggle }: {
  chapter: Chapter;
  checked: Record<string, boolean>;
  onToggle: (id: string, val: boolean) => void;
}) {
  const allChecked = chapter.groups.every((g) => checked[g.id]);
  const someChecked = chapter.groups.some((g) => checked[g.id]);

  return (
    <PaperCard padding={0} style={{ overflow: "hidden" }}>
      <div style={{
        background: chapter.tint, padding: "14px 16px 12px",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "nowrap",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 600,
            color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: 1.25,
          }}>{chapter.title}</div>
          <div style={{
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
            letterSpacing: ".07em", textTransform: "uppercase",
            color: "var(--text-muted)", marginTop: 4,
          }}>{chapter.years}</div>
        </div>
        <button
          type="button"
          onClick={() => chapter.groups.forEach((g) => onToggle(g.id, !allChecked))}
          style={{
            flex: "none", border: "none", cursor: "pointer",
            padding: "5px 12px", borderRadius: "var(--radius-full)",
            fontSize: 12, fontWeight: 600, fontFamily: "var(--font-sans)",
            whiteSpace: "nowrap",
            background: allChecked ? "var(--accent)" : "var(--surface-raised)",
            color: allChecked ? "var(--text-on-accent)" : "var(--text-secondary)",
            boxShadow: "var(--shadow-sm)",
            transition: "all var(--duration-fast) var(--ease-out)",
          }}
        >{allChecked ? "All ✓" : someChecked ? "Some ✓" : "Select all"}</button>
      </div>
      {chapter.groups.map((g, i) => (
        <GroupRow
          key={g.id} group={g} checked={!!checked[g.id]}
          onChange={(v) => onToggle(g.id, v)} divider={i > 0}
        ></GroupRow>
      ))}
    </PaperCard>
  );
}

// ---------------------------------------------------------------------------
// Overflow / unmatched section
// ---------------------------------------------------------------------------

function OverflowSection({ groups, checked, onToggle }: {
  groups: Group[];
  checked: Record<string, boolean>;
  onToggle: (id: string, val: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const anyChecked = groups.some((g) => checked[g.id]);
  const selectedCount = groups.filter((g) => checked[g.id]).length;

  return (
    <div>
      <button
        type="button" onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          background: "none", border: "none", cursor: "pointer",
          padding: "10px 6px", textAlign: "left",
        }}
      >
        <span style={{
          flex: 1, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
          color: "var(--text-muted)",
        }}>
          {`${groups.length} group${groups.length !== 1 ? "s" : ""} Loop couldn't place`}
          {anyChecked ? ` · ${selectedCount} selected` : ""}
        </span>
        <ChevronDown
          size={16} strokeWidth={2} color="var(--text-muted)"
          style={{
            flex: "none",
            transform: open ? "rotate(180deg)" : "none",
            transition: `transform var(--duration-base) var(--ease-out)`,
          } as CSS}
        ></ChevronDown>
      </button>

      {open && (
        <PaperCard padding={0} style={{ overflow: "hidden", marginTop: 4 }}>
          <div style={{
            padding: "10px 16px 8px",
            borderBottom: "1px solid var(--border-light)",
            fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.55,
            color: "var(--text-muted)",
          }}>
            These didn't match a chapter. Tick any you want Loop to remember — or leave them for later.
          </div>
          {groups.map((g, i) => (
            <GroupRow
              key={g.id} group={g} checked={!!checked[g.id]}
              onChange={(v) => onToggle(g.id, v)} divider={i > 0}
            ></GroupRow>
          ))}
        </PaperCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen data
// ---------------------------------------------------------------------------

const CHAPTERS: Chapter[] = [
  {
    id: "london", title: "The London Years", years: "2014 – 2019", tint: "#F5EAD8",
    groups: [
      { id: "g1", name: "The Camden flat", members: "Jo, Marcus, Danny + 2" },
      { id: "g2", name: "The agency crew", members: "Sam, Elena + 1" },
    ],
  },
  {
    id: "edinburgh", title: "Edinburgh Masters", years: "2019 – 2020", tint: "#EAF0EB",
    groups: [
      { id: "g3", name: "The masters crew", members: "Priya, Nadia + 2" },
      { id: "g4", name: "Marchmont flatmates", members: "Tom, Priya + 1" },
    ],
  },
  {
    id: "home", title: "Home & Family", years: "Always", tint: "#F0EBE3",
    groups: [
      { id: "g5", name: "The family", members: "Tom, Nadia + 3" },
    ],
  },
];

const UNMATCHED: Group[] = [
  { id: "u1", name: "Running club", members: "12 people" },
  { id: "u2", name: "Book club", members: "8 people" },
  { id: "u3", name: "Work announcements", members: "34 people" },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export interface CrewDetectionScreenProps {
  // TODO(loop): inject real matched chapters/groups from the WhatsApp scanner.
  chapters?: Chapter[];
  unmatched?: Group[];
  onConfirm?: (selectedGroupIds: string[]) => void;
  onBack?: () => void;
}

export function CrewDetectionScreen({
  chapters = CHAPTERS,
  unmatched = UNMATCHED,
  onConfirm,
  onBack,
}: CrewDetectionScreenProps) {
  // Pre-tick all chapter groups; leave unmatched unticked.
  const initial: Record<string, boolean> = {};
  chapters.forEach((c) => c.groups.forEach((g) => { initial[g.id] = true; }));
  unmatched.forEach((g) => { initial[g.id] = false; });

  const [checked, setChecked] = useState<Record<string, boolean>>(initial);

  const toggle = (id: string, val: boolean) =>
    setChecked((prev) => ({ ...prev, [id]: val }));

  const selectedIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => k);
  const selectedCount = selectedIds.length;

  return (
    <div data-screen-label="CrewDetection" style={{ minHeight: "100%", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }}></style>

      {/* progress */}
      <div style={{ display: "flex", justifyContent: "center", padding: "24px 24px 0" }}>
        <ProgressDots total={3} current={1}></ProgressDots>
      </div>

      {/* content */}
      <div style={{ flex: 1, maxWidth: 600, width: "100%", margin: "0 auto", padding: "28px 24px 120px" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "var(--font-serif)", fontSize: 34, fontWeight: 600,
            color: "var(--text-primary)", letterSpacing: "-0.01em",
            lineHeight: 1.2, margin: "0 0 10px",
          }}>Here's what Loop found</h1>
          <p style={{
            fontFamily: "var(--font-sans)", fontSize: 15, lineHeight: 1.6,
            color: "var(--text-secondary)", margin: 0, maxWidth: 480,
          }}>
            Loop matched your WhatsApp groups to the chapters it already knows about.
            Untick anything that doesn't feel right.
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {chapters.map((chapter) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              checked={checked}
              onToggle={toggle}
            ></ChapterCard>
          ))}
          <OverflowSection groups={unmatched} checked={checked} onToggle={toggle}></OverflowSection>
        </div>
      </div>

      {/* sticky footer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: "16px 24px 24px",
        background: "linear-gradient(to top, var(--bg) 70%, transparent)",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <Button variant="primary" onClick={() => onConfirm?.(selectedIds)}>
            {`Looks right — ${selectedCount} group${selectedCount !== 1 ? "s" : ""}`}
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Let me adjust the chapters first
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CrewDetectionScreen;
