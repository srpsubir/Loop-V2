import React, { useState, useEffect, useCallback } from 'react'
import { Gift, Plus, Settings, RefreshCw, Send } from 'lucide-react'
import { Avatar, Button, IconButton, PaperCard, PersonRow } from '../components'
import { OnThisDay } from '../components/OnThisDay'
import type { AppState, Contact, Chapter, ContactState } from '@shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnYourMindEntry {
  contact: Contact
  contactState: ContactState
  reason: string
  urgency: number
  isHero: boolean
}

interface GardenScreenProps {
  onOpenChapter: (chapterId: string) => void
  onOpenBrief: (contactId: string) => void
  onOpenSettings: () => void
}

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useGardenData() {
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
    } catch {
      // Main handlers not yet wired — graceful no-op
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const unsub = window.loop?.state?.onChange?.(() => load())
    return () => unsub?.()
  }, [load])

  return { state, contacts, loading, reload: load }
}

// ─── On-your-mind computation ─────────────────────────────────────────────────

function buildOnYourMind(contacts: Contact[], appState: AppState): OnYourMindEntry[] {
  const today = Date.now()
  const entries: OnYourMindEntry[] = []

  for (const contact of contacts) {
    const cs = appState.contacts[contact.id]
    if (!cs || !cs.brief) continue

    let reason = cs.nextOccasion?.label ?? ''
    let urgency = 0

    if (cs.nextOccasion) {
      const daysUntil = (new Date(cs.nextOccasion.date).getTime() - today) / 86400000
      if (cs.nextOccasion.type === 'birthday') {
        urgency = 1000 - Math.max(0, daysUntil)
      } else {
        urgency = 500 - Math.max(0, daysUntil)
      }
    } else if (contact.tier === 'close' && contact.intervalDays && cs.lastContactDate) {
      const daysSince = (today - new Date(cs.lastContactDate).getTime()) / 86400000
      if (daysSince > contact.intervalDays) {
        urgency = daysSince - contact.intervalDays
        reason = `${Math.floor(daysSince)} days since you last spoke`
      }
    }

    if (reason) {
      entries.push({ contact, contactState: cs, reason, urgency, isHero: false })
    }
  }

  entries.sort((a, b) => b.urgency - a.urgency)
  if (entries.length > 0) entries[0].isHero = true
  return entries.slice(0, 5)
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MindHero({ entry, onOpen }: { entry: OnYourMindEntry; onOpen: () => void }) {
  const { contact, contactState, reason } = entry
  const heroSrc = contactState.brief?.heroPhotoPath
    ? `loop-file://${contactState.brief.heroPhotoPath}`
    : undefined

  return (
    <PaperCard raised padding={0} style={{ overflow: 'hidden', display: 'flex', minHeight: 180 }}>
      <div
        style={{
          width: 200,
          flexShrink: 0,
          background: 'var(--accent-faint)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Avatar name={contact.name} src={heroSrc} size={100} ring="terracotta" />
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
          <Gift size={16} strokeWidth={1.8} />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {reason}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            margin: '8px 0',
          }}
        >
          {contact.name}
        </div>
        {contactState.brief?.contextLines?.[0] && (
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              maxWidth: 480,
            }}
          >
            {contactState.brief.contextLines[0]}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <Button onClick={onOpen}>Open brief</Button>
          {contact.whatsappId && (
            <Button
              variant="secondary"
              iconLeft={<Send size={14} strokeWidth={1.8} />}
              onClick={async () => {
                if (contact.whatsappId) await window.loop.shell.openWhatsApp(contact.whatsappId)
              }}
            >
              Say hi
            </Button>
          )}
        </div>
      </div>
    </PaperCard>
  )
}

function ChapterCard({ chapter, onOpen }: { chapter: Chapter; onOpen: () => void }) {
  const coverSrc = chapter.coverPhotoPath
    ? `loop-file://${chapter.coverPhotoPath}`
    : undefined

  const yearRange =
    chapter.startYear && chapter.endYear
      ? `${chapter.startYear} – ${chapter.endYear}`
      : chapter.startYear
        ? `${chapter.startYear} – now`
        : chapter.active
          ? 'Ongoing'
          : ''

  return (
    <PaperCard interactive padding={0} onClick={onOpen} style={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
      {coverSrc ? (
        <img
          src={coverSrc}
          alt={chapter.name}
          style={{
            width: '100%',
            height: 140,
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            height: 140,
            background: 'var(--accent-faint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 40,
              fontWeight: 600,
              color: 'var(--accent)',
              opacity: 0.3,
            }}
          >
            {chapter.name[0]}
          </span>
        </div>
      )}
      <div style={{ padding: '14px 16px 16px' }}>
        {yearRange && (
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 4,
            }}
          >
            {yearRange}
          </div>
        )}
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
          }}
        >
          {chapter.name}
        </div>
        {chapter.location && (
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            {chapter.location}
          </div>
        )}
      </div>
    </PaperCard>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  )
}

