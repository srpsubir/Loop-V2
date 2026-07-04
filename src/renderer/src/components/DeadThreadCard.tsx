import React, { useState } from 'react'
import type { Contact } from '@shared/types'

const SERIF = 'var(--font-serif)'
const SANS = 'var(--font-sans)'

interface DeadThreadCardProps {
  contact: Contact
  weeksSince: number
  onTryAgain?: () => void
  onLetItRest?: () => void
}

export function DeadThreadCard({ contact, weeksSince, onTryAgain, onLetItRest }: DeadThreadCardProps) {
  const [hovReachOut, setHovReachOut] = useState(false)
  const [hovLetItRest, setHovLetItRest] = useState(false)
  const firstName = contact.name.split(' ')[0] ?? contact.name
  const initials = contact.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <section
      aria-label={`Resting thread with ${contact.name}`}
      style={{
        background: 'var(--surface-raised)',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 1px 4px rgba(26,16,12,0.07)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'var(--text-on-accent)',
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {contact.name}
          </div>
        </div>
      </div>

      <p style={{
        fontFamily: SERIF,
        fontSize: 15,
        fontStyle: 'italic',
        color: 'var(--text-primary)',
        margin: '10px 0 0 0',
        lineHeight: 1.5,
      }}>
        You mentioned catching up with {firstName}. It has been {weeksSince} weeks.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={onTryAgain}
          onMouseEnter={() => setHovReachOut(true)}
          onMouseLeave={() => setHovReachOut(false)}
          style={{
            background: hovReachOut ? 'var(--accent-hover)' : 'var(--accent)',
            color: 'var(--text-on-accent)',
            borderRadius: 999,
            padding: '8px 18px',
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'background 120ms ease',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          Reach out
        </button>
        <button
          type="button"
          onClick={onLetItRest}
          onMouseEnter={() => setHovLetItRest(true)}
          onMouseLeave={() => setHovLetItRest(false)}
          style={{
            background: 'none',
            border: 'none',
            color: hovLetItRest ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontFamily: SANS,
            fontSize: 13,
            padding: '8px 10px',
            cursor: 'pointer',
            transition: 'color 120ms ease',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          Let it rest
        </button>
      </div>
    </section>
  )
}
