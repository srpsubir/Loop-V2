// ChaptersScreen.tsx — Loop (MAV-48)
// Destination: src/renderer/src/screens/ChaptersScreen.tsx
//
// Design source of truth: Loop Design System → "MAV-48 Chapters.html"
// Self-contained: depends only on react. No icon library — inline SVG glyphs.
// Inlined Loop DS primitives (PaperCard, Avatar, Button); swap for design-system
// imports if the app ships them — props match.
//
// TODO(loop): replace SAMPLE_CHAPTERS with real data from the chapter store.
// TODO(loop): wire coverUrl to the real photo store / image-slot component.

import React, { useState } from "react";

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
  --rose: #C49A8A; --terracotta-light: #D4856E; --sage: #6A9470;
  --border: #DDD0C0; --border-light: #EDE3D5;
  --font-serif: "Lora", Georgia, serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-md: 12px; --radius-lg: 18px; --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgba(42,31,27,0.05), 0 1px 3px rgba(42,31,27,0.04);
  --shadow-md: 0 1px 2px rgba(42,31,27,0.05), 0 4px 12px rgba(42,31,27,0.07);
  --shadow-lg: 0 2px 4px rgba(42,31,27,0.06), 0 8px 24px rgba(42,31,27,0.10);
  --shadow-xl: 0 4px 10px rgba(42,31,27,0.08), 0 24px 56px rgba(42,31,27,0.16);
  --shadow-inset: inset 0 1px 3px rgba(42,31,27,0.08);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --duration-fast: 120ms; --duration-base: 200ms;
}`;

// ---------------------------------------------------------------------------
// Private DS primitives
// ---------------------------------------------------------------------------

function Avatar({ name, size = 26 }: { name: string; size?: number }) {
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

function AvatarStack({ people }: { people: { id: string; name: string }[] }) {
  return (
    <div style={{ display: "flex" }}>
      {people.slice(0, 4).map((p, i) => (
        <div key={p.id} style={{ marginLeft: i ? -8 : 0, zIndex: 4 - i, position: "relative" }}>
          <Avatar name={p.name} size={26}></Avatar>
        </div>
      ))}
    </div>
  );
}

function Button({ variant = "secondary", onClick, children }: {
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void; children?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const styles: Record<string, CSS> = {
    primary: { background: "var(--accent)", color: "var(--text-on-accent)", boxShadow: "var(--shadow-sm)" },
    secondary: { background: "var(--surface-raised)", color: "var(--text-primary)", boxShadow: "var(--shadow-sm)" },
    ghost: { background: "transparent", color: "var(--accent)" },
  };
  const hoverBg: Record<string, string> = {
    primary: "var(--accent-hover)", secondary: "var(--terracotta-faint)", ghost: "var(--terracotta-faint)",
  };
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        height: 36, padding: "0 16px",
        fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
        borderRadius: "var(--radius-full)", border: "none", cursor: "pointer",
        userSelect: "none",
        transition: "background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)",
        ...styles[variant],
        ...(hover ? { background: hoverBg[variant] } : {}),
        ...(press ? { transform: "scale(0.985)" } : {}),
      }}
    >{children}</button>
  );
}

// ---------------------------------------------------------------------------
// Cover photo
// ---------------------------------------------------------------------------

// Warm duotone CSS filter matching Loop's photo treatment (readme spec).
const WARM_FILTER = "sepia(.32) saturate(1.05) hue-rotate(-8deg)";

function CoverPhoto({ src, alt, height = 200 }: { src?: string; alt: string; height?: number }) {
  if (src) {
    return (
      <img src={src} alt={alt} style={{
        width: "100%", height, objectFit: "cover", display: "block",
        filter: WARM_FILTER,
      }} />
    );
  }
  // placeholder when no photo assigned yet
  return (
    <div style={{
      width: "100%", height, background: "var(--surface)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3"/>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline node
// ---------------------------------------------------------------------------

function TimelineNode({ active }: { active: boolean }) {
  return (
    <div style={{
      width: active ? 14 : 10, height: active ? 14 : 10,
      borderRadius: "50%", flex: "none",
      background: active ? "var(--accent)" : "var(--bg)",
      border: active ? "none" : "2px solid var(--border)",
      boxShadow: active ? "0 0 0 3px var(--terracotta-faint)" : "none",
      marginTop: 28,
      transition: "all var(--duration-base) var(--ease-out)",
    }}></div>
  );
}

// ---------------------------------------------------------------------------
// Chapter card
// ---------------------------------------------------------------------------

export interface ChapterPerson { id: string; name: string }

export interface Chapter {
  id: string;
  title: string;
  location: string;
  years: string;
  active?: boolean;
  coverUrl?: string;            // optional — shows placeholder when absent
  blurb: string;
  people: ChapterPerson[];
  peopleCount: number;          // total, including those not in `people`
}

function ChapterCard({ chapter, onClick }: { chapter: Chapter; onClick?: () => void }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: "var(--radius-lg)", overflow: "hidden",
        background: "var(--bg)",
        boxShadow: chapter.active
          ? "0 2px 4px rgba(42,31,27,0.07), 0 8px 24px rgba(42,31,27,0.12)"
          : hov ? "var(--shadow-lg)" : "var(--shadow-md)",
        transform: hov ? "translateY(-2px)" : "none",
        transition: "box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {/* cover */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <CoverPhoto src={chapter.coverUrl} alt={chapter.title} height={200}></CoverPhoto>
        {/* scrim */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(42,31,27,0.62) 0%, rgba(42,31,27,0.1) 50%, transparent 100%)",
        }}></div>
        {/* text over photo */}
        <div style={{ position: "absolute", bottom: 20, left: 22, right: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: "rgba(249,245,238,0.75)", whiteSpace: "nowrap",
            }}>{chapter.years}</div>
            {chapter.active && (
              <div style={{
                fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700,
                letterSpacing: ".06em", textTransform: "uppercase",
                background: "var(--accent)", color: "var(--text-on-accent)",
                padding: "2px 9px", borderRadius: "var(--radius-full)",
              }}>Now</div>
            )}
          </div>
          <div style={{
            fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600,
            color: "#FBF7F0", letterSpacing: "-0.01em", lineHeight: 1.2,
            textShadow: "0 1px 8px rgba(42,31,27,0.3)",
          }}>{chapter.title}</div>
        </div>
      </div>

      {/* body */}
      <div style={{ padding: "16px 22px 20px" }}>
        <p style={{
          fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 16,
          color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 16px",
        }}>{chapter.blurb}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AvatarStack people={chapter.people}></AvatarStack>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
            {chapter.peopleCount} {chapter.peopleCount === 1 ? "person" : "people"}
          </span>
          <div style={{ flex: 1 }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}>
            {/* map pin */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>{chapter.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

// TODO(loop): replace with real chapter store data.
const SAMPLE_CHAPTERS: Chapter[] = [
  {
    id: "home", title: "Home & Family", location: "Always here", years: "Always",
    active: true,
    blurb: "The people who were there before any of it, and will be after.",
    people: [{ id: "tom", name: "Tom Reid" }, { id: "nadia", name: "Nadia Haddad" }, { id: "priya", name: "Priya Raman" }, { id: "jo", name: "Jo Okafor" }],
    peopleCount: 5,
  },
  {
    id: "edinburgh", title: "Edinburgh Masters", location: "Edinburgh", years: "2019 – 2020",
    blurb: "One year up north. Cold mornings, long walks, the crew that got you through it.",
    people: [{ id: "priya", name: "Priya Raman" }, { id: "nadia", name: "Nadia Haddad" }, { id: "tom", name: "Tom Reid" }, { id: "sam", name: "Sam Whitfield" }],
    peopleCount: 4,
  },
  {
    id: "london", title: "The London Years", location: "London", years: "2014 – 2019",
    blurb: "Five years, three flats, and the people who made a huge city feel small.",
    people: [{ id: "jo", name: "Jo Okafor" }, { id: "marcus", name: "Marcus Bell" }, { id: "danny", name: "Danny Mensah" }, { id: "sam", name: "Sam Whitfield" }],
    peopleCount: 5,
  },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export interface ChaptersScreenProps {
  chapters?: Chapter[];
  onOpenChapter?: (id: string) => void;
  onAddChapter?: () => void;
}

export function ChaptersScreen({
  chapters = SAMPLE_CHAPTERS,
  onOpenChapter,
  onAddChapter,
}: ChaptersScreenProps) {
  return (
    <div data-screen-label="Chapters" style={{ background: "var(--bg)", minHeight: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }}></style>

      <div style={{ maxWidth: 840, margin: "0 auto", padding: "40px 56px 80px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <div style={{
              fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: "var(--text-muted)", marginBottom: 6, whiteSpace: "nowrap",
            }}>Your life in chapters</div>
            <h1 style={{
              fontFamily: "var(--font-serif)", fontSize: 34, fontWeight: 600,
              color: "var(--text-primary)", letterSpacing: "-0.02em",
              lineHeight: 1.15, margin: 0,
            }}>Chapters</h1>
          </div>
          <Button variant="secondary" onClick={onAddChapter}>
            {/* plus icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New chapter
          </Button>
        </div>

        {/* timeline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {chapters.map((chapter, i) => (
            <div key={chapter.id} style={{ display: "flex", gap: 28 }}>
              {/* rail */}
              <div style={{ width: 20, flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <TimelineNode active={!!chapter.active}></TimelineNode>
                {i < chapters.length - 1 && (
                  <div style={{
                    flex: 1, width: 2, marginTop: 6, minHeight: 28,
                    background: "linear-gradient(to bottom, var(--border), var(--border-light))",
                  }}></div>
                )}
              </div>
              {/* card */}
              <div style={{ flex: 1, paddingBottom: i < chapters.length - 1 ? 28 : 0 }}>
                <ChapterCard
                  chapter={chapter}
                  onClick={onOpenChapter ? () => onOpenChapter(chapter.id) : undefined}
                ></ChapterCard>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChaptersScreen;
