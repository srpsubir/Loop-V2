// SettingsScreen.tsx — Loop (MAV-45)
// Destination: src/renderer/src/screens/SettingsScreen.tsx
//
// Design source of truth: Loop Design System → "MAV-45 Settings.html".
// Self-contained: depends only on react + lucide-react. The private UI
// primitives below are 1:1 ports of the Loop design system components
// (PaperCard, SegmentedControl, Switch, Button, IconButton, Avatar,
// PersonRow, Dialog, Toast). If the app already ships these from the design
// system, swap the local copies for imports — the props match.
//
// Tokens: reads the Loop CSS variables (--bg, --accent, …). A fallback
// token block is injected once and is harmless if styles.css is loaded.

import React, { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Trash2, Folder } from "lucide-react";

type CSS = React.CSSProperties;

// ---------------------------------------------------------------------------
// Tokens (fallback — identical to design-system tokens/*.css)
// ---------------------------------------------------------------------------

const TOKEN_CSS = `
:root {
  --bg: #F9F5EE; --surface: #EFE6D6; --surface-raised: #E8DBCA;
  --text-primary: #2A1F1B; --text-secondary: #6B5447; --text-muted: #A38F85;
  --text-on-accent: #F9F5EE;
  --accent: #B8624A; --accent-hover: #A6543E; --terracotta-faint: #F5EAD8;
  --rose: #C49A8A; --terracotta-light: #D4856E;
  --positive: #6A9470; --positive-faint: #EAF2EB; --sage: #6A9470;
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
// Private UI primitives (ports of Loop design-system components)
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

type SegmentOption = { value: string; label: string };

function SegmentedControl({ options, value, onChange, style }: {
  options: SegmentOption[]; value: string;
  onChange?: (value: string) => void; style?: CSS;
}) {
  return (
    <div role="tablist" style={{
      display: "inline-flex", padding: 3, gap: 2,
      background: "var(--surface)", borderRadius: "var(--radius-full)",
      boxShadow: "var(--shadow-inset)", fontFamily: "var(--font-sans)", ...style,
    }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value} type="button" role="tab" aria-selected={active}
            onClick={() => onChange && onChange(opt.value)}
            style={{
              border: "none", cursor: "pointer", padding: "6px 16px",
              fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)",
              borderRadius: "var(--radius-full)",
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              background: active ? "var(--bg)" : "transparent",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              transition: "all var(--duration-fast) var(--ease-out)",
            }}
          >{opt.label}</button>
        );
      })}
    </div>
  );
}

function Switch({ checked = false, onChange }: {
  checked?: boolean; onChange?: (next: boolean) => void;
}) {
  return (
    <button
      type="button" role="switch" aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: 42, height: 24, borderRadius: "var(--radius-full)",
        background: checked ? "var(--accent)" : "var(--surface-raised)",
        boxShadow: checked ? "var(--shadow-sm)" : "var(--shadow-inset)",
        position: "relative", border: "none", padding: 0, cursor: "pointer",
        flex: "none", transition: "background var(--duration-base) var(--ease-out)",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 21 : 3,
        width: 18, height: 18, borderRadius: "var(--radius-full)",
        background: "var(--bg)", boxShadow: "0 1px 2px rgba(42,31,27,0.25)",
        transition: "left var(--duration-base) var(--ease-out)",
      }}></span>
    </button>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

function Button({ variant = "primary", size = "md", onClick, children }: {
  variant?: ButtonVariant; size?: "sm" | "md";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const variants: Record<ButtonVariant, CSS> = {
    primary: { background: "var(--accent)", color: "var(--text-on-accent)", boxShadow: "var(--shadow-sm)" },
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
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: 8, height: size === "sm" ? 30 : 38, padding: size === "sm" ? "0 12px" : "0 18px",
        fontFamily: "var(--font-sans)", fontSize: size === "sm" ? 13 : 14, fontWeight: 600,
        lineHeight: 1, borderRadius: "var(--radius-full)", border: "none",
        cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
        transition: "background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)",
        ...variants[variant],
        ...(hover ? { background: hoverBg[variant] } : null),
        ...(press ? { transform: "translateY(0.5px) scale(0.985)" } : null),
      }}
    >{children}</button>
  );
}

function IconButton({ icon, label, onClick, size = 36 }: {
  icon: React.ReactNode; label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; size?: number;
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  return (
    <button
      type="button" aria-label={label} title={label} onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: "var(--radius-full)",
        border: "none", cursor: "pointer",
        background: hover ? "var(--surface-raised)" : "transparent",
        color: "var(--text-secondary)",
        transform: press ? "scale(0.92)" : "none",
        transition: "background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)",
      }}
    >{icon}</button>
  );
}

function Avatar({ name, size = 46, ring = "none" }: {
  name: string; size?: number; ring?: "none" | "sage" | "terracotta";
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const tints = ["var(--rose)", "var(--terracotta-light)", "var(--sage)", "var(--rose)", "var(--accent)"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const ringColor = ring === "sage" ? "var(--sage)" : ring === "terracotta" ? "var(--accent)" : null;
  return (
    <div style={{
      width: size, height: size, borderRadius: "var(--radius-full)", flex: "none",
      boxShadow: ringColor ? `0 0 0 2px var(--bg), 0 0 0 4px ${ringColor}` : "var(--shadow-sm)",
    }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: "var(--radius-full)",
        background: tints[h % tints.length], color: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-sans)", fontWeight: 600,
        fontSize: Math.round(size * 0.38), letterSpacing: "0.01em",
      }}>{initials}</div>
    </div>
  );
}

function PersonRow({ name, note, ring, trailing }: {
  name: string; note: string; ring: "none" | "sage"; trailing?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 8px 10px 12px" }}>
      <Avatar name={name} size={46} ring={ring}></Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500,
          color: "var(--text-primary)", lineHeight: 1.25,
        }}>{name}</div>
        <div style={{
          fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)",
          marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{note}</div>
      </div>
      {trailing && <div style={{ flex: "none" }}>{trailing}</div>}
    </div>
  );
}

function Dialog({ open, onClose, icon, title, description, footer }: {
  open: boolean; onClose: () => void; icon?: React.ReactNode;
  title: string; description: string; footer: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 24,
        background: "rgba(42, 31, 27, 0.32)",
        backdropFilter: "saturate(1.05) blur(1px)",
        animation: "loopDialogScrim var(--duration-base) var(--ease-out)",
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={title}
        style={{
          width: "100%", maxWidth: 440, background: "var(--bg)",
          borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)",
          padding: 28, fontFamily: "var(--font-sans)",
          animation: "loopDialogIn var(--duration-base) var(--ease-out)",
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
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600,
          color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: 1.25,
        }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 8 }}>
          {description}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          {footer}
        </div>
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
      ` }}></style>
    </div>
  );
}

