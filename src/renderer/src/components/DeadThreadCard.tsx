import React, { useState } from 'react'

interface DeadThreadCardProps {
  contactName: string
  contactInitials: string
  onTryAgain?: () => void
  onLetItRest?: () => void
}

export function DeadThreadCard({
  contactName,
  contactInitials,
  onTryAgain,
  onLetItRest,
}: DeadThreadCardProps) {
  const [hovTryAgain, setHovTryAgain] = useState(false)
  const [hovLetItRest, setHovLetItRest] = useState(false)

  return (
    <section
      aria-label={`Resting thread with ${contactName}`}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: '50%',
            backgroundColor: 'rgba(184,98,74,0.12)',
            color: 'var(--accent)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {contactInitials}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            marginBottom: 2,
          }}>
            The thread is resting
          </div>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {contactName}
          </div>
        </div>
      </div>

      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontStyle: 'italic',
        color: 'var(--text-secondary)',
        margin: '10px 0 0 0',
        lineHeight: 1.45,
      }}>
        Still quiet from {contactName}. No rush.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 14 }}>
        <button
          type="button"
          onClick={onTryAgain}
          onMouseEnter={() => setHovTryAgain(true)}
          onMouseLeave={() => setHovTryAgain(false)}
          style={{
            backgroundColor: hovTryAgain ? 'rgba(184,98,74,0.88)' : 'var(--accent)',
            color: '#F9F5EE',
            borderRadius: 'var(--radius-full)',
            padding: '7px 16px',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 120ms ease',
          }}
        >
          Reach out again
        </button>
        <button
          type="button"
          onClick={onLetItRest}
          onMouseEnter={() => setHovLetItRest(true)}
          onMouseLeave={() => setHovLetItRest(false)}
          style={{
            background: 'none',
            border: 'none',
            color: hovLetItRest ? 'var(--text-secondary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            padding: '7px 10px',
            cursor: 'pointer',
            transition: 'color 120ms ease',
          }}
        >
          Let it rest
        </button>
      </div>
    </section>
  )
}
