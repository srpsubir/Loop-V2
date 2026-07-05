import React, { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Person {
  id: string
  name: string
}

interface Props {
  onContinue: (selectedIds: string[]) => void
}

// ─── Placeholder people (shown before contacts are available) ─────────────────

const PLACEHOLDER_PEOPLE: Person[] = [
  { id: 'p1', name: 'Arjun' },
  { id: 'p2', name: 'Sofia' },
  { id: 'p3', name: 'Marcus' },
  { id: 'p4', name: 'Priya' },
  { id: 'p5', name: 'Jamie' },
  { id: 'p6', name: 'Nadia' },
  { id: 'p7', name: 'Thomas' },
  { id: 'p8', name: 'Leila' },
  { id: 'p9', name: 'Kai' },
  { id: 'p10', name: 'Maya' },
  { id: 'p11', name: 'Ravi' },
  { id: 'p12', name: 'Elena' },
]

// ─── Avatar tile ─────────────────────────────────────────────────────────────

function AvatarTile({
  person,
  selected,
  onToggle,
}: {
  person: Person
  selected: boolean
  onToggle: () => void
}) {
  const [hov, setHov] = useState(false)
  const initial = person.name.charAt(0).toUpperCase()

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={person.name}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        outline: 'none',
        padding: '8px 4px',
        borderRadius: 'var(--radius-md)',
        background: hov ? 'rgba(128,80,56,0.06)' : 'transparent',
        transition: 'background var(--duration-fast) var(--ease-out)',
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {/* Avatar circle */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          fontSize: 28,
          fontWeight: 600,
          flexShrink: 0,
          boxShadow: selected
            ? '0 0 0 3px var(--accent)'
            : '0 0 0 2px rgba(184,98,74,0.25)',
          transition: 'box-shadow var(--duration-fast) var(--ease-out)',
          opacity: selected ? 1 : 0.6,
        }}
      >
        {initial}
      </div>

      {/* Name */}
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--text-primary)',
          textAlign: 'center',
          lineHeight: 1.3,
          userSelect: 'none',
        }}
      >
        {person.name}
      </span>
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function OnboardingBeat3Screen({ onContinue }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const count = selected.size
  const canContinue = count >= 3

  const handleContinue = async () => {
    if (!canContinue) return
    const ids = Array.from(selected)
    try {
      await window.loop.state.patch({ manuallySelected: ids })
    } catch { /* best-effort */ }
    onContinue(ids)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '40px 32px 48px',
        boxSizing: 'border-box',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {/* Headline */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: 32,
            lineHeight: 1.45,
            letterSpacing: '-0.005em',
            color: 'var(--text-primary)',
            textAlign: 'center',
            margin: 0,
            maxWidth: 480,
          }}
        >
          Who do you want to make sure you never lose touch with?
        </h1>

        {/* Subline */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            margin: '14px 0 0',
          }}
        >
          Pick 3 to 5. You can always change this later.
        </p>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 28,
            marginTop: 40,
            width: '100%',
          }}
        >
          {PLACEHOLDER_PEOPLE.map((person) => (
            <AvatarTile
              key={person.id}
              person={person}
              selected={selected.has(person.id)}
              onToggle={() => toggle(person.id)}
            />
          ))}
        </div>

        {/* Counter */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: 24,
          }}
        >
          {count === 0 ? 'None selected yet' : `${count} selected`}
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          style={{
            marginTop: 32,
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            padding: '14px 32px',
            cursor: canContinue ? 'pointer' : 'default',
            opacity: canContinue ? 1 : 0.5,
            transition: 'opacity var(--duration-fast) var(--ease-out)',
          } as React.CSSProperties}
        >
          These are my people
        </button>
      </div>
    </div>
  )
}
