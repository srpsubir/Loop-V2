import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Settings, X } from 'lucide-react'
import { IconButton } from '../components'
import { ConnectionStatusBadge } from '../components/ConnectionStatusBadge'
import { useConnectionState } from '../ConnectionStateContext'
import { NudgeCard } from '../components/NudgeCard'
import { ContactTierIndicator } from '../components/ContactTierIndicator'
import { QuietDayCard } from '../components/QuietDayCard'
import { DeadThreadCard } from '../components/DeadThreadCard'
import { OnYourMindSection } from '../components/OnYourMindSection'
import type { AppState, Contact, ContactState, OnThisDayMemory, Chapter } from '@shared/types'
import { toPng } from 'html-to-image'

// ─── Types ────────────────────────────────────────────────────────────────────

interface YourLoopsScreenProps {
  onOpenChapter: (chapterId: string) => void
  onOpenSettings: () => void
  onOpenStory: (contactId: string, chapterId: string) => void
}

type AtomState = 'active' | 'fading' | 'dead-thread' | 'birthday-live' | 'birthday-fading'

interface ChapterAtom {
  chapter: Chapter
  atomState: AtomState
  crewColors: string[]
  crewInitials: string[]
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
  if (cs.autosuppressed) return false
  if (!isMemberFading(contact, cs)) return false
  // Snooze gate (MAV-205)
  if (cs.snoozedUntil && new Date(cs.snoozedUntil) > new Date()) return false
  // Recent reach-out gate (MAV-212): skip if reached out within 7 days
  if (cs.lastReachOutAt) {
    const daysSinceReachOut = (Date.now() - new Date(cs.lastReachOutAt).getTime()) / 86400000
    if (daysSinceReachOut < 7) return false
  }
  // Escalating dismiss cooldown (MAV-210): 0-2 dismissals → 7 days, 3-4 → 30 days, 5+ → suppressed
  const dismissCount = cs.nudgeDismissCount ?? 0
  if (dismissCount >= 5) return false
  if (cs.nudgeDismissedAt) {
    const daysSinceDismiss = (Date.now() - new Date(cs.nudgeDismissedAt).getTime()) / 86400000
    const cooldownDays = dismissCount >= 3 ? 30 : 7
    if (daysSinceDismiss < cooldownDays) return false
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

// ─── Chapter card (MAV-197) ───────────────────────────────────────────────────

const CARD_GRADIENTS = [
  'linear-gradient(160deg, #8A5A4A 0%, #B8624A 60%, #C4876E 100%)',
  'linear-gradient(160deg, #3A5A7A 0%, #5A7A9A 60%, #8AAABF 100%)',
  'linear-gradient(160deg, #4A6A4A 0%, #6A8A6A 60%, #90A890 100%)',
  'linear-gradient(160deg, #5A4A7A 0%, #7A6A9A 60%, #A098B8 100%)',
  'linear-gradient(160deg, #7A5A3A 0%, #9A7A5A 60%, #B89A78 100%)',
]

function gradientFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return CARD_GRADIENTS[h % CARD_GRADIENTS.length]
}

function ChapterCard({ atom, glow, onClick }: { atom: ChapterAtom; glow: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const isFading = atom.atomState === 'fading' || atom.atomState === 'dead-thread'
  const era = atom.chapter.startYear
    ? `${atom.chapter.startYear}${atom.chapter.endYear ? ` – ${atom.chapter.endYear}` : ' – present'}`
    : undefined

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
        flexShrink: 0,
        width: 160,
        height: 190,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        outline: 'none',
        filter: isFading ? 'saturate(0.35) brightness(0.88)' : undefined,
        opacity: isFading ? 0.82 : 1,
        transform: hov ? 'scale(1.03)' : 'scale(1)',
        boxShadow: glow
          ? '0 0 0 3px rgba(184,98,74,0.5), 0 6px 20px rgba(26,16,12,0.12)'
          : '0 1px 4px rgba(26,16,12,0.08), 0 6px 20px rgba(26,16,12,0.08)',
        transition: 'transform 120ms ease, box-shadow 120ms ease, opacity 200ms ease',
      } as React.CSSProperties}
    >
      <div style={{ position: 'absolute', inset: 0, background: gradientFor(atom.chapter.name) }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(26,16,12,0) 30%, rgba(26,16,12,0.65) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}>
        <div style={{ display: 'flex', marginBottom: 8 }}>
          {atom.crewColors.slice(0, 4).map((color, i) => (
            <div key={i} style={{
              width: 24, height: 24, borderRadius: '50%',
              background: color,
              border: '1.5px solid rgba(255,255,255,0.65)',
              marginRight: -7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 500, color: 'white',
              fontFamily: 'var(--font-sans)',
              userSelect: 'none',
            }}>
              {atom.crewInitials[i] ?? '?'}
            </div>
          ))}
        </div>
        <div data-testid="chapter-name" style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 600,
          color: '#FFFFFF',
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {atom.chapter.name}
        </div>
        {era && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
            {era}
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
    <div data-testid="opening-moment-card" style={{
      margin: '20px 44px 0',
      padding: '16px 24px',
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

export function YourLoopsScreen({ onOpenChapter, onOpenSettings, onOpenStory }: YourLoopsScreenProps) {
  const { state, contacts, loading } = useYourLoopsData()
  const { connectionState } = useConnectionState()
  const [glowChapterId, setGlowChapterId] = useState<string | null>(null)
  const [echoCardOpen, setEchoCardOpen] = useState(false)
  const [echoChapterId, setEchoChapterId] = useState<string | null>(null)
  const echoCardRef = useRef<HTMLDivElement>(null)
  const [hiddenDeadThreadIds, setHiddenDeadThreadIds] = useState<Set<string>>(new Set())

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
      const crew = chapterContacts.slice(0, 4)
      return {
        chapter,
        atomState: deriveAtomState(chapterContacts, state.contacts),
        crewColors: crew.map((c) => tintFor(c.name)),
        crewInitials: crew.map((c) => c.name.trim().split(/\s+/)[0]?.[0]?.toUpperCase() ?? '?'),
      }
    })
  }, [state, contacts])

