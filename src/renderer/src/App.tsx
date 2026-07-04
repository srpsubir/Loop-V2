import React, { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import { QrCode, Loader2, CheckCircle } from 'lucide-react'
import { Button } from './components'

const MONO = '"SFMono-Regular","SF Mono",ui-monospace,Menlo,monospace'
import { YourLoopsScreen } from './screens/YourLoopsScreen'
import { StoryScreen } from './screens/StoryScreen'
import { ChapterDetailScreen } from './screens/ChapterDetailScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ChapterInferenceScreen } from './screens/ChapterInferenceScreen'
import { CrewDetectionScreen } from './screens/CrewDetectionScreen'
import { ChapterNamingScreen } from './screens/ChapterNamingScreen'
import { EmailCaptureScreen } from './screens/EmailCaptureScreen'
import { StayCloseScreen } from './screens/StayCloseScreen'
import { PrivacyNoticeScreen } from './screens/PrivacyNoticeScreen'
import { OnboardingFeltMomentScreen } from './screens/OnboardingFeltMomentScreen'
import { OnboardingNormaliseScreen } from './screens/OnboardingNormaliseScreen'
import { OnboardingRevealScreen } from './screens/OnboardingRevealScreen'
import { OnboardingNameYourPeopleScreen } from './screens/OnboardingNameYourPeopleScreen'
import { OnboardingBeat3Screen } from './screens/OnboardingBeat3Screen'
import { ChapterCrewPickerScreen } from './screens/ChapterCrewPickerScreen'
import { PeopleScreen } from './screens/PeopleScreen'
import { AppSidebar } from './components/AppSidebar'
import { TitlebarSearch } from './components/TitlebarSearch'
import type { ChapterCandidate } from '@shared/types'
import { ConnectionStateProvider } from './ConnectionStateContext'

// ─── Nav state ────────────────────────────────────────────────────────────────

type Nav =
  | { screen: 'welcome' }
  | { screen: 'onboarding-felt-moment' }
  | { screen: 'onboarding-normalise' }
  | { screen: 'onboarding-beat3' }
  | { screen: 'onboarding-name-your-people' }
  | { screen: 'onboarding-reveal' }
  | { screen: 'privacy-notice' }
  | { screen: 'whatsapp-connect' }
  | { screen: 'chapter-inference' }
  | { screen: 'crew-detection' }
  | { screen: 'chapter-naming'; candidates: ChapterCandidate[]; index: number }
  | { screen: 'email-capture' }
  | { screen: 'stay-close' }
  | { screen: 'your-loops' }
  | { screen: 'people' }
  | { screen: 'chapter-detail'; chapterId: string }
  | { screen: 'chapter-crew-picker'; chapterId: string }
  | { screen: 'story'; contactId: string; chapterId: string }
  | { screen: 'settings' }

// ─── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onConnect }: { onConnect: () => void }) {
  const [showSheet, setShowSheet] = useState(false)
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRedeem = async () => {
    if (!code.trim() || redeeming) return
    setRedeeming(true)
    try {
      const valid = await window.loop.invite.redeem(code.trim())
      if (valid) {
        setSuccess(true)
        setTimeout(() => { setShowSheet(false); setSuccess(false); setCode(''); onConnect() }, 1900)
      }
    } catch { /* pass */ } finally {
      setRedeeming(false)
    }
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* Keyframes for bottom sheet */}
      <style>{`
        @keyframes mav91Scrim { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mav91SheetUp { from { transform: translateY(100%) } to { transform: none } }
        @keyframes mav91Pop { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: none } }
      `}</style>
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 480,
          padding: '0 32px',
        }}
      >
        {/* Mark + wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <svg width={88} height={88} viewBox="0 0 120 120" fill="none" role="img" aria-label="Loop">
            <path d="M67 40 C 92 40, 96 74, 72 82 C 48 90, 30 74, 33 54 C 36 36, 58 28, 74 36 C 92 45, 92 78, 66 84 C 44 89, 26 76, 26 76" stroke="#B8624A" strokeWidth="7.5" strokeLinecap="round" fill="none"></path>
          </svg>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 36,
              fontWeight: 600,
              color: '#2A1F1B',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            Loop
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            color: '#2A1F1B',
            textAlign: 'center',
            lineHeight: 1.4,
            marginBottom: 12,
          }}
        >
          Every chapter of your life, and the people you lived it with.
        </p>

        {/* Bridge line */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: '#A38F85',
            textAlign: 'center',
            lineHeight: 1.5,
            marginBottom: 40,
          }}
        >
          Our lives happen in conversations with our people.
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 40, width: '100%', marginBottom: 28 }}>
          {[
            'Connect WhatsApp',
            'Loop maps the chapters of your life',
            'Your people, still in every chapter',
          ].map((label, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, maxWidth: 120 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: '1.5px solid #B8624A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#B8624A',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 300,
                  color: '#A38F85',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Privacy */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: '#BBA99E',
            textAlign: 'center',
            marginBottom: 36,
            letterSpacing: '0.01em',
          }}
        >
          Your messages never leave your Mac.
        </p>

        {/* CTA */}
        <Button onClick={onConnect}>Connect WhatsApp</Button>

        {/* Invite code entry */}
        <button
          type="button"
          onClick={() => setShowSheet(true)}
          style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', marginTop: 10, padding: '4px 0' }}
        >
          Have an invite code?
        </button>
      </div>
    </div>

    {/* Bottom sheet — positioned relative to the outer wrapper */}
    {showSheet && (
      <>
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(42,31,27,0.32)', backdropFilter: 'blur(1px)', animation: 'mav91Scrim 200ms cubic-bezier(0.22,0.61,0.36,1)' }}
          onMouseDown={() => setShowSheet(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50, background: 'var(--bg)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 40px rgba(42,31,27,0.18)', padding: '14px 24px 32px', animation: 'mav91SheetUp 280ms cubic-bezier(0.22,0.61,0.36,1)' }}
        >
          <div style={{ width: 44, height: 5, borderRadius: 999, background: 'var(--border)', margin: '0 auto 20px' }} />

          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0 8px', animation: 'mav91Pop 260ms cubic-bezier(0.22,0.61,0.36,1)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--terracotta-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={26} strokeWidth={1.8} color="var(--accent)" />
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>You're in</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Setting up your space…</p>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 600, textAlign: 'center', margin: 0, color: 'var(--text-primary)' }}>
                Have an invite code?
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '6px 0 0' }}>
                Someone from your chapters saved you a spot.
              </p>
              <input
                type="text"
                placeholder="Enter your code"
                autoCapitalize="characters"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: MONO, fontSize: 16, fontWeight: 500, letterSpacing: '.12em', textAlign: 'center', background: 'var(--surface)', boxShadow: 'var(--shadow-inset)', border: '1.5px solid transparent', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginTop: 16, outline: 'none' }}
              />
              <Button
                onClick={handleRedeem}
                style={{ width: '100%', marginTop: 12 }}
              >
                {redeeming ? 'Checking…' : 'Redeem'}
              </Button>
            </>
          )}
        </div>
      </>
    )}
  </div>
  )
}

