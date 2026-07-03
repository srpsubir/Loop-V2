import React, { useState } from 'react'

interface Props {
  onContinue: () => void
}

const SERIF = '"Lora", Georgia, "Times New Roman", serif'
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'

export function OnboardingNormaliseScreen({ onContinue }: Props) {
  const [hov, setHov] = useState(false)

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#F4E7E2',
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
        fontSize: 34,
        lineHeight: 1.45,
        letterSpacing: '-0.005em',
        color: '#1A100C',
        maxWidth: 520,
        margin: 0,
      }}>
        It's not that you forgot. Life just got full.
      </h1>

      <p style={{
        fontFamily: SANS,
        fontWeight: 400,
        fontSize: 15,
        lineHeight: 1.6,
        color: '#6B5447',
        maxWidth: 440,
        margin: '20px 0 0',
      }}>
        Loop helps you stay close to the people who matter, without the mental load.
      </p>

      <button
        onClick={onContinue}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        aria-label="Continue"
        style={{
          marginTop: 52,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          opacity: hov ? 1 : 0.6,
          color: '#B8624A',
          transition: 'opacity 200ms ease',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3.5 9h11M10 4l5 5-5 5" stroke="#B8624A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
