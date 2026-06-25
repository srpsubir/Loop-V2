import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Settings, X } from 'lucide-react'
import { IconButton } from '../components'
import { ModelUpgradeCard } from '../components/ModelUpgradeCard'
import type { UpgradeStatus } from '../components/ModelUpgradeCard'
import { NudgeCard } from '../components/NudgeCard'
import { QuietDayCard } from '../components/QuietDayCard'
import { DeadThreadCard } from '../components/DeadThreadCard'
import type { AppState, Contact, ContactState, OnThisDayMemory, Chapter } from '@shared/types'
import { toPng } from 'html-to-image'

// ─── Types ────────────────────────────────────────────────────────────────────

interface YourLoopsScreenProps {
  onOpenChapter: (chapterId: string) => void
  onOpenSettings: () => void
}

type AtomState = 'active' | 'fading' | 'dead-thread' | 'birthday-live' | 'birthday-fading'

interface ChapterAtom {
  chapter: { id: string; name: string }
  atomState: AtomState
  crewColors: string[]
}

// ─── Atom state visual config ─────────────────────────────────────────────────

const CFG: Record<AtomState, {
  nucleusBg: string
  nucleusText: string
  ringColor: string
  electronBg: string
  orbitMs: number
  paused: boolean
  badge?: string
}> = {
  active: {
    nucleusBg:   'var(--accent-faint)',
    nucleusText: 'var(--accent)',
    ringColor:   'rgba(184,98,74,0.20)',
    electronBg:  'var(--people)',
    orbitMs:     10000,
    paused:      false,
  },
  fading: {
    nucleusBg:   'var(--surface)',
    nucleusText: 'var(--text-muted)',
    ringColor:   'var(--border-light)',
    electronBg:  'var(--border)',
    orbitMs:     22000,
    paused:      false,
    badge:       'fading',
  },
  'dead-thread': {
    nucleusBg:   'var(--surface)',
    nucleusText: 'var(--text-secondary)',
    ringColor:   'var(--border)',
    electronBg:  'var(--border)',
    orbitMs:     10000,
    paused:      true,
    badge:       'quiet',
  },
  'birthday-live': {
    nucleusBg:   '#FDF3DF',
    nucleusText: 'var(--accent)',
    ringColor:   'rgba(184,98,74,0.35)',
    electronBg:  'var(--accent)',
    orbitMs:     5000,
    paused:      false,
    badge:       'birthday',
  },
  'birthday-fading': {
    nucleusBg:   'var(--people-faint)',
    nucleusText: 'var(--people)',
    ringColor:   'var(--people)',
    electronBg:  'var(--people)',
    orbitMs:     16000,
    paused:      false,
    badge:       'birthday',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TINTS = ['#C49A8A', '#D4856E', '#6A9470', '#C49A8A', '#B8624A']
function tintFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

function isMemberFading(contact: Contact, cs: ContactState): boolean {
  if (!cs.lastContactDate) return true
  const daysSince = (Date.now() - new Date(cs.lastContactDate).getTime()) / 86400000
  if (daysSince > 90) return true
  if (contact.tier === 'close' && contact.intervalDays && daysSince > contact.intervalDays) return true
  return false
}

function isNudgeEligible(contact: Contact, cs: ContactState): boolean {
  if (contact.tier !== 'close' || !contact.whatsappId) return false
  if (cs.suppressNudge) return false
  if (!isMemberFading(contact, cs)) return false
  if (cs.nudgeDismissedAt) {
    const daysSinceDismiss = (Date.now() - new Date(cs.nudgeDismissedAt).getTime()) / 86400000
    if (daysSinceDismiss < 7) return false
  }
  return true
}

function deriveAtomState(
  contacts: Contact[],
  contactStates: Record<string, ContactState>
): AtomState {
  let hasActive = false
  let hasFading = false
  let hasDeadThread = false
  let hasBirthdayLive = false
  let hasBirthdayFading = false

  for (const contact of contacts) {
    const cs = contactStates[contact.id]
    if (!cs) continue

    if (cs.nextOccasion?.type === 'dead-thread') {
      hasDeadThread = true
      continue
    }

    if (cs.nextOccasion?.type === 'birthday') {
      const daysUntil = (new Date(cs.nextOccasion.date).getTime() - Date.now()) / 86400000
      if (daysUntil >= 0 && daysUntil <= 7) {
        if (isMemberFading(contact, cs)) hasBirthdayFading = true
        else hasBirthdayLive = true
        continue
      }
    }

    if (isMemberFading(contact, cs)) hasFading = true
    else hasActive = true
  }

  if (hasDeadThread) return 'dead-thread'
  if (hasBirthdayLive) return 'birthday-live'
  if (hasBirthdayFading) return 'birthday-fading'
  if (hasFading && !hasActive) return 'fading'
  return 'active'
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useYourLoopsData() {
  const [state, setState] = useState<AppState | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [s, cs] = await Promise.all([
        window.loop.state.get(),
        window.loop.contacts.list(),
      ])
      setState(s)
      setContacts(cs)
    } catch { /* main handlers not yet wired */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const unsub = window.loop?.state?.onChange?.(() => load())
    return () => unsub?.()
  }, [load])

  return { state, contacts, loading }
}

// ─── Atom visual ─────────────────────────────────────────────────────────────

const ATOM_SIZE = 176
const NUCLEUS_SIZE = 84
const ORBIT_R = 64
const ELECTRON_SIZE = 20

function AtomVisual({ atom }: { atom: ChapterAtom }) {
  const cfg = CFG[atom.atomState]
  const electrons = atom.crewColors.slice(0, 4)
  const angleStep = electrons.length > 0 ? 360 / electrons.length : 90

  const nucleusShadow = atom.atomState === 'birthday-live'
    ? '0 0 0 4px rgba(184,98,74,0.12), 0 2px 8px rgba(42,31,27,0.10)'
    : '0 2px 8px rgba(42,31,27,0.07)'

  return (
    <div style={{ position: 'relative', width: ATOM_SIZE, height: ATOM_SIZE, flexShrink: 0 }}>
      {/* Orbit ring */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: `1.5px solid ${cfg.ringColor}`,
        boxSizing: 'border-box',
      }} />

      {/* Rotating electron track */}
      <div style={{
        position: 'absolute',
        inset: 0,
        animationName: 'yls-orbit',
        animationDuration: `${cfg.orbitMs}ms`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        animationPlayState: cfg.paused ? 'paused' : 'running',
      } as React.CSSProperties}>
        {electrons.map((color, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: ELECTRON_SIZE,
              height: ELECTRON_SIZE,
              marginTop: -(ELECTRON_SIZE / 2),
              marginLeft: -(ELECTRON_SIZE / 2),
              transform: `rotate(${i * angleStep}deg) translateX(${ORBIT_R}px)`,
            }}
          >
            <div style={{
              width: ELECTRON_SIZE,
              height: ELECTRON_SIZE,
              borderRadius: '50%',
              background: color,
              boxShadow: '0 1px 3px rgba(42,31,27,0.15)',
            }} />
          </div>
        ))}
      </div>

      {/* Nucleus */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: NUCLEUS_SIZE,
        height: NUCLEUS_SIZE,
        marginTop: -(NUCLEUS_SIZE / 2),
        marginLeft: -(NUCLEUS_SIZE / 2),
        borderRadius: '50%',
        background: cfg.nucleusBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: nucleusShadow,
      }}>
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 30,
          fontWeight: 600,
          color: cfg.nucleusText,
          letterSpacing: '-0.01em',
          userSelect: 'none',
          lineHeight: 1,
        }}>
          {atom.chapter.name[0]}
        </span>
      </div>
    </div>
  )
}

