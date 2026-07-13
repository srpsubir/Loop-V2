import React, { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'qrcode'
import { QrCode, Loader2 } from 'lucide-react'
import { Button } from './components'
import { AboutScreen } from './AboutScreen'

const MONO = '"SFMono-Regular","SF Mono",ui-monospace,Menlo,monospace'
import { YourLoopsScreen } from './screens/YourLoopsScreen'
import { StoryScreen } from './screens/StoryScreen'
import { ChapterDetailScreen } from './screens/ChapterDetailScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ChapterInferenceScreen } from './screens/ChapterInferenceScreen'
import { CrewDetectionScreen } from './screens/CrewDetectionScreen'
import { ChapterNamingScreen } from './screens/ChapterNamingScreen'
import { OnboardingGoogleSignInScreen } from './screens/OnboardingGoogleSignInScreen'
import { StayCloseScreen } from './screens/StayCloseScreen'
import { PrivacyNoticeScreen } from './screens/PrivacyNoticeScreen'
import { OnboardingFeltMomentScreen } from './screens/OnboardingFeltMomentScreen'
import { OnboardingNormaliseScreen } from './screens/OnboardingNormaliseScreen'
import { OnboardingRevealScreen } from './screens/OnboardingRevealScreen'
import { OnboardingNameYourPeopleScreen } from './screens/OnboardingNameYourPeopleScreen'
import { OnboardingBeat3Screen } from './screens/OnboardingBeat3Screen'
import { ChapterCrewPickerScreen } from './screens/ChapterCrewPickerScreen'
import { PeopleScreen } from './screens/PeopleScreen'
import { ChaptersScreen } from './screens/ChaptersScreen'
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
  | { screen: 'chapters' }
  | { screen: 'chapter-detail'; chapterId: string }
  | { screen: 'chapter-crew-picker'; chapterId: string }
  | { screen: 'story'; contactId: string; chapterId: string; from: 'your-loops' | 'people' | 'chapters' }
  | { screen: 'settings' }

// ─── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onConnect }: { onConnect: () => void }) {
  return (
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
      </div>
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
        storyFrom={nav.screen === 'story' ? nav.from : undefined}
        onNavigate={(section) => {
          if (section === 'your-loops') onNavigate({ screen: 'your-loops' })
          else if (section === 'people') onNavigate({ screen: 'people' })
          else if (section === 'chapters') onNavigate({ screen: 'chapters' })
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
            background: 'var(--bg)',
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
  const [showAbout, setShowAbout] = useState(false)
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    window.loop.version.get().then(setAppVersion).catch(() => {})
  }, [])

  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__loop_showAbout = () => setShowAbout(true)
  }, [setShowAbout])

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
      // chapterDetectionComplete is deliberately not in state:patch's renderer
      // allowlist, so it must go through chapters:confirm (which sets it
      // unconditionally). Without this, skipping chapter-inference/crew-detection
      // with zero chapters left chapterDetectionComplete permanently false —
      // YourLoopsScreen's "Loop is reading your conversations" scanning state
      // (gated on whatsappConnected && !chapterDetectionComplete) then never
      // clears, permanently hiding nudges/reach-out for any account whose
      // WhatsApp groups don't produce chapter candidates.
      await window.loop.chapters.confirm([])
    } catch { /* pass */ }
    setNav({ screen: 'your-loops' })
  }, [])

  let screenContent: React.ReactNode

  switch (nav.screen) {
    case 'onboarding-felt-moment':
      screenContent = <OnboardingFeltMomentScreen onContinue={() => setNav({ screen: 'onboarding-normalise' })} />
      break

    case 'onboarding-normalise':
      screenContent = (
        <OnboardingNormaliseScreen
          // Skips 'onboarding-beat3' (MAV-215 contact picker): it shows placeholder
          // names as if selectable real contacts, before WhatsApp is connected, and
          // its output (manuallySelected) has no consumer yet. Re-wire once MAV-215
          // sources it from real post-connect contacts instead of PLACEHOLDER_PEOPLE.
          onContinue={() => setNav({ screen: 'onboarding-name-your-people' })}
        />
      )
      break

    case 'onboarding-beat3':
      screenContent = (
        <OnboardingBeat3Screen
          onContinue={() => setNav({ screen: 'onboarding-name-your-people' })}
        />
      )
      break

    case 'onboarding-name-your-people':
      screenContent = (
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
      break

    case 'onboarding-reveal':
      screenContent = <OnboardingRevealScreen onContinue={goEmailCapture} />
      break

    case 'welcome':
      screenContent = (
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
      break

    case 'privacy-notice':
      screenContent = (
        <PrivacyNoticeScreen
          onAccept={async () => {
            try {
              await window.loop.state.patch({ privacyAcceptedAt: new Date().toISOString() })
            } catch { /* best-effort */ }
            setNav({ screen: 'whatsapp-connect' })
          }}
        />
      )
      break

    case 'whatsapp-connect':
      screenContent = (
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
      break

    case 'chapter-inference':
      screenContent = (
        <ChapterInferenceScreen
          onComplete={() => setNav({ screen: 'crew-detection' })}
          onSkip={goSkip}
        />
      )
      break

    case 'crew-detection':
      screenContent = (
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
      break

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
      screenContent = (
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
      break
    }

    case 'email-capture':
      screenContent = (
        <OnboardingGoogleSignInScreen
          onDone={goStayClose}
        />
      )
      break

    case 'stay-close':
      screenContent = (
        <ConnectionStateProvider>
          <StayCloseScreen
            onDone={goYourLoops}
          />
        </ConnectionStateProvider>
      )
      break

    case 'your-loops':
      screenContent = (
        <AppShell nav={nav} onNavigate={setNav}>
          <ConnectionStateProvider>
            <YourLoopsScreen
              onOpenChapter={(chapterId) => setNav({ screen: 'chapter-detail', chapterId })}
              onOpenSettings={() => setNav({ screen: 'settings' })}
              onOpenStory={(contactId, chapterId) => setNav({ screen: 'story', contactId, chapterId, from: 'your-loops' })}
              onRetryChapterDetection={() => setNav({ screen: 'chapter-inference' })}
            />
          </ConnectionStateProvider>
        </AppShell>
      )
      break

    case 'people':
      screenContent = (
        <AppShell nav={nav} onNavigate={setNav}>
          <PeopleScreen
            onNavigate={(screen, params) => {
              if (screen === 'story' && params && typeof params === 'object') {
                const { contactId, chapterId } = params as { contactId: string; chapterId: string }
                setNav({ screen: 'story', contactId, chapterId, from: 'people' })
              }
            }}
          />
        </AppShell>
      )
      break

    case 'chapters':
      screenContent = (
        <AppShell nav={nav} onNavigate={setNav}>
          <ChaptersScreen
            onOpenChapter={(chapterId) => setNav({ screen: 'chapter-detail', chapterId })}
          />
        </AppShell>
      )
      break

    case 'chapter-detail':
      screenContent = (
        <AppShell nav={nav} onNavigate={setNav}>
          <ConnectionStateProvider>
            <ChapterDetailScreen
              chapterId={nav.chapterId}
              onBack={goYourLoops}
              onOpenStory={(contactId) => setNav({ screen: 'story', contactId, chapterId: nav.chapterId, from: 'chapters' })}
              onPickCrew={() => setNav({ screen: 'chapter-crew-picker', chapterId: nav.chapterId })}
            />
          </ConnectionStateProvider>
        </AppShell>
      )
      break

    case 'chapter-crew-picker':
      screenContent = (
        <AppShell nav={nav} onNavigate={setNav}>
          <ChapterCrewPickerScreen
            chapterId={nav.chapterId}
            onSave={() => setNav({ screen: 'chapter-detail', chapterId: nav.chapterId })}
            onBack={() => setNav({ screen: 'chapter-detail', chapterId: nav.chapterId })}
          />
        </AppShell>
      )
      break

    case 'story':
      screenContent = (
        <AppShell nav={nav} onNavigate={setNav}>
          <ConnectionStateProvider>
            <StoryScreen
              contactId={nav.contactId}
              onBack={() => setNav({ screen: 'chapter-detail', chapterId: nav.chapterId })}
            />
          </ConnectionStateProvider>
        </AppShell>
      )
      break

    case 'settings':
      screenContent = (
        <AppShell nav={nav} onNavigate={setNav}>
          <ConnectionStateProvider>
            <SettingsScreen onBack={goYourLoops} onConnect={() => setNav({ screen: 'whatsapp-connect' })} />
          </ConnectionStateProvider>
        </AppShell>
      )
      break

    default:
      screenContent = null
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={nav.screen}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, mass: 0.8 }}
          style={{ height: '100%', width: '100%' }}
        >
          {screenContent}
        </motion.div>
      </AnimatePresence>
      {showAbout && (
        <AboutScreen
          version={appVersion}
          onOpenPrivacyPolicy={() => window.loop.shell.openExternal('https://srpsubir.github.io/Loop-V2/#privacy')}
          onClose={() => setShowAbout(false)}
        />
      )}
    </>
  )
}
