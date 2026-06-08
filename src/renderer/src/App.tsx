import { useState, useEffect } from 'react'
import type { AppScreen } from '@shared/types'

// Placeholder screens — replaced as each MAV ticket is built
function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      gap: 'var(--space-5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <img src="/src/assets/images/loop-mark.svg" width={40} height={40} alt="" />
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-h1)',
          fontWeight: 'var(--weight-semibold)',
          color: 'var(--accent)',
          letterSpacing: 'var(--tracking-tight)',
        }}>Loop</span>
      </div>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-body)',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        maxWidth: 320,
        lineHeight: 'var(--leading-relaxed)',
      }}>
        The people who matter, never forgotten.
      </p>
      <button
        onClick={onNext}
        style={{
          marginTop: 'var(--space-3)',
          padding: '12px 32px',
          background: 'var(--accent)',
          color: 'var(--text-on-accent)',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-semibold)',
          cursor: 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        Connect WhatsApp
      </button>
    </div>
  )
}

function GardenScreen() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-h2)',
          color: 'var(--text-secondary)',
        }}>
          The Garden is coming — MAV-60
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('welcome')

  useEffect(() => {
    // Once window.loop is available, check onboarding state
    const init = async () => {
      if (typeof window !== 'undefined' && window.loop) {
        try {
          const state = await window.loop.state.get()
          if (state.onboardingComplete && state.whatsappConnected) {
            setScreen('garden')
          }
        } catch {
          // Main process handlers not yet wired — stay on welcome
        }
      }
    }
    init()
  }, [])

  if (screen === 'garden') return <GardenScreen />
  return <WelcomeScreen onNext={() => setScreen('whatsapp-connect')} />
}