  const closeContacts = useMemo(() => {
    if (!state) return []
    return contacts
      .filter((c) => c.tier === 'close')
      .sort((a, b) => {
        const csA = state.contacts[a.id]
        const csB = state.contacts[b.id]
        const daysA = csA?.lastContactDate
          ? (Date.now() - new Date(csA.lastContactDate).getTime()) / 86400000 : 0
        const daysB = csB?.lastContactDate
          ? (Date.now() - new Date(csB.lastContactDate).getTime()) / 86400000 : 0
        // MAV-209: weight by relationshipStrength (0-1); fall back to 0.5 if not yet scanned
        const scoreA = daysA * (csA?.relationshipStrength ?? 0.5)
        const scoreB = daysB * (csB?.relationshipStrength ?? 0.5)
        return scoreB - scoreA
      })
  }, [contacts, state])

  // Nudge card: most-overdue close contact eligible for a nudge
  const nudgeContact = useMemo(() => {
    if (!state) return null
    const eligible = contacts.filter((c) => {
      const cs = state.contacts[c.id]
      return cs && isNudgeEligible(c, cs)
    })
    eligible.sort((a, b) => {
      const csA = state.contacts[a.id]
      const csB = state.contacts[b.id]

      // MAV-211: birthday within 7 days jumps to the top regardless of other scores
      const birthdayBoostA = csA?.nextOccasion?.type === 'birthday' &&
        (new Date(csA.nextOccasion.date).getTime() - Date.now()) / 86400000 <= 7 ? 1 : 0
      const birthdayBoostB = csB?.nextOccasion?.type === 'birthday' &&
        (new Date(csB.nextOccasion.date).getTime() - Date.now()) / 86400000 <= 7 ? 1 : 0
      if (birthdayBoostA !== birthdayBoostB) return birthdayBoostB - birthdayBoostA

      // MAV-209: base score = days overdue weighted by relationshipStrength
      const daysA = csA?.lastContactDate
        ? (Date.now() - new Date(csA.lastContactDate).getTime()) / 86400000
        : Infinity
      const daysB = csB?.lastContactDate
        ? (Date.now() - new Date(csB.lastContactDate).getTime()) / 86400000
        : Infinity
      let scoreA = isFinite(daysA) ? daysA * (csA?.relationshipStrength ?? 0.5) : 1e9
      let scoreB = isFinite(daysB) ? daysB * (csB?.relationshipStrength ?? 0.5) : 1e9

      // MAV-213: reconnectedAt within 14 days → boost by 1.3x to sustain momentum
      if (csA?.reconnectedAt) {
        const daysSinceReconnect = (Date.now() - new Date(csA.reconnectedAt).getTime()) / 86400000
        if (daysSinceReconnect <= 14) scoreA *= 1.3
      }
      if (csB?.reconnectedAt) {
        const daysSinceReconnect = (Date.now() - new Date(csB.reconnectedAt).getTime()) / 86400000
        if (daysSinceReconnect <= 14) scoreB *= 1.3
      }

      return scoreB - scoreA
    })
    return eligible[0] ?? null
  }, [contacts, state])

