import React, { useState, useEffect, useCallback } from 'react'
import { QrCode, Loader2 } from 'lucide-react'
import { Button } from './components'
import { GardenScreen } from './screens/GardenScreen'
import { BriefScreen } from './screens/BriefScreen'
import { ChapterScreen } from './screens/ChapterScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ChapterInferenceScreen } from './screens/ChapterInferenceScreen'

// ─── Nav state ────────────────────────────────────────────────────────────────

type Nav =
  | { screen: 'welcome' }
  | { screen: 'whatsapp-connect' }
  | { screen: 'chapter-inference' }
  | { screen: 'garden' }
  | { screen: 'chapter'; chapterId: string }
  | { screen: 'brief'; contactId: string }
  | { screen: 'settings' }

// ─── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onConnect, onSkip }: { onConnect: () => void; onSkip: () => void }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        gap: 'var(--space-5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <img src="/src/assets/images/loop-mark.svg" width={40} height={40} alt="" />
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--text-h1)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--accent)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          Loop
        </span>
      </div>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-body)',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          maxWidth: 320,
          lineHeight: 'var(--leading-relaxed)',
        }}
      >
        The people who matter, never forgotten.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 'var(--space-3)' }}>
        <Button onClick={onConnect}>Connect WhatsApp</Button>
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

// ─── WhatsApp connect screen ──────────────────────────────────────────────────

function WhatsAppConnectScreen({ onConnected, onSkip }: { onConnected: () => void; onSkip: () => void }) {
  const [status, setStatus] = useState<string>('idle')
  const [qr, setQr] = useState<string | null>(null)

  const startConnect = useCallback(async () => {
    setStatus('starting')
    try {
      await window.loop.whatsapp.start()
    } catch (err) {
      setStatus('error')
      console.error(err)
    }
  }, [])

  useEffect(() => {
    startConnect()

    const offQR = window.loop.whatsapp.onQR((q) => {
      setQr(q)
      setStatus('qr')
    })
    const offConnected = window.loop.whatsapp.onConnected(() => {
      setStatus('connected')
      setTimeout(onConnected, 800)
    })

    return () => {
      offQR()
      offConnected()
    }
  }, [startConnect, onConnected])

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        gap: 'var(--space-5)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}
      >
        Connect WhatsApp
      </div>

      {status === 'starting' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
          <Loader2 size={18} strokeWidth={1.8} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}>Starting…</span>
        </div>
      )}

      {status === 'qr' && qr && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              background: 'white',
              padding: 20,
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              display: 'inline-block',
              marginBottom: 16,
            }}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=220x220`}
              alt="WhatsApp QR code"
              width={220}
              height={220}
            />
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300 }}>
            Open WhatsApp on your phone → Linked Devices → Link a device → scan this code
          </div>
        </div>
      )}

      {status === 'qr' && !qr && (
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <QrCode size={20} strokeWidth={1.5} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}>Generating QR code…</span>
        </div>
      )}

      {status === 'connected' && (
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            color: 'var(--positive)',
            fontStyle: 'italic',
          }}
        >
          Connected.
        </div>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--accent)', marginBottom: 12 }}>
            Could not start WhatsApp. Is the app running?
          </div>
          <Button variant="secondary" onClick={startConnect}>Try again</Button>
        </div>
      )}

      <button
        type="button"
        onClick={onSkip}
        style={{
          background: 'none',
          border: 'none',
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          color: 'var(--text-muted)',
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        Skip for now
      </button>
    </div>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [nav, setNav] = useState<Nav>({ screen: 'welcome' })

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.loop) {
        try {
          const state = await window.loop.state.get()
          if (state.onboardingComplete) {
            setNav({ screen: 'garden' })
          }
        } catch {
          // Main handlers not yet registered — stay on welcome
        }
      }
    }
    init()
  }, [])

  const goGarden = useCallback(() => setNav({ screen: 'garden' }), [])
  const goSkip = useCallback(async () => {
    try {
      await window.loop.state.patch({ onboardingComplete: true })
    } catch { /* pass */ }
    setNav({ screen: 'garden' })
  }, [])

  switch (nav.screen) {
    case 'welcome':
      return (
        <WelcomeScreen
          onConnect={() => setNav({ screen: 'whatsapp-connect' })}
          onSkip={() => setNav({ screen: 'chapter-inference' })}
        />
      )

    case 'whatsapp-connect':
      return (
        <WhatsAppConnectScreen
          onConnected={async () => {
            try {
              await window.loop.state.patch({ whatsappConnected: true })
            } catch { /* pass */ }
            setNav({ screen: 'chapter-inference' })
          }}
          onSkip={() => setNav({ screen: 'chapter-inference' })}
        />
      )

    case 'chapter-inference':
      return (
        <ChapterInferenceScreen
          onComplete={goGarden}
          onSkip={goSkip}
        />
      )

    case 'garden':
      return (
        <GardenScreen
          onOpenChapter={(chapterId) => setNav({ screen: 'chapter', chapterId })}
          onOpenBrief={(contactId) => setNav({ screen: 'brief', contactId })}
          onOpenSettings={() => setNav({ screen: 'settings' })}
        />
      )

    case 'chapter':
      return (
        <ChapterScreen
          chapterId={nav.chapterId}
          onBack={goGarden}
          onOpenBrief={(contactId) => setNav({ screen: 'brief', contactId })}
        />
      )

    case 'brief':
      return (
        <BriefScreen
          contactId={nav.contactId}
          onBack={() => setNav({ screen: 'garden' })}
        />
      )

    case 'settings':
      return <SettingsScreen onBack={goGarden} />

    default:
      return null
  }
}
