// MAV-53 — chapter inference screen (WhatsApp group detection)
import React, { useState, useEffect } from 'react'
import type { ChapterCandidate } from '@shared/types'

type CSS = React.CSSProperties

// ─── Design primitives ────────────────────────────────────────────────────────

function Avatar({ name, size = 32, ring = false }: { name: string; size?: number; ring?: boolean }) {
  // Masked/anonymised contact placeholders (e.g. "+70 ...8070", produced for both real
  // phone-number JIDs and WhatsApp's newer privacy-preserving @lid JIDs) always start
  // with "+" - running them through the human-name initials algorithm below produces
  // garbage ("+.") since it just takes the first character of each whitespace-split
  // token. Use a neutral placeholder instead of deriving fake initials from punctuation.
  const isMaskedContact = name.startsWith('+')
  const initials = isMaskedContact
    ? '\u2022'
    : name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const tints = ['#C49A8A', '#D4856E', '#6A9470', '#C49A8A', '#B8624A']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  // Stacked avatars need a ring matching the page background to read as
  // separate circles instead of merging into one blob at 31% overlap.
  const boxShadow = ring ? '0 0 0 2px var(--bg), var(--shadow-sm)' : 'var(--shadow-sm)'
  return (
    <div style={{ width: size, height: size, borderRadius: 'var(--radius-full)', flex: 'none', background: tints[h % tints.length], color: '#F9F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: Math.round(size * 0.38), letterSpacing: '0.01em', boxShadow }}>{initials}</div>
  )
}

function AvatarStack({ names }: { names: string[] }) {
  const show = names.slice(0, 4)
  const rest = names.length - show.length
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {show.map((n, i) => (
        <div key={n} style={{ marginLeft: i ? -8 : 0, position: 'relative', zIndex: show.length - i }}>
          <Avatar name={n} size={32} ring={i > 0} />
        </div>
      ))}
      {rest > 0 && (
        <div style={{ marginLeft: -8, width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'var(--surface-raised)', boxShadow: '0 0 0 2px var(--bg)', zIndex: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>+{rest}</div>
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
    <div data-screen-label="ChapterInference" style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* The footer used to be `position: fixed` overlaying this whole screen,
          with a bottom-padding magic number on the scroll content meant to
          "clear" it. That only worked when content was tall enough to
          actually scroll — with few candidates (e.g. an odd count leaving a
          lone card in the last row), content can be shorter than the
          viewport, so there's nothing to scroll past and the fixed footer
          permanently covers the last row regardless of any padding value
          (found live, 2026-07-14, 5-candidate case). Fix: footer is now a
          real flex sibling that always docks at the bottom — the scroll
          area above it just takes the remaining space, so no content length
          can ever conflict with it again. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '52px 40px 32px' }}>
          <header style={{ marginBottom: 44 }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 12px' }}>
              Loop found your chapters
            </h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0, maxWidth: 500 }}>
              These are named from your group chats for now — you'll get to make them feel like yours next. Confirm the ones that feel right.
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
      </div>

      <div style={{ flex: 'none', zIndex: 10, padding: '16px 40px 28px', background: 'linear-gradient(to top, var(--bg) 70%, transparent)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center' }}>
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
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Reading your groups…
        </div>
      </div>
    )
  }

  return <ChapterInferenceView chapters={chapters} onConfirm={handleConfirm} onSkip={onSkip} />
}
