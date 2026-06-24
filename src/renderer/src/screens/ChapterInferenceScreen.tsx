// MAV-53 — chapter inference screen (WhatsApp group detection)
import React, { useState, useEffect } from 'react'
import type { ChapterCandidate } from '@shared/types'

type CSS = React.CSSProperties

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
}`

// ─── Design primitives ────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const tints = ['#C49A8A', '#D4856E', '#6A9470', '#C49A8A', '#B8624A']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return (
    <div style={{ width: size, height: size, borderRadius: 'var(--radius-full)', flex: 'none', background: tints[h % tints.length], color: '#F9F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: Math.round(size * 0.38), letterSpacing: '0.01em', boxShadow: 'var(--shadow-sm)' }}>{initials}</div>
  )
}

function AvatarStack({ names }: { names: string[] }) {
  const show = names.slice(0, 4)
  const rest = names.length - show.length
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {show.map((n, i) => (
        <div key={n} style={{ marginLeft: i ? -10 : 0, position: 'relative', zIndex: show.length - i }}>
          <Avatar name={n} size={32} />
        </div>
      ))}
      {rest > 0 && (
        <div style={{ marginLeft: -10, width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'var(--surface-raised)', zIndex: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>+{rest}</div>
      )}
    </div>
  )
}

function Btn({ variant = 'primary', disabled = false, onClick, children }: {
  variant?: 'primary' | 'ghost'; disabled?: boolean
  onClick?: () => void; children?: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  return (
    <button type="button" onClick={!disabled ? onClick : undefined} disabled={disabled}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false) }}
      onMouseDown={() => !disabled && setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        height: 44, padding: '0 24px',
        fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
        borderRadius: 'var(--radius-full)', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
        opacity: disabled ? 0.4 : 1,
        transition: 'all var(--duration-fast) var(--ease-out)',
        ...(variant === 'primary'
          ? { background: hover ? 'var(--accent-hover)' : 'var(--accent)', color: 'var(--text-on-accent)', boxShadow: 'var(--shadow-sm)' }
          : { background: 'transparent', color: 'var(--accent)' }),
        ...(press ? { transform: 'scale(0.985)' } : {}),
      } as CSS}
    >{children}</button>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface InferredChapter {
  id: string
  name: string
  years: string
  status: 'active' | 'closed'
  memberNames: string[]
  memberCount: number
}

function candidateToInferred(c: ChapterCandidate): InferredChapter {
  let years: string
  if (c.active) {
    years = c.inferredStartYear ? `${c.inferredStartYear} – now` : 'Ongoing'
  } else if (c.inferredStartYear && c.inferredEndYear) {
    years = `${c.inferredStartYear} – ${c.inferredEndYear}`
  } else if (c.inferredEndYear) {
    years = `Until ${c.inferredEndYear}`
  } else {
    years = 'Past'
  }

  const memberNames = c.memberJids.map((jid) => {
    const phone = jid.replace(/@.*$/, '')
    return phone.length >= 8 ? `+${phone.slice(0, 2)} ···${phone.slice(-4)}` : phone
  })

  return {
    id: c.waJid,
    name: c.name,
    years,
    status: c.active ? 'active' : 'closed',
    memberNames,
    memberCount: c.memberCount,
  }
}

// ─── Chapter card ─────────────────────────────────────────────────────────────

function ChapterCard({ chapter, confirmed, onToggle }: {
  chapter: InferredChapter; confirmed: boolean; onToggle: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      role="button" tabIndex={0} onClick={onToggle}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        background: confirmed ? 'var(--terracotta-faint)' : 'var(--bg)',
        boxShadow: confirmed ? '0 2px 4px rgba(42,31,27,0.07), 0 8px 24px rgba(42,31,27,0.11)' : hov ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        border: `1.5px solid ${confirmed ? 'rgba(184,98,74,0.18)' : 'transparent'}`,
        transform: hov ? 'translateY(-1px)' : 'none',
        transition: 'all var(--duration-base) var(--ease-out)',
        cursor: 'pointer', padding: '24px 22px 22px',
      } as CSS}
    >
      {confirmed && (
        <div style={{ position: 'absolute', top: 14, right: 14, width: 26, height: 26, borderRadius: 'var(--radius-full)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
            <path d="M1.5 5.5L5 9L11.5 1.5" stroke="#FEFCF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: 1, padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'var(--surface)', whiteSpace: 'nowrap' }}>{chapter.years}</span>
        {chapter.status === 'active' && (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--positive)', lineHeight: 1, padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'var(--positive-faint)' }}>Ongoing</span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 18 }}>{chapter.name}</div>
      <AvatarStack names={chapter.memberNames} />
    </div>
  )
}

// ─── Inner view (CD design) ───────────────────────────────────────────────────

function ChapterInferenceView({ chapters, onConfirm, onSkip }: {
  chapters: InferredChapter[]
  onConfirm: (ids: string[]) => void
  onSkip: () => void
}) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())

  const toggle = (id: string) => setConfirmed((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const count = confirmed.size

  return (
    <div data-screen-label="ChapterInference" style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }} />

      <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '52px 40px 120px' }}>
        <header style={{ marginBottom: 44 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
            Step 2 of 5
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 12px' }}>
            Loop found your chapters
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0, maxWidth: 500 }}>
            These are the chapters of your life, read from your conversations. Confirm the ones that feel right.
          </p>
        </header>

        {chapters.length === 0 ? (
          <div style={{ padding: '40px 0', fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No chapters detected yet. Your groups may not have enough history, or WhatsApp may still be loading.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {chapters.map((c) => (
              <ChapterCard key={c.id} chapter={c} confirmed={confirmed.has(c.id)} onToggle={() => toggle(c.id)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '16px 40px 28px', background: 'linear-gradient(to top, var(--bg) 70%, transparent)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          <Btn variant="primary" disabled={count === 0} onClick={() => onConfirm([...confirmed])}>
            {count === 0 ? 'These are my chapters' : `These are my chapters (${count})`}
          </Btn>
          <Btn variant="ghost" onClick={onSkip}>Not quite right</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Screen (data-fetching wrapper) ──────────────────────────────────────────

export function ChapterInferenceScreen({ onComplete, onSkip }: {
  onComplete: () => void
  onSkip: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [chapters, setChapters] = useState<InferredChapter[]>([])

  useEffect(() => {
    window.loop.chapters.detect()
      .then((candidates) => setChapters(candidates.map(candidateToInferred)))
      .catch(() => setChapters([]))
      .finally(() => setLoading(false))
  }, [])

  const handleConfirm = async (confirmedIds: string[]) => {
    await window.loop.chapters.confirm(confirmedIds)
    onComplete()
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }} />
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Reading your groups…
        </div>
      </div>
    )
  }

  return <ChapterInferenceView chapters={chapters} onConfirm={handleConfirm} onSkip={onSkip} />
}
