// CrewDetectionScreen.tsx — Loop (MAV-59)
// Destination: src/renderer/src/screens/CrewDetectionScreen.tsx
//
// After chapters are confirmed, user selects people per chapter.
// One chapter at a time with step indicator; Next / Done on last.

import React, { useState } from "react";
type CSS = React.CSSProperties;

const TOKEN_CSS = `
:root {
  --bg: #F9F5EE; --surface: #EFE6D6; --surface-raised: #E8DBCA;
  --text-primary: #2A1F1B; --text-secondary: #6B5447; --text-muted: #A38F85;
  --text-on-accent: #F9F5EE;
  --accent: #B8624A; --accent-hover: #A6543E; --terracotta-faint: #F5EAD8;
  --rose: #C49A8A; --terracotta-light: #D4856E; --sage: #6A9470;
  --border: #DDD0C0; --border-light: #EDE3D5;
  --font-serif: "Lora", Georgia, serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-full: 999px; --radius-lg: 18px;
  --shadow-sm: 0 1px 2px rgba(42,31,27,0.05), 0 1px 3px rgba(42,31,27,0.04);
  --shadow-md: 0 1px 2px rgba(42,31,27,0.05), 0 4px 12px rgba(42,31,27,0.07);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --duration-fast: 120ms; --duration-base: 200ms;
}`;

function Avatar({ name, size = 46 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const tints = ["#C49A8A", "#D4856E", "#6A9470", "#C49A8A", "#B8624A"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <div style={{ width: size, height: size, borderRadius: "var(--radius-full)", flex: "none", background: tints[h % tints.length], color: "#F9F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: Math.round(size * 0.38), letterSpacing: "0.01em", boxShadow: "var(--shadow-sm)" }}>{initials}</div>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ width: i === current ? 28 : 8, height: 8, borderRadius: "var(--radius-full)", background: i === current ? "var(--accent)" : "var(--border)", transition: "width var(--duration-base) var(--ease-out)" }}></span>
      ))}
    </div>
  );
}

function Button({ variant = "primary", onClick, children }: {
  variant?: "primary" | "ghost"; onClick?: () => void; children?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 24px", fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600, borderRadius: "var(--radius-full)", border: "none", cursor: "pointer", userSelect: "none", transition: "all var(--duration-fast) var(--ease-out)", ...(variant === "primary" ? { background: hover ? "var(--accent-hover)" : "var(--accent)", color: "var(--text-on-accent)", boxShadow: "var(--shadow-sm)" } : { background: "transparent", color: "var(--accent)" }), ...(press ? { transform: "scale(0.985)" } : {}) }}
    >{children}</button>
  );
}