// ─── WhatsApp connect screen ──────────────────────────────────────────────────

function WhatsAppConnectScreen({ onConnected }: { onConnected: () => void }) {
  const [status, setStatus] = useState<string>('idle')
  const [qr, setQr] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!qr) { setQrDataUrl(null); return }
    QRCode.toDataURL(qr, { width: 240, margin: 1, color: { dark: '#2A1F1B', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [qr])

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
    let proceeded = false
    const proceed = () => {
      if (proceeded) return
      proceeded = true
      setStatus('connected')
      setTimeout(onConnected, 800)
    }

    // Register listeners BEFORE calling start() to avoid missing fast silent reconnects
    const offQR = window.loop.whatsapp.onQR((q) => {
      setQr(q)
      setStatus('qr')
    })
    const offConnected = window.loop.whatsapp.onConnected(proceed)
    const offDisconnected = window.loop.whatsapp.onDisconnected((loggedOut) => {
      // Only show error if we're not already connected/proceeding
      if (!proceeded) setStatus(loggedOut ? 'logged-out' : 'error')
    })

    const run = async () => {
      await startConnect()
      // Poll status after start() resolves in case connected event already fired
      try {
        const { status: s } = await window.loop.whatsapp.status()
        if (s === 'connected') proceed()
      } catch { /* ignore */ }
    }
    run()

    return () => {
      offQR()
      offConnected()
      offDisconnected()
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

      {status === 'qr' && qrDataUrl && (
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
              src={qrDataUrl}
              alt="WhatsApp QR code"
              width={240}
              height={240}
            />
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300 }}>
            Open WhatsApp on your phone → Linked Devices → Link a device → scan this code
          </div>
        </div>
      )}

      {status === 'qr' && !qrDataUrl && (
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

      {(status === 'error' || status === 'logged-out') && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--accent)', marginBottom: 12 }}>
            {status === 'logged-out'
              ? 'WhatsApp session expired. Scan to reconnect.'
              : 'Could not connect to WhatsApp.'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Button variant="secondary" onClick={async () => {
              await window.loop.whatsapp.disconnect()
              startConnect()
            }}>Scan QR code</Button>
            {status === 'error' && (
              <Button variant="secondary" onClick={startConnect}>Try again</Button>
            )}
          </div>
        </div>
      )}

      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        color: '#BBA99E',
        textAlign: 'center',
        marginTop: 20,
        letterSpacing: '0.01em',
        maxWidth: 300,
        lineHeight: 1.5,
      }}>
        Your private journal that no one else can open. Everything stays on your Mac — nothing leaves, nothing uploads.
      </p>

    </div>
  )
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