type ToastState = {
  message: string;
  tone: "neutral" | "positive";
  action?: { label: string; onClick: () => void };
} | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const dotColor = toast.tone === "positive" ? "var(--sage)" : "var(--accent)";
  return (
    <div
      role="status" aria-live="polite"
      style={{
        position: "fixed", left: "50%", bottom: 32, transform: "translateX(-50%)",
        zIndex: 120, display: "inline-flex", alignItems: "center", gap: 12,
        maxWidth: "min(92vw, 420px)",
        padding: toast.action ? "12px 12px 12px 18px" : "13px 20px",
        background: "var(--bg)", borderRadius: "var(--radius-full)",
        boxShadow: "var(--shadow-xl)", fontFamily: "var(--font-sans)",
        animation: "loopToastIn var(--duration-base) var(--ease-out)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: dotColor, flex: "none" }}></span>
      <span style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.4 }}>{toast.message}</span>
      {toast.action && (
        <button
          type="button" onClick={toast.action.onClick}
          style={{
            flex: "none", border: "none", cursor: "pointer",
            background: "var(--surface-raised)", color: "var(--accent)",
            fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
            padding: "7px 14px", borderRadius: "var(--radius-full)",
          }}
        >{toast.action.label}</button>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loopToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px) }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="status"] { animation: none !important }
        }
      ` }}></style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings data
// ---------------------------------------------------------------------------

const DAYS: SegmentOption[] = [
  { value: "mon", label: "Mon" }, { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" }, { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" }, { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];
const DAY_NAMES: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};
const COOLDOWNS: SegmentOption[] = [
  { value: "1h", label: "1h" }, { value: "4h", label: "4h" },
  { value: "12h", label: "12h" }, { value: "24h", label: "24h" },
];
const TIERS: SegmentOption[] = [
  { value: "warm", label: "Warm" },
  { value: "close", label: "Close" },
];

type Tier = "warm" | "close";
interface Person { id: string; name: string; tier: Tier; note: string }

// TODO(loop): replace sample people with the real store.
const INITIAL_PEOPLE: Person[] = [
  { id: "priya",  name: "Priya Raman",   tier: "close", note: "Last spoke 3 weeks ago · Edinburgh" },
  { id: "jo",     name: "Jo Okafor",     tier: "close", note: "Last spoke on Tuesday · London" },
  { id: "marcus", name: "Marcus Bell",   tier: "warm",  note: "You last spoke in the spring · London" },
  { id: "nadia",  name: "Nadia Haddad",  tier: "close", note: "Last spoke last weekend · Edinburgh" },
  { id: "sam",    name: "Sam Whitfield", tier: "warm",  note: "Quietly drifting · Bristol" },
];

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function Section({ label, children, footnote }: {
  label: string; children?: React.ReactNode; footnote?: string;
}) {
  return (
    <section>
      <div style={{
        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
        letterSpacing: ".08em", textTransform: "uppercase",
        color: "var(--text-muted)", margin: "0 0 10px 6px",
      }}>{label}</div>
      <PaperCard padding={6}>{children}</PaperCard>
      {footnote && (
        <p style={{
          fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.55,
          color: "var(--text-muted)", margin: "10px 6px 0",
        }}>{footnote}</p>
      )}
    </section>
  );
}

function Row({ title, sub, control, stacked = false, divider = false }: {
  title: string; sub?: string; control?: React.ReactNode;
  stacked?: boolean; divider?: boolean;
}) {
  const titleEl = (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 500,
        color: "var(--text-primary)", lineHeight: 1.4,
      }}>{title}</div>
      {sub && (
        <div style={{
          fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.55,
          color: "var(--text-muted)", marginTop: 3, maxWidth: 400,
          textWrap: "pretty" as CSS["textWrap"],
        }}>{sub}</div>
      )}
    </div>
  );
  return (
    <div style={{ padding: "14px 14px", borderTop: divider ? "1px solid var(--border-light)" : "none" }}>
      {stacked ? (
        <div>{titleEl}<div style={{ marginTop: 14 }}>{control}</div></div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{titleEl}</div>
          <div style={{ flex: "none" }}>{control}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export interface SettingsScreenProps { onBack?: () => void }

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [scanDay, setScanDay] = useState("sat");
  const [cooldown, setCooldown] = useState("4h");
  const [notify, setNotify] = useState(true);
  const [connected, setConnected] = useState(true);
  const [people, setPeople] = useState<Person[]>(INITIAL_PEOPLE);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const dayName = DAY_NAMES[scanDay];

  const removePerson = (p: Person) => {
    const before = people;
    setPeople(before.filter((x) => x.id !== p.id));
    setToast({
      message: `${p.name.split(" ")[0]} won't come up anymore.`,
      tone: "neutral",
      action: { label: "Undo", onClick: () => { setPeople(before); setToast(null); } },
    });
  };

  const toggleConnection = () => {
    const next = !connected;
    setConnected(next);
    setToast(next
      ? { message: `Connected. Loop will read on ${dayName}.`, tone: "positive" }
      : { message: "Disconnected. Loop keeps what it already remembers.", tone: "neutral" });
  };

  const deleteAll = () => {
    setConfirmOpen(false);
    // TODO(loop): wire to the real wipe.
    setToast({ message: "Loop's memory is cleared.", tone: "neutral" });
  };

  return (
    <div data-screen-label="Settings" style={{ minHeight: "100%", background: "var(--bg)" }}>
      <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }}></style>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 0" }}>
        <IconButton label="Back" onClick={onBack} icon={<ArrowLeft size={19} strokeWidth={2}></ArrowLeft>}></IconButton>
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "10px 24px 80px" }}>
        <header style={{ margin: "18px 6px 30px" }}>
          <h1 style={{
            fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 600,
            color: "var(--text-primary)", letterSpacing: "-0.01em", margin: 0,
          }}>Settings</h1>
          <p style={{
            fontFamily: "var(--font-sans)", fontSize: 14.5, lineHeight: 1.55,
            color: "var(--text-secondary)", margin: "8px 0 0",
          }}>How Loop listens, and who it listens for.</p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <Section label="Scanning">
            <Row
              stacked title="Scan day"
              sub="Once a week, Loop sits down with your conversations. Pick the day."
              control={<SegmentedControl options={DAYS} value={scanDay} onChange={setScanDay}></SegmentedControl>}
            ></Row>
            <Row
              divider title="Cooldown"
              sub="How long Loop rests before mentioning the same person again."
              control={<SegmentedControl options={COOLDOWNS} value={cooldown} onChange={setCooldown}></SegmentedControl>}
            ></Row>
            <Row
              divider title="Notifications"
              sub="A quiet note when someone's worth a look. Never a nag."
              control={<Switch checked={notify} onChange={setNotify}></Switch>}
            ></Row>
          </Section>

          <Section label="WhatsApp">
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px" }}>
              <div style={{
                width: 42, height: 42, borderRadius: "var(--radius-full)", flex: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: connected ? "var(--positive-faint)" : "var(--surface)",
                color: connected ? "var(--positive)" : "var(--text-muted)",
                transition: "all var(--duration-base) var(--ease-out)",
              }}>
                <MessageCircle size={20} strokeWidth={2}></MessageCircle>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
                  WhatsApp
                </div>
                <div style={{
                  fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.5,
                  color: connected ? "var(--positive)" : "var(--text-muted)", marginTop: 3,
                }}>
                  {connected
                    ? `Connected — Loop reads on ${dayName}s, never in between.`
                    : "Not connected. Loop can only remember what it can see."}
                </div>
              </div>
              <Button variant={connected ? "secondary" : "primary"} size="sm" onClick={toggleConnection}>
                {connected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          </Section>

          <Section
            label="People"
            footnote="Removing someone only removes them from Loop — your actual conversations are never touched."
          >
            {people.map((p, i) => (
              <div key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-light)" }}>
                <PersonRow
                  name={p.name} note={p.note} ring={p.tier === "close" ? "sage" : "none"}
                  trailing={
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <SegmentedControl
                        options={TIERS} value={p.tier}
                        onChange={(tier) => setPeople(people.map((x) => (x.id === p.id ? { ...x, tier: tier as Tier } : x)))}
                      ></SegmentedControl>
                      <IconButton
                        size={30} label={`Remove ${p.name.split(" ")[0]}`}
                        onClick={() => removePerson(p)}
                        icon={<Trash2 size={16} strokeWidth={2}></Trash2>}
                      ></IconButton>
                    </div>
                  }
                ></PersonRow>
              </div>
            ))}
            {people.length === 0 && (
              <div style={{
                padding: "26px 14px", textAlign: "center",
                fontFamily: "var(--font-serif)", fontStyle: "italic",
                fontSize: 15, color: "var(--text-muted)",
              }}>No one yet. Loop will suggest people as it reads.</div>
            )}
          </Section>

          <Section label="Data">
            <Row
              stacked title="Where Loop keeps things"
              sub="Everything stays on this Mac, in one folder."
              control={
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: "var(--radius-md)",
                  background: "var(--surface)", boxShadow: "var(--shadow-inset)",
                  color: "var(--text-secondary)",
                }}>
                  <Folder size={16} strokeWidth={2} color="var(--text-muted)" style={{ flex: "none" }}></Folder>
                  <span style={{
                    fontFamily: "var(--font-sans)", fontSize: 13,
                    fontVariantNumeric: "tabular-nums",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>~/Library/Application Support/Loop</span>
                </div>
              }
            ></Row>
            <Row
              divider title="Delete all data"
              sub="Every chapter, crew, and memory — gone for good."
              control={
                <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>
                  Delete all data
                </Button>
              }
            ></Row>
          </Section>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        icon={<Trash2 size={20} strokeWidth={2}></Trash2>}
        title="Delete everything?"
        description="This clears every person, chapter, and memory Loop holds — it can't be undone. Your actual conversations aren't touched."
        footer={
          <React.Fragment>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Keep everything</Button>
            <Button variant="primary" onClick={deleteAll}>Delete it all</Button>
          </React.Fragment>
        }
      ></Dialog>

      <Toast toast={toast} onClose={() => setToast(null)}></Toast>
    </div>
  );
}

export default SettingsScreen;