function SelectionDot({ selected }: { selected: boolean }) {
  return (
    <div style={{ width: 22, height: 22, borderRadius: "var(--radius-full)", flex: "none", background: selected ? "var(--accent)" : "transparent", border: selected ? "none" : "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all var(--duration-fast) var(--ease-out)", boxShadow: selected ? "var(--shadow-sm)" : "none" }}>
      {selected && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="#FEFCF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrewContact {
  id: string;
  name: string;
  lastSpoke: string;
}

export interface CrewChapter {
  id: string;
  name: string;
  years: string;
  contacts: CrewContact[];
}

// ---------------------------------------------------------------------------
// Contact row
// ---------------------------------------------------------------------------

function ContactRow({ contact, selected, onToggle, divider }: {
  contact: CrewContact; selected: boolean; onToggle: () => void; divider?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      role="button" tabIndex={0} onClick={onToggle}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px", borderTop: divider ? "1px solid var(--border-light)" : "none", background: hov ? "var(--surface)" : "transparent", cursor: "pointer", transition: "background var(--duration-fast) var(--ease-out)" }}
    >
      <div style={{ borderRadius: "var(--radius-full)", flex: "none", boxShadow: selected ? "0 0 0 2.5px var(--bg), 0 0 0 4.5px var(--accent)" : "none", transition: "box-shadow var(--duration-fast) var(--ease-out)" }}>
        <Avatar name={contact.name} size={46}></Avatar>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.25 }}>{contact.name}</div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{contact.lastSpoke}</div>
      </div>
      <SelectionDot selected={selected}></SelectionDot>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_CHAPTERS: CrewChapter[] = [
  { id: "london", name: "The London Years", years: "2014 – 2019", contacts: [
    { id: "jo",     name: "Jo Okafor",     lastSpoke: "Last spoke on Tuesday" },
    { id: "marcus", name: "Marcus Bell",   lastSpoke: "You last spoke in the spring" },
    { id: "danny",  name: "Danny Mensah",  lastSpoke: "Last spoke yesterday" },
    { id: "sam",    name: "Sam Whitfield", lastSpoke: "Quietly drifting lately" },
    { id: "elena",  name: "Elena Costa",   lastSpoke: "Last spoke last month" },
  ]},
  { id: "edinburgh", name: "Edinburgh Masters", years: "2019 – 2020", contacts: [
    { id: "priya", name: "Priya Raman",  lastSpoke: "Last spoke 3 weeks ago" },
    { id: "nadia", name: "Nadia Haddad", lastSpoke: "Last spoke last weekend" },
    { id: "tom",   name: "Tom Reid",     lastSpoke: "Last spoke 2 months ago" },
  ]},
  { id: "home", name: "Home & Family", years: "Always", contacts: [
    { id: "tom",   name: "Tom Reid",     lastSpoke: "Last spoke 2 months ago" },
    { id: "nadia", name: "Nadia Haddad", lastSpoke: "Last spoke last weekend" },
    { id: "priya", name: "Priya Raman",  lastSpoke: "Last spoke 3 weeks ago" },
  ]},
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export interface CrewDetectionScreenProps {
  chapters?: CrewChapter[];
  onDone?: (selectedByChapter: Record<string, string[]>) => void;
}

export function CrewDetectionScreen({ chapters = SAMPLE_CHAPTERS, onDone }: CrewDetectionScreenProps) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const chapter = chapters[step];
  const isLast  = step === chapters.length - 1;

  const toggleContact = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const next = () => {
    if (isLast) {
      const byChapter: Record<string, string[]> = {};
      chapters.forEach((c) => {
        byChapter[c.id] = c.contacts.filter((ct) => selected[ct.id]).map((ct) => ct.id);
      });
      onDone?.(byChapter);
    } else {
      setStep((s) => s + 1);
    }
  };

  const selectedCount = chapter.contacts.filter((c) => selected[c.id]).length;

  return (
    <div data-screen-label="CrewDetection" style={{ minHeight: "100%", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }}></style>

      <div style={{ maxWidth: 600, width: "100%", margin: "0 auto", padding: "44px 32px 120px" }}>
        {/* step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 44 }}>
          <ProgressDots total={chapters.length} current={step}></ProgressDots>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            Chapter {step + 1} of {chapters.length}
          </div>
        </div>

        {/* header */}
        <header style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>{chapter.years}</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 34, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 10px" }}>{chapter.name}</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>Who mattered here?</p>
        </header>

        {/* contacts */}
        <div style={{ background: "var(--bg)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
          {chapter.contacts.map((c, i) => (
            <ContactRow key={c.id} contact={c} selected={!!selected[c.id]} onToggle={() => toggleContact(c.id)} divider={i > 0}></ContactRow>
          ))}
        </div>
      </div>

      {/* footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "16px 32px 28px", background: "linear-gradient(to top, var(--bg) 70%, transparent)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", gap: 14, alignItems: "center" }}>
          <Button variant="primary" onClick={next}>
            {isLast
              ? selectedCount > 0 ? `Done — ${selectedCount} ${selectedCount === 1 ? "person" : "people"}` : "Done"
              : "Next"}
          </Button>
          {selectedCount === 0 && (
            <Button variant="ghost" onClick={next}>Nobody from this one</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CrewDetectionScreen;
