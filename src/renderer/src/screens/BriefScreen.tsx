import React, { useState, useEffect } from 'react'
import { ArrowLeft, Send, Heart, Camera, CalendarPlus, Check } from 'lucide-react'
import { Avatar, Button, IconButton, Tag } from '../components'
import type { Contact, Brief, AppState, Chapter, Occasion } from '@shared/types'

interface BriefScreenProps {
  contactId: string
  onBack: () => void
}

interface BriefData {
  contact: Contact | null
  brief: Brief | null
  chapters: Chapter[]
  lastContactDate: string | null
  nextOccasion: Occasion | null
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({
  dot,
  date,
  text,
  serif,
  last,
}: {
  dot: 'accent' | 'rose'
  date: string
  text: string
  serif?: boolean
  last?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 14 }}>
        <span
          style={{
            width: 11,
            height: 11,
            borderRadius: '50%',
            background: dot === 'accent' ? 'var(--accent)' : 'var(--people)',
            boxShadow: '0 0 0 4px var(--bg)',
            marginTop: 4,
            flexShrink: 0,
          }}
        />
        {!last && (
          <span style={{ width: 2, flex: 1, background: 'var(--border-light)', marginTop: 4 }} />
        )}
      </div>
      <div style={{ paddingBottom: 28, flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}
        >
          {date}
        </div>
        <div
          style={{
            fontFamily: serif ? 'var(--font-serif)' : 'var(--font-sans)',
            fontSize: serif ? 16 : 14,
            fontStyle: serif ? 'italic' : 'normal',
            color: serif ? 'var(--text-primary)' : 'var(--text-secondary)',
            lineHeight: 1.65,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function BriefScreen({ contactId, onBack }: BriefScreenProps) {
  const [data, setData] = useState<BriefData>({
    contact: null,
    brief: null,
    chapters: [],
    lastContactDate: null,
    nextOccasion: null,
  })
  const [loading, setLoading] = useState(true)
  const [calendarAdded, setCalendarAdded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [brief, contacts, state] = await Promise.all([
          window.loop.brief.open(contactId),
          window.loop.contacts.list(),
          window.loop.state.get() as Promise<AppState>,
        ])

        const contact = contacts.find((c) => c.id === contactId) ?? null
        const cs = state.contacts[contactId]
        const chapters = contact
          ? state.chapters.filter((ch) => contact.chapterIds.includes(ch.id))
          : []

        setData({
          contact,
          brief,
          chapters,
          lastContactDate: cs?.lastContactDate ?? null,
          nextOccasion: cs?.nextOccasion ?? null,
        })
      } catch {
        // pass
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [contactId])

  const { contact, brief, chapters, lastContactDate, nextOccasion } = data

  const handleAddToCalendar = async () => {
    if (!contact || !brief) return
    try {
      await window.loop.calendar.addEvent({
        contactName: contact.name,
        occasionType: nextOccasion?.type ?? null,
        occasionDate: nextOccasion?.date ?? null,
        reasonToReachOut: brief.reasonToReachOut,
        contextLine: brief.contextLines[0],
      })
      setCalendarAdded(true)
      setTimeout(() => setCalendarAdded(false), 4000)
    } catch { /* ignore */ }
  }

  const heroSrc = brief?.heroPhotoPath ? `loop-file://${brief.heroPhotoPath}` : undefined

  function formatLastContact(iso: string | null): string {
    if (!iso) return 'Never recorded'
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    const weeks = Math.floor(days / 7)
    if (days < 30) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
    const months = Math.floor(days / 30)
    if (days < 365) return `${months} ${months === 1 ? 'month' : 'months'} ago`
    const years = Math.floor(days / 365)
    return `${years} ${years === 1 ? 'year' : 'years'} ago`
  }

  const handlePickPhoto = async () => {
    try {
      // @ts-ignore — photos:pickHero is not in the typed bridge yet
      const path: string | null = await window.loop.photos?.pickHero?.()
      if (path && brief && contact) {
        // Save updated brief heroPhotoPath via state patch
        const state = await window.loop.state.get()
        const cs = state.contacts[contactId]
        if (cs && cs.brief) {
          await window.loop.state.patch({
            contacts: {
              ...state.contacts,
              [contactId]: {
                ...cs,
                brief: { ...cs.brief, heroPhotoPath: path },
              },
            },
          })
          setData((d) => ({
            ...d,
            brief: d.brief ? { ...d.brief, heroPhotoPath: path } : d.brief,
          }))
        }
      }
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 17 }}>
          Opening…
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text-secondary)' }}>
          Person not found.
        </div>
        <Button variant="secondary" onClick={onBack}>Go back</Button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 56px 80px' }}>
        {/* Back */}
        <div style={{ marginBottom: 24 }}>
          <IconButton
            variant="ghost"
            label="Back"
            icon={<ArrowLeft size={18} strokeWidth={1.8} />}
            onClick={onBack}
          />
        </div>

        {/* Hero section */}
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar name={contact.name} src={heroSrc} size={88} ring={contact.tier === 'close' ? 'sage' : 'none'} />
            <button
              type="button"
              onClick={handlePickPhoto}
              title="Pick a photo"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '2px solid var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <Camera size={12} strokeWidth={1.8} />
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 32,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {contact.name}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Last contact: {formatLastContact(lastContactDate)}
            </div>
            {(chapters.length > 0 || contact.tier === 'close') && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {chapters.map((ch) => (
                  <Tag key={ch.id} tone="chapter">{ch.name}</Tag>
                ))}
                {contact.tier === 'close' && (
                  <Tag tone="positive" icon={<Heart size={11} strokeWidth={1.8} />}>
                    Close
                  </Tag>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, alignItems: 'center' }}>
          <Button
            iconLeft={calendarAdded
              ? <Check size={15} strokeWidth={2} />
              : <CalendarPlus size={15} strokeWidth={1.8} />
            }
            onClick={handleAddToCalendar}
            disabled={!brief || calendarAdded}
          >
            {calendarAdded ? 'Added to Calendar' : 'Add to calendar'}
          </Button>
          {contact.whatsappId && (
            <Button
              variant="ghost"
              iconLeft={<Send size={14} strokeWidth={1.8} />}
              onClick={() => contact.whatsappId && window.loop.shell.openWhatsApp(contact.whatsappId)}
            >
              Open WhatsApp
            </Button>
          )}
        </div>

        {/* Brief context */}
        {brief ? (
          <>
            {/* Reason to reach out */}
            {brief.reasonToReachOut && (
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  color: 'var(--accent)',
                  fontWeight: 600,
                  background: 'var(--accent-faint)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 16px',
                  marginBottom: 32,
                }}
              >
                {brief.reasonToReachOut}
              </div>
            )}

            {/* Timeline */}
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                fontWeight: 600,
                marginBottom: 22,
              }}
            >
              Your story together
            </div>
            <div>
              {brief.contextLines.map((line, i) => (
                <TimelineItem
                  key={i}
                  dot={i === 0 ? 'accent' : 'rose'}
                  date={i === 0 ? 'Recently' : 'Earlier'}
                  text={line}
                  serif={i === brief.contextLines.length - 1}
                  last={i === brief.contextLines.length - 1}
                />
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-serif)',
              fontSize: 17,
              fontStyle: 'italic',
            }}
          >
            Brief not yet generated.
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontStyle: 'normal', marginTop: 8 }}>
              Run a scan to let Loop read your conversation history.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