  const handleNudgeMessage = useCallback(() => {
    if (!nudgeContact || !state) return
    // Pick first chapter as navigation context — user may belong to multiple
    const chapterId = nudgeContact.chapterIds[0]
    if (!chapterId) {
      // Fallback: open WhatsApp directly if contact has no chapter assignment
      if (nudgeContact.whatsappId) window.loop.shell.openWhatsApp(nudgeContact.whatsappId, nudgeContact.id).catch(() => {})
      return
    }
    // Navigate to Story; Story screen handles state update + WhatsApp open
    onOpenStory(nudgeContact.id, chapterId)
  }, [nudgeContact, state, onOpenStory])

  const handleNudgeDismiss = useCallback(async () => {
    if (!nudgeContact || !state) return
    const cs = state.contacts[nudgeContact.id]
    if (!cs) return
    // MAV-210: increment dismiss count; autosuppress at >= 5
    const nudgeDismissCount = (cs.nudgeDismissCount ?? 0) + 1
    const autosuppressed = nudgeDismissCount >= 5
    await window.loop.state.patch({
      contacts: {
        ...state.contacts,
        [nudgeContact.id]: {
          ...cs,
          nudgeDismissedAt: new Date().toISOString(),
          nudgeDismissCount,
          autosuppressed,
        },
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

  const deadThreadWeeksSince = useMemo(() => {
    if (!deadThreadContact || !state) return 6
    const cs = state.contacts[deadThreadContact.id]
    if (!cs?.lastContactDate) return 6
    return Math.max(1, Math.floor((Date.now() - new Date(cs.lastContactDate).getTime()) / (7 * 86400000)))
  }, [deadThreadContact, state])

  // Echo: first chapter with an unseen anniversary
  const echoChapter = state?.chapters.find((ch) =>
    ch.echoAnniversary && !ch.echoAnniversary.seenAt?.startsWith(String(new Date().getFullYear()))
  ) ?? null

  const echoCrewInitials = useMemo(() => {
    if (!echoChapter) return []
    return contacts
      .filter((c) => c.chapterIds.includes(echoChapter.id))
      .slice(0, 4)
      .map((c) => c.name.trim().split(/\s+/)[0]?.[0]?.toUpperCase() ?? '?')
  }, [echoChapter, contacts])

  // Opening moment: only when there are zero urgent signals
  const hasSignals = chapterAtoms.some(
    (a) => a.atomState === 'fading' || a.atomState === 'birthday-live' || a.atomState === 'dead-thread'
  )
  const showOpeningMoment = !hasSignals && !!state?.onThisDayMemory && chapterAtoms.length > 0

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

  // MAV-193: WhatsApp connected but chapter detection not yet complete — show scanning state
  if (state?.whatsappConnected && !state.chapterDetectionComplete) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 20 }}>
        <style>{`
          @keyframes loopScanPulse {
            0%, 100% { opacity: 0.35; transform: scale(0.92); }
            50%       { opacity: 1;    transform: scale(1); }
          }
        `}</style>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--accent)',
              animation: 'loopScanPulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.22}s`,
            }} />
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 8 }}>
            Loop is reading your conversations.
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            This usually takes 1–2 minutes.<br />Your chapters will appear when it's done.
          </div>
        </div>
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <IconButton
            icon={<Settings size={16} strokeWidth={1.8} />}
            label="Settings"
            onClick={onOpenSettings}
          />
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
      <ConnectionStatusBadge />
      {/* On Your Mind section */}
      <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
        <OnYourMindSection contacts={[]} onNavigate={() => {}} />
      </div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '28px 44px 0',
        flexShrink: 0,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()}
          </div>
        </div>
        <IconButton
          icon={<Settings size={16} strokeWidth={1.8} />}
          label="Settings"
          onClick={onOpenSettings}
        />
      </div>

      {/* Nudge card — most overdue close contact */}
      {nudgeContact && (
        <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
          <NudgeCard
            contact={nudgeContact}
            contactInitials={nudgeContact.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            nudgeText={`${nudgeContact.name.split(' ')[0]} has been quiet in your life lately.`}
            onMessage={handleNudgeMessage}
            onDismiss={handleNudgeDismiss}
          />
        </div>
      )}

      {/* Dead thread card — contact reached out to but got no reply */}
      {deadThreadContact && (
        <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
          <DeadThreadCard
            contact={deadThreadContact}
            weeksSince={deadThreadWeeksSince}
            onTryAgain={handleDeadThreadTryAgain}
            onLetItRest={handleDeadThreadLetItRest}
          />
        </div>
      )}

      {/* Quiet day card — ambient warmth when no actionable cards are showing */}
      {!nudgeContact && !deadThreadContact && chapterAtoms.length > 0 && (
        <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
          <QuietDayCard
            chapterName={echoChapter?.name}
            yearsAgo={echoChapter?.echoAnniversary?.years}
            crewInitials={echoCrewInitials}
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
          padding: '12px 16px',
          background: 'var(--accent-faint)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(184,98,74,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
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

      {/* Stay Close strip — A1 + A5 */}
      <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
        {closeContacts.length > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                Stay close
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
              {closeContacts.map((c) => {
                const cs = state?.contacts[c.id]
                const lastDate = cs?.lastContactDate
                const daysOverdue = lastDate
                  ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
                  : undefined
                const urgent = (daysOverdue !== undefined && daysOverdue >= 30) && cs?.messageStrength === 'high'
                return (
                  <div
                    key={c.id}
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => onOpenStory(c.id, c.chapterIds[0] ?? '')}
                  >
                    <ContactTierIndicator tier="close" name={c.name} size={36} daysOverdue={daysOverdue} urgent={urgent} />
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
              The people who matter most, all in one place.
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Mark someone as Close from their world.
            </div>
          </div>
        )}
      </div>

      {/* Zone divider — People / Chapter layers */}
      <div style={{ padding: '20px 44px 0', flexShrink: 0 }}>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />
      </div>

      {/* Chapter cards — MAV-197 */}
      <div style={{ padding: '16px 44px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            Chapters
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', alignItems: 'flex-start' }}>
        {chapterAtoms.length > 0 ? (
          <div style={{ display: 'flex', gap: 12, padding: '0 44px 32px', alignItems: 'flex-start', flexShrink: 0 }}>
            {chapterAtoms.map((atom) => (
              <ChapterCard
                key={atom.chapter.id}
                atom={atom}
                glow={glowChapterId === atom.chapter.id}
                onClick={() => onOpenChapter(atom.chapter.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
              background: 'var(--surface-raised)',
              borderRadius: 20,
              padding: '40px 36px 36px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
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
              marginBottom: 12,
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
                      border: '2px solid rgba(255,255,255,0.20)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