// ─── Atom card ────────────────────────────────────────────────────────────────

function AtomCard({ atom, glow, onClick }: { atom: ChapterAtom; glow: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const cfg = CFG[atom.atomState]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      data-testid="chapter-atom"
      data-chapter-id={atom.chapter.id}
      data-atom-state={atom.atomState}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        padding: '16px 20px 18px',
        borderRadius: 'var(--radius-lg)',
        background: hov ? 'var(--surface)' : 'transparent',
        transition: 'background var(--duration-fast) var(--ease-out)',
        outline: 'none',
        flexShrink: 0,
        minWidth: 200,
        animationName: glow ? 'yls-reconnect' : 'none',
        animationDuration: '2.2s',
        animationTimingFunction: 'ease-out',
        animationFillMode: 'both',
      } as React.CSSProperties}
    >
      <AtomVisual atom={atom} />
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}>
          {atom.chapter.name}
        </div>
        {cfg.badge && (
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 10,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: cfg.nucleusText,
            marginTop: 5,
            fontWeight: 700,
          }}>
            {cfg.badge}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Opening Moment card ──────────────────────────────────────────────────────

function OpeningMomentCard({ memory, chapters }: { memory: OnThisDayMemory; chapters: Chapter[] }) {
  const WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
  const eyebrow = `${WORDS[memory.yearsAgo - 1] ?? memory.yearsAgo} ${memory.yearsAgo === 1 ? 'year' : 'years'} ago today`

  // Find the chapter this memory contact belongs to
  // The memory doesn't carry chapterIds directly; we surface the first matching chapter if available
  const chapterName = chapters.find((ch) =>
    ch.id === memory.contactId // fallback: not reliable
  )?.name ?? null

  return (
    <div style={{
      margin: '20px 44px 0',
      padding: '18px 24px',
      background: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      borderLeft: '3px solid var(--accent-light)',
      flexShrink: 0,
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: 'var(--accent)',
        marginBottom: 8,
      }}>
        {eyebrow}
      </div>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 15,
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        marginBottom: chapterName ? 10 : 0,
      }}>
        {memory.snippet}
      </div>
      {chapterName && (
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '.04em',
        }}>
          {memory.contactName} · {chapterName}
        </div>
      )}
      {!chapterName && (
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '.04em',
        }}>
          {memory.contactName}
        </div>
      )}
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function YourLoopsScreen({ onOpenChapter, onOpenSettings }: YourLoopsScreenProps) {
  const { state, contacts, loading } = useYourLoopsData()
  const [glowChapterId, setGlowChapterId] = useState<string | null>(null)
  const [echoCardOpen, setEchoCardOpen] = useState(false)
  const [echoChapterId, setEchoChapterId] = useState<string | null>(null)
  const echoCardRef = useRef<HTMLDivElement>(null)
  const [hiddenDeadThreadIds, setHiddenDeadThreadIds] = useState<Set<string>>(new Set())

  // ── Model upgrade card ──────────────────────────────────────────────────────
  const [upgradeStatus, setUpgradeStatus] = useState<UpgradeStatus | null>(null)
  const [upgradeProgress, setUpgradeProgress] = useState(0)

  useEffect(() => {
    window.loop.model.status().then(({ exists, ready }) => {
      if (!exists && !ready) setUpgradeStatus('idle')
    }).catch(() => {})
  }, [])

  const handleUpgrade = useCallback(async () => {
    setUpgradeStatus('downloading')
    setUpgradeProgress(0)
    const unsubProgress = window.loop.model.onProgress((downloaded, total) => {
      if (total > 0) setUpgradeProgress(Math.round((downloaded / total) * 100))
    })
    const unsubReady = window.loop.model.onReady(() => {
      unsubProgress()
      unsubReady()
      setUpgradeStatus('complete')
      setTimeout(() => setUpgradeStatus(null), 3000)
    })
    try {
      await window.loop.model.download()
    } catch {
      unsubProgress()
      unsubReady()
      setUpgradeStatus('idle')
    }
  }, [])

  const handleCancelUpgrade = useCallback(() => {
    setUpgradeStatus('idle')
  }, [])

  useEffect(() => {
    if (document.getElementById('yls-atom-styles')) return
    const s = document.createElement('style')
    s.id = 'yls-atom-styles'
    s.textContent = [
      '@keyframes yls-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
      '@keyframes yls-reconnect { 0%,100% { box-shadow: none; } 40% { box-shadow: 0 0 0 8px rgba(184,98,74,0.22), 0 0 24px rgba(184,98,74,0.18); } }',
    ].join('\n')
    document.head.appendChild(s)
  }, [])

  // Reconnection dopamine pulse
  useEffect(() => {
    if (typeof window === 'undefined' || !window.loop?.onReconnection) return
    const unsub = window.loop.onReconnection((contactId: string) => {
      // Find which chapter this contact belongs to
      const contact = contacts.find((c) => c.id === contactId)
      if (!contact || !state) return
      const chapterId = contact.chapterIds.find((id) =>
        state.chapters.some((ch) => ch.id === id)
      )
      if (!chapterId) return
      setGlowChapterId(chapterId)
      setTimeout(() => setGlowChapterId(null), 2200)
    })
    return () => unsub()
  }, [contacts, state])

  const chapterAtoms = useMemo<ChapterAtom[]>(() => {
    if (!state) return []
    return state.chapters.map((chapter) => {
      const chapterContacts = contacts.filter((c) => c.chapterIds.includes(chapter.id))
      return {
        chapter,
        atomState: deriveAtomState(chapterContacts, state.contacts),
        crewColors: chapterContacts.slice(0, 4).map((c) => tintFor(c.name)),
      }
    })
  }, [state, contacts])

  // Nudge card: most-overdue close contact eligible for a nudge
  const nudgeContact = useMemo(() => {
    if (!state) return null
    const eligible = contacts.filter((c) => {
      const cs = state.contacts[c.id]
      return cs && isNudgeEligible(c, cs)
    })
    eligible.sort((a, b) => {
      const dA = state.contacts[a.id]?.lastContactDate
        ? Date.now() - new Date(state.contacts[a.id].lastContactDate!).getTime()
        : Infinity
      const dB = state.contacts[b.id]?.lastContactDate
        ? Date.now() - new Date(state.contacts[b.id].lastContactDate!).getTime()
        : Infinity
      return dB - dA
    })
    return eligible[0] ?? null
  }, [contacts, state])

  const handleNudgeMessage = useCallback(async () => {
    if (!nudgeContact || !state) return
    const cs = state.contacts[nudgeContact.id]
    if (cs) {
      const newCount = (cs.reachOutCount ?? 0) + 1
      await window.loop.state.patch({
        contacts: {
          ...state.contacts,
          [nudgeContact.id]: {
            ...cs,
            lastReachOutAt: new Date().toISOString(),
            reachOutCount: newCount,
            suppressNudge: newCount >= 2,
          },
        },
      }).catch(() => {})
    }
    if (nudgeContact.whatsappId) window.loop.shell.openWhatsApp(nudgeContact.whatsappId).catch(() => {})
  }, [nudgeContact, state])

  const handleNudgeDismiss = useCallback(async () => {
    if (!nudgeContact || !state) return
    const cs = state.contacts[nudgeContact.id]
    if (!cs) return
    await window.loop.state.patch({
      contacts: {
        ...state.contacts,
        [nudgeContact.id]: { ...cs, nudgeDismissedAt: new Date().toISOString() },
      },
    }).catch(() => {})
  }, [nudgeContact, state])

  // Dead thread card: first contact with a dead-thread occasion not yet hidden this session
  const deadThreadContact = useMemo(() => {
    if (!state) return null
    return contacts.find((c) => {
      const cs = state.contacts[c.id]
      return cs?.nextOccasion?.type === 'dead-thread' && !hiddenDeadThreadIds.has(c.id)
    }) ?? null
  }, [contacts, state, hiddenDeadThreadIds])

  const handleDeadThreadTryAgain = useCallback(async () => {
    if (!deadThreadContact || !state) return
    const cs = state.contacts[deadThreadContact.id]
    if (cs) {
      const newCount = (cs.reachOutCount ?? 0) + 1
      await window.loop.state.patch({
        contacts: {
          ...state.contacts,
          [deadThreadContact.id]: {
            ...cs,
            lastReachOutAt: new Date().toISOString(),
            reachOutCount: newCount,
            suppressNudge: newCount >= 2,
          },
        },
      }).catch(() => {})
    }
    if (deadThreadContact.whatsappId) window.loop.shell.openWhatsApp(deadThreadContact.whatsappId).catch(() => {})
  }, [deadThreadContact, state])

  const handleDeadThreadLetItRest = useCallback(async () => {
    if (!deadThreadContact || !state) return
    const cs = state.contacts[deadThreadContact.id]
    if (cs) {
      await window.loop.state.patch({
        contacts: {
          ...state.contacts,
          [deadThreadContact.id]: { ...cs, suppressNudge: true },
        },
      }).catch(() => {})
    }
    setHiddenDeadThreadIds((prev) => new Set([...prev, deadThreadContact.id]))
  }, [deadThreadContact, state])

  // Opening moment: only when there are zero urgent signals
  const hasSignals = chapterAtoms.some(
    (a) => a.atomState === 'fading' || a.atomState === 'birthday-live' || a.atomState === 'dead-thread'
  )
  const showOpeningMoment = !hasSignals && !!state?.onThisDayMemory && chapterAtoms.length > 0

  // Echo: first chapter with an unseen anniversary
  const echoChapter = state?.chapters.find((ch) =>
    ch.echoAnniversary && !ch.echoAnniversary.seenAt?.startsWith(String(new Date().getFullYear()))
  ) ?? null

  const handleSeeEcho = useCallback(async (chapter: Chapter) => {
    setEchoChapterId(chapter.id)
    setEchoCardOpen(true)
    // Mark as seen immediately
    if (!state) return
    const updatedChapters = state.chapters.map((ch) =>
      ch.id === chapter.id
        ? { ...ch, echoAnniversary: { ...ch.echoAnniversary!, seenAt: new Date().toISOString() } }
        : ch
    )
    try { await window.loop.state.patch({ chapters: updatedChapters }) } catch { /* pass */ }
  }, [state])

  const handleSaveEchoImage = useCallback(async () => {
    if (!echoCardRef.current) return
    try {
      const dataUrl = await toPng(echoCardRef.current, { cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `loop-echo-${Date.now()}.png`
      a.click()
    } catch { /* pass */ }
  }, [])

  function echoLine(years: number, total: number, active: number): string {
    const y = `${years} year${years !== 1 ? 's' : ''}`
    const p = `${total} ${total === 1 ? 'person' : 'people'}`
    const a = `${active} still close`
    return `${y}. ${p}. ${a}.`
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Loading…
        </div>
      </div>
    )
  }

  // Contacts and echo card data
  const echoCardChapter = echoCardOpen && echoChapterId
    ? state?.chapters.find(ch => ch.id === echoChapterId) ?? null
    : null
  const echoCardContacts = echoCardChapter
    ? contacts.filter(c => c.chapterIds.includes(echoCardChapter.id))
    : []
  const echoCardActive = echoCardContacts.filter(c => {
    const cs = state?.contacts[c.id]
    if (!cs?.lastContactDate) return false
    return (Date.now() - new Date(cs.lastContactDate).getTime()) / 86400000 < 90
  }).length

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Echo keyframes */}
      <style>{`
        @keyframes echoPulse {
          0%   { transform: scale(0.7); opacity: 0.7 }
          70%  { transform: scale(2);   opacity: 0   }
          100% { transform: scale(2);   opacity: 0   }
        }
        .echo-pulse { animation: echoPulse 2.6s cubic-bezier(0.22,0.61,0.36,1) infinite; }
        @keyframes echoCardIn {
          from { transform: translateY(14px) scale(0.985); opacity: 0 }
          to   { transform: translateY(0) scale(1); opacity: 1 }
        }
      `}</style>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '28px 44px 0',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          Your Loops
        </div>
        <IconButton
          icon={<Settings size={16} strokeWidth={1.8} />}
          label="Settings"
          onClick={onOpenSettings}
        />
      </div>

      {/* Model upgrade card — shown once, dismissed on complete or X */}
      {upgradeStatus !== null && (
        <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
          <ModelUpgradeCard
            status={upgradeStatus}
            progress={upgradeProgress}
            onDismiss={() => setUpgradeStatus(null)}
            onUpgrade={handleUpgrade}
            onCancel={handleCancelUpgrade}
          />
        </div>
      )}

      {/* Nudge card — most overdue close contact */}
      {nudgeContact && (
        <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
          <NudgeCard
            contactName={nudgeContact.name}
            contactInitials={nudgeContact.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            nudgeText={`You've been quiet with ${nudgeContact.name.split(' ')[0]}. Worth a message.`}
            onMessage={handleNudgeMessage}
            onDismiss={handleNudgeDismiss}
          />
        </div>
      )}

      {/* Dead thread card — contact reached out to but got no reply */}
      {deadThreadContact && (
        <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
          <DeadThreadCard
            contactName={deadThreadContact.name}
            contactInitials={deadThreadContact.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            onTryAgain={handleDeadThreadTryAgain}
            onLetItRest={handleDeadThreadLetItRest}
          />
        </div>
      )}

      {/* Quiet day card — ambient warmth when no actionable cards are showing */}
      {!nudgeContact && !deadThreadContact && (
        <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
          <QuietDayCard
            chapterName={echoChapter?.name}
            yearsAgo={echoChapter?.echoAnniversary?.years}
            onClick={echoChapter ? () => handleSeeEcho(echoChapter) : undefined}
          />
        </div>
      )}

      {/* Opening Moment — only when zero urgent signals */}
      {showOpeningMoment && (
        <OpeningMomentCard
          memory={state!.onThisDayMemory!}
          chapters={state!.chapters}
        />
      )}

      {/* Echo arrival band */}
      {echoChapter && !echoCardOpen && (
        <div style={{
          margin: '8px 44px 26px',
          padding: '14px 18px',
          background: 'var(--accent-faint)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(184,98,74,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexShrink: 0,
        }}>
          {/* Pulsing dot */}
          <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'var(--accent)',
            }} />
            <div className="echo-pulse" style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'var(--accent)',
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {echoChapter.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginTop: 2,
            }}>
              {echoChapter.echoAnniversary!.years} {echoChapter.echoAnniversary!.years === 1 ? 'year' : 'years'} ago today
            </div>
          </div>
          <button
            onClick={() => handleSeeEcho(echoChapter)}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              flexShrink: 0,
            }}
          >
            See it
          </button>
        </div>
      )}

      {/* Horizontal atom timeline */}
      <div style={{
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}>
        {chapterAtoms.length > 0 ? (
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '32px 44px',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            {chapterAtoms.map((atom) => (
              <AtomCard
                key={atom.chapter.id}
                atom={atom}
                glow={glowChapterId === atom.chapter.id}
                onClick={() => onOpenChapter(atom.chapter.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {state?.whatsappConnected ? 'Your chapters are on their way.' : 'No chapters yet.'}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
              {state?.whatsappConnected ? 'Loop is reading your conversations.' : 'Connect WhatsApp to discover your loops.'}
            </div>
          </div>
        )}
      </div>

      {/* Echo card overlay */}
      {echoCardOpen && echoCardChapter && (
        <div
          onClick={() => setEchoCardOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(36,24,18,0.46)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            zIndex: 100,
          }}
        >
          {/* Card */}
          <div
            ref={echoCardRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 340,
              height: 478,
              background: '#FBF5EE',
              borderRadius: 20,
              padding: '40px 36px 36px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(36,24,18,0.28)',
              animation: 'echoCardIn 460ms ease both',
              boxSizing: 'border-box',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setEchoCardOpen(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(36,24,18,0.08)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <X size={16} strokeWidth={1.8} color="var(--text-secondary)" />
            </button>

            {/* Eyebrow */}
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 14,
            }}>
              An Echo
            </div>

            {/* Chapter name */}
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 48,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1.0,
              marginBottom: 10,
            }}>
              {echoCardChapter.name}
            </div>

            {/* Years */}
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 16,
              color: 'var(--accent)',
              marginBottom: 20,
            }}>
              {echoCardChapter.echoAnniversary!.years} {echoCardChapter.echoAnniversary!.years === 1 ? 'year' : 'years'} ago today
            </div>

            {/* Echo line */}
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: 'auto',
            }}>
              {echoLine(echoCardChapter.echoAnniversary!.years, echoCardContacts.length, echoCardActive)}
            </div>

            {/* Crew avatars */}
            <div style={{ display: 'flex', marginBottom: 28, marginTop: 24 }}>
              {echoCardContacts.slice(0, 4).map((c, i) => {
                const offsets = [-7, 9, -4, 8]
                const rotations = [-3, 2, -2, 3]
                return (
                  <div
                    key={c.id}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: tintFor(c.name),
                      border: '2px solid #FBF5EE',
                      marginLeft: i === 0 ? 0 : -11,
                      transform: `translateY(${offsets[i] ?? 0}px) rotate(${rotations[i] ?? 0}deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: i,
                      position: 'relative',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#FBF5EE',
                      lineHeight: 1,
                    }}>
                      {c.name[0]}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Loop signature */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7.5" stroke="var(--accent)" strokeWidth="1.4" />
                <circle cx="9" cy="9" r="2.5" fill="var(--accent)" />
              </svg>
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 12,
                color: 'var(--accent)',
                letterSpacing: '.02em',
              }}>
                Loop
              </span>
            </div>
          </div>

          {/* Action buttons below card */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSaveEchoImage}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: '#FBF5EE',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 100,
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              Save as image
            </button>
            <button
              onClick={() => {
                window.loop.shell.openExternal('https://www.instagram.com').catch(() => null)
              }}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: '#FBF5EE',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 100,
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              Share to IG
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
