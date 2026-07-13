import React, { useState } from 'react'

interface Props {
  onContinue: () => void
}

const SERIF = '"Lora", Georgia, "Times New Roman", serif'
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'

export function OnboardingFeltMomentScreen({ onContinue }: Props) {
  const [hov, setHov] = useState(false)

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '0 64px',
      boxSizing: 'border-box',
      WebkitAppRegion: 'drag',
    } as React.CSSProperties}>
      <h1 style={{
        fontFamily: SERIF,
        fontWeight: 400,
        fontSize: 38,
        lineHeight: 1.35,
        letterSpacing: '-0.01em',
        color: 'var(--text-primary)',
        maxWidth: 580,
        margin: 0,
      }}>
        There's someone you keep meaning to call.
      </h1>

      <button
        onClick={onContinue}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          marginTop: 52,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          opacity: hov ? 1 : 0.55,
          transition: 'opacity 200ms ease',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <span style={{
          fontFamily: SANS,
          fontSize: 12,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          fontWeight: 500,
        }}>
          Continue
        </span>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 3.5v11M4 10l5 5 5-5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