function ScanBanner({ onScan, scanning }: { onScan: () => void; scanning: boolean }) {
  return (
    <div
      style={{
        background: 'var(--positive-faint)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
      }}
    >
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--positive)' }}>
        {scanning ? 'Scanning your people…' : 'Connect WhatsApp to discover your people.'}
      </span>
      {!scanning && (
        <Button variant="secondary" size="sm" iconLeft={<RefreshCw size={13} strokeWidth={1.8} />} onClick={onScan}>
          Scan now
        </Button>
      )}
    </div>
  )
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyOnYourMind() {
  return (
    <PaperCard raised style={{ textAlign: 'center', padding: '32px 24px' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 6 }}>
        Your people are quiet.
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
        Run a scan once WhatsApp is connected to see who's on your mind.
      </div>
    </PaperCard>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function GardenScreen({ onOpenChapter, onOpenBrief, onOpenSettings }: GardenScreenProps) {
  const { state, contacts, loading, reload } = useGardenData()
  const [scanning, setScanning] = useState(false)

  const onYourMind = state ? buildOnYourMind(contacts, state) : []
  const [hero, ...rest] = onYourMind

  const totalPeople = contacts.length
  const totalChapters = state?.chapters.length ?? 0

  const subLine =
    totalPeople === 0
      ? 'No people yet. Connect WhatsApp to discover your crews.'
      : totalChapters === 0
        ? `${totalPeople} ${totalPeople === 1 ? 'person' : 'people'}.`
        : hero
          ? `${totalPeople} ${totalPeople === 1 ? 'person' : 'people'} across ${totalChapters} ${totalChapters === 1 ? 'chapter' : 'chapters'}. ${hero.contact.name.split(' ')[0]} has ${hero.reason.toLowerCase()}.`
          : `${totalPeople} ${totalPeople === 1 ? 'person' : 'people'} across ${totalChapters} ${totalChapters === 1 ? 'chapter' : 'chapters'}.`

  const handleScan = async () => {
    setScanning(true)
    try {
      await window.loop.scan.run()
      const unsub = window.loop.scan.onComplete(() => {
        setScanning(false)
        reload()
        unsub()
      })
    } catch {
      setScanning(false)
    }
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

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 56px 72px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 32,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {timeGreeting()}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <IconButton
              icon={<RefreshCw size={16} strokeWidth={1.8} />}
              label="Scan now"
              onClick={handleScan}
              style={{ opacity: scanning ? 0.5 : 1 }}
            />
            <IconButton
              icon={<Settings size={16} strokeWidth={1.8} />}
              label="Settings"
              onClick={onOpenSettings}
            />
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-secondary)', marginBottom: 36 }}>
          {subLine}
        </div>

        {/* Scan banner if not connected */}
        {state && !state.whatsappConnected && (
          <ScanBanner onScan={handleScan} scanning={scanning} />
        )}

        {/* On This Day memory card */}
        {state?.onThisDayMemory && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 20 }}>
              On This Day
            </div>
            <OnThisDay
              yearsAgo={state.onThisDayMemory.yearsAgo}
              weekLabel={(() => {
                const d = new Date(state.onThisDayMemory!.date)
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                return `Week of ${d.getDate()} ${months[d.getMonth()]}`
              })()}
              flavourText={state.onThisDayMemory.snippet}
              person={{ id: state.onThisDayMemory.contactId, name: state.onThisDayMemory.contactName }}
              rotation={-1.5}
            />
          </div>
        )}

        {/* On your mind */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionLabel>On your mind</SectionLabel>
        </div>

        {hero ? (
          <>
            <MindHero entry={hero} onOpen={() => onOpenBrief(hero.contact.id)} />
            {rest.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <PaperCard padding={8}>
                  {rest.map((e, i) => (
                    <div key={e.contact.id}>
                      <PersonRow
                        name={e.contact.name}
                        note={e.reason}
                        onClick={() => onOpenBrief(e.contact.id)}
                        trailing={
                          <Button variant="secondary" size="sm" iconLeft={<Send size={13} strokeWidth={1.8} />}>
                            Say hi
                          </Button>
                        }
                      />
                      {i < rest.length - 1 && (
                        <div style={{ height: 1, background: 'var(--border-light)', margin: '0 12px' }} />
                      )}
                    </div>
                  ))}
                </PaperCard>
              </div>
            )}
          </>
        ) : (
          <EmptyOnYourMind />
        )}

        {/* Your chapters */}
        {state && state.chapters.length > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                margin: '48px 0 16px',
              }}
            >
              <SectionLabel>Your chapters</SectionLabel>
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<Plus size={14} strokeWidth={1.8} />}
                onClick={onOpenSettings}
              >
                New chapter
              </Button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 20,
              }}
            >
              {state.chapters.map((ch) => (
                <ChapterCard key={ch.id} chapter={ch} onOpen={() => onOpenChapter(ch.id)} />
              ))}
            </div>
          </>
        )}

        {/* No chapters placeholder */}
        {state && state.chapters.length === 0 && contacts.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <SectionLabel>Your chapters</SectionLabel>
              <Button variant="ghost" size="sm" iconLeft={<Plus size={14} strokeWidth={1.8} />} onClick={onOpenSettings}>
                New chapter
              </Button>
            </div>
            <PaperCard style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
                Chapters organise your people by the periods of your life: London years, Edinburgh, home. Add one to get started.
              </div>
            </PaperCard>
          </div>
        )}
      </div>
    </div>
  )
}
