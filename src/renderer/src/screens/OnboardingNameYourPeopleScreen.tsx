import React, { useState } from 'react'

interface Props {
  onContinue: () => void
}

const SERIF = '"Lora", Georgia, "Times New Roman", serif'
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'

const CHIPS = ['An old friend', 'A family member', 'Someone from a past chapter']

export function OnboardingNameYourPeopleScreen({ onContinue }: Props) {
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
        Think of three people you've been meaning to reach out to.
      </h1>

      <p style={{
        fontFamily: SANS,
        fontWeight: 400,
        fontSize: 15,
        lineHeight: 1.6,
        color: '#6B5447',
        maxWidth: 400,
        margin: '20px 0 0',
      }}>
        You don't need their numbers. Just hold them in mind.
      </p>

      <span style={{
        fontFamily: SANS,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#B8A99E',
        margin: '32px 0 0',
      }}>
        for example
      </span>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        margin: '14px 0 0',
        alignItems: 'center',
      }}>
        {CHIPS.map((label) => (
          <div key={label} style={{
            fontFamily: SANS,
            fontSize: 15,
            fontStyle: 'italic',
            color: '#6B5447',
            userSelect: 'none',
            pointerEvents: 'none',
          } as React.CSSProperties}>
            {label}
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        aria-label="Continue"
        style={{
          marginTop: 48,
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