function AppShell({
  nav,
  onNavigate,
  children,
}: {
  nav: Nav
  onNavigate: (n: Nav) => void
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', height: '100%' } as React.CSSProperties}>
      <AppSidebar
        currentScreen={nav.screen}
        onNavigate={(section) => {
          if (section === 'your-loops') onNavigate({ screen: 'your-loops' })
          else if (section === 'people') onNavigate({ screen: 'people' })
          else if (section === 'chapters') onNavigate({ screen: 'your-loops' })
          else if (section === 'settings') onNavigate({ screen: 'settings' })
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <div
          style={{
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F4E7E2',
            borderBottom: '1px solid rgba(26,16,12,0.06)',
            flexShrink: 0,
            WebkitAppRegion: 'drag',
          } as React.CSSProperties}
        >
          <TitlebarSearch />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [nav, setNav] = useState<Nav>({ screen: 'onboarding-felt-moment' })

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.loop) {
        try {
          const state = await window.loop.state.get()
          if (state.onboardingComplete) {
            // Check actual socket status — Baileys may have already connected
            // before React mounted (race in dev mode and prod), so we can't
            // rely solely on the onConnected event listener below.
            if (!state.chapterDetectionComplete && state.chapters.length === 0) {
              try {
                const { status } = await window.loop.whatsapp.status()
                if (status === 'connected') {
                  setNav({ screen: 'chapter-inference' })
                  return
                }
              } catch { /* ignore */ }
            }
            setNav({ screen: 'your-loops' })
          }
        } catch {
          // Main handlers not yet registered — stay on welcome
        }
      }
    }
    init()
  }, [])

  // For returning users: when WA reconnects on launch, auto-navigate to chapter detection
  // if onboarding is complete but chapters have never been detected.
  // ChapterInferenceScreen is the only place chapters:detect is called — it's never reached
  // after onboarding unless we explicitly route there.
  useEffect(() => {
    const off = window.loop.whatsapp.onConnected(async () => {
      try {
        const state = await window.loop.state.get()
        if (state.onboardingComplete && !state.chapterDetectionComplete && state.chapters.length === 0) {
          setNav({ screen: 'chapter-inference' })
        }
      } catch { /* ignore — main process may not be ready */ }
    })
    return off
  }, [])

  const goYourLoops = useCallback(async () => {
    try { await window.loop.state.patch({ onboardingComplete: true }) } catch { /* pass */ }
    setNav({ screen: 'your-loops' })
  }, [])
  const goStayClose = useCallback(async () => {
    try {
      const state = await window.loop.state.get()
      if (state.stayCloseComplete) { setNav({ screen: 'your-loops' }); return }
    } catch { /* pass */ }
    setNav({ screen: 'stay-close' })
  }, [])
  const goEmailCapture = useCallback(async () => {
    try {
      const state = await window.loop.state.get()
      if (state.emailCaptured) { setNav({ screen: 'your-loops' }); return }
    } catch { /* pass */ }
    setNav({ screen: 'email-capture' })
  }, [])
  const goSkip = useCallback(async () => {
    try {
      await window.loop.state.patch({ onboardingComplete: true })
    } catch { /* pass */ }
    setNav({ screen: 'your-loops' })
  }, [])

  switch (nav.screen) {
    case 'onboarding-felt-moment':
      return <OnboardingFeltMomentScreen onContinue={() => setNav({ screen: 'onboarding-normalise' })} />

    case 'onboarding-normalise':
      return (
        <OnboardingNormaliseScreen
          onContinue={() => setNav({ screen: 'onboarding-beat3' })}
        />
      )

    case 'onboarding-beat3':
      return (
        <OnboardingBeat3Screen
          onContinue={() => setNav({ screen: 'onboarding-name-your-people' })}
        />
      )

    case 'onboarding-name-your-people':
      return (
        <OnboardingNameYourPeopleScreen
          onContinue={async () => {
            try {
              const state = await window.loop.state.get()
              if (!state.privacyAcceptedAt) {
                setNav({ screen: 'privacy-notice' })
                return
              }
            } catch { /* main not ready yet — show notice to be safe */ }
            setNav({ screen: 'whatsapp-connect' })
          }}
        />
      )

    case 'onboarding-reveal':
      return <OnboardingRevealScreen onContinue={goEmailCapture} />

    case 'welcome':
      return (
        <WelcomeScreen
          onConnect={async () => {
            try {
              const state = await window.loop.state.get()
              if (!state.privacyAcceptedAt) {
                setNav({ screen: 'privacy-notice' })
                return
              }
            } catch { /* main not ready yet — show notice to be safe */ }
            setNav({ screen: 'whatsapp-connect' })
          }}
        />
      )

    case 'privacy-notice':
      return (
        <PrivacyNoticeScreen
          onAccept={async () => {
            try {
              await window.loop.state.patch({ privacyAcceptedAt: new Date().toISOString() })
            } catch { /* best-effort */ }
            setNav({ screen: 'whatsapp-connect' })
          }}
        />
      )

    case 'whatsapp-connect':
      return (
        <WhatsAppConnectScreen
          onConnected={async () => {
            try {
              await window.loop.state.patch({ whatsappConnected: true })
              const state = await window.loop.state.get()
              if (!state.onboardingComplete) {
                setNav({ screen: 'chapter-inference' })
              } else if (!state.chapterDetectionComplete && state.chapters.length === 0) {
                setNav({ screen: 'chapter-inference' })
              } else {
                setNav({ screen: 'your-loops' })
              }
            } catch {
              setNav({ screen: 'your-loops' })
            }
          }}
        />
      )

    case 'chapter-inference':
      return (
        <ChapterInferenceScreen
          onComplete={() => setNav({ screen: 'crew-detection' })}
          onSkip={goSkip}
        />
      )

    case 'crew-detection':
      return (
        <CrewDetectionScreen
          onComplete={async () => {
            try {
              const state = await window.loop.state.get()
              const unnamedIds = new Set(
                state.chapters.filter((ch) => ch.confirmed === false).map((ch) => ch.id)
              )
              if (unnamedIds.size > 0) {
                const jidToId = (jid: string) =>
                  jid.replace(/@g\.us$/, '').replace(/[^a-z0-9]+/gi, '-')
                const candidates = state.detectedChapters.filter((c) =>
                  unnamedIds.has(jidToId(c.waJid))
                )
                if (candidates.length > 0) {
                  setNav({ screen: 'chapter-naming', candidates, index: 0 })
                  return
                }
              }
            } catch { /* pass */ }
            setNav({ screen: 'onboarding-reveal' })
          }}
          onSkip={goSkip}
        />
      )

    case 'chapter-naming': {
      const { candidates, index } = nav
      const candidate = candidates[index]
      const chapterId = candidate.waJid.replace(/@g\.us$/, '').replace(/[^a-z0-9]+/gi, '-')
      const advance = () => {
        if (index + 1 < candidates.length) {
          setNav({ screen: 'chapter-naming', candidates, index: index + 1 })
        } else {
          setNav({ screen: 'onboarding-reveal' })
        }
      }
      return (
        <ChapterNamingScreen
          candidate={candidate}
          index={index}
          total={candidates.length}
          onConfirm={async (name) => {
            try { await window.loop.chapters.setName(chapterId, name) } catch { /* pass */ }
            advance()
          }}
          onSkip={advance}
        />
      )
    }

    case 'email-capture':
      return (
        <EmailCaptureScreen
          onDone={goStayClose}
        />
      )

    case 'stay-close':
      return (
        <ConnectionStateProvider>
          <StayCloseScreen
            onDone={goYourLoops}
          />
        </ConnectionStateProvider>
      )

    case 'your-loops':
      return (
        <AppShell nav={nav} onNavigate={setNav}>
          <ConnectionStateProvider>
            <YourLoopsScreen
              onOpenChapter={(chapterId) => setNav({ screen: 'chapter-detail', chapterId })}
              onOpenSettings={() => setNav({ screen: 'settings' })}
              onOpenStory={(contactId, chapterId) => setNav({ screen: 'story', contactId, chapterId })}
            />
          </ConnectionStateProvider>
        </AppShell>
      )

    case 'people':
      return (
        <AppShell nav={nav} onNavigate={setNav}>
          <PeopleScreen
            onNavigate={(screen, params) => {
              if (screen === 'story' && params && typeof params === 'object') {
                const { contactId, chapterId } = params as { contactId: string; chapterId: string }
                setNav({ screen: 'story', contactId, chapterId })
              }
            }}
          />
        </AppShell>
      )

    case 'chapter-detail':
      return (
        <AppShell nav={nav} onNavigate={setNav}>
          <ConnectionStateProvider>
            <ChapterDetailScreen
              chapterId={nav.chapterId}
              onBack={goYourLoops}
              onOpenStory={(contactId) => setNav({ screen: 'story', contactId, chapterId: nav.chapterId })}
              onPickCrew={() => setNav({ screen: 'chapter-crew-picker', chapterId: nav.chapterId })}
            />
          </ConnectionStateProvider>
        </AppShell>
      )

    case 'chapter-crew-picker':
      return (
        <AppShell nav={nav} onNavigate={setNav}>
          <ChapterCrewPickerScreen
            chapterId={nav.chapterId}
            onSave={() => setNav({ screen: 'chapter-detail', chapterId: nav.chapterId })}
            onBack={() => setNav({ screen: 'chapter-detail', chapterId: nav.chapterId })}
          />
        </AppShell>
      )

    case 'story':
      return (
        <AppShell nav={nav} onNavigate={setNav}>
          <ConnectionStateProvider>
            <StoryScreen
              contactId={nav.contactId}
              onBack={() => setNav({ screen: 'chapter-detail', chapterId: nav.chapterId })}
            />
          </ConnectionStateProvider>
        </AppShell>
      )

    case 'settings':
      return (
        <AppShell nav={nav} onNavigate={setNav}>
          <ConnectionStateProvider>
            <SettingsScreen onBack={goYourLoops} onConnect={() => setNav({ screen: 'whatsapp-connect' })} />
          </ConnectionStateProvider>
        </AppShell>
      )

    default:
      return null
  }
}
