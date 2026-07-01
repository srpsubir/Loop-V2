import React, { useState, useEffect } from 'react'
import { ArrowLeft, Camera } from 'lucide-react'
import { IconButton } from '../components'
import { ContactTierIndicator } from '../components/ContactTierIndicator'
import { ConnectionStatusBadge } from '../components/ConnectionStatusBadge'
import type { Chapter, Contact, AppState, ContactState } from '@shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChapterDetailScreenProps {
  chapterId: string
  onBack: () => void
  onOpenStory: (contactId: string) => void
}

interface ChapterData {
  chapter: Chapter | null
  contacts: Contact[]
  appState: AppState | null
}

// ─── Fading detection ─────────────────────────────────────────────────────────

function isMemberFading(contact: Contact, cs: ContactState): boolean {
  if (!cs.lastContactDate) return true
  const daysSince = (Date.now() - new Date(cs.lastContactDate).getTime()) / 86400000
  if (daysSince > 90) return true
  if (contact.tier === 'close' && contact.intervalDays && daysSince > contact.intervalDays) return true
  return false
}

// ─── Crew member card ─────────────────────────────────────────────────────────

function CrewMember({
  contact,
  cs,
  onClick,
}: {
  contact: Contact
  cs: ContactState | undefined
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  const fading = cs ? isMemberFading(contact, cs) : true
  const heroSrc = cs?.story?.heroPhotoPath ? `loop-file://${cs.story.heroPhotoPath}` : undefined

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '12px 8px',
        borderRadius: 'var(--radius-md)',
        background: hov ? 'var(--surface)' : 'transparent',
        transition: 'background var(--duration-fast) var(--ease-out)',
        outline: 'none',
      }}
    >
      <ContactTierIndicator
        tier={contact.tier}
        name={contact.name}
        fading={fading}
        src={heroSrc}
      />
    </div>
  )
}

// ─── Film strip empty state ───────────────────────────────────────────────────

function FilmStripEmpty() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 120,
      background: 'var(--surface)',
      borderRadius: 'var(--radius-md)',
      gap: 10,
      color: 'var(--text-muted)',
    }}>
      <Camera size={20} strokeWidth={1.3} style={{ opacity: 0.4 }} />
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--text-muted)',
      }}>
        Moments from this chapter will appear here.
      </span>
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function ChapterDetailScreen({ chapterId, onBack, onOpenStory }: ChapterDetailScreenProps) {
  const [data, setData] = useState<ChapterData>({ chapter: null, contacts: [], appState: null })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [state, contacts] = await Promise.all([
          window.loop.state.get() as Promise<AppState>,
          window.loop.contacts.list(),
        ])
        const chapter = state.chapters.find((ch) => ch.id === chapterId) ?? null
        const chapterContacts = contacts.filter((c) => c.chapterIds.includes(chapterId))
        setData({ chapter, contacts: chapterContacts, appState: state })
      } catch { /* pass */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [chapterId])

  const { chapter, contacts, appState } = data
  const coverSrc = chapter?.coverPhotoPath ? `loop-file://${chapter.coverPhotoPath}` : undefined

  const yearRange =
    chapter?.startYear && chapter.endYear
      ? `${chapter.startYear} – ${chapter.endYear}`
      : chapter?.startYear
        ? `${chapter.startYear} – now`
        : chapter?.active
          ? 'Ongoing'
          : ''

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 17 }}>
          Loading…
        </div>
      </div>
    )
  }

  if (!chapter) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text-secondary)' }}>Chapter not found.</div>
        <IconButton icon={<ArrowLeft size={18} strokeWidth={1.8} />} label="Back" onClick={onBack} />
      </div>
    )
  }

  const fadingContacts = contacts.filter((c) => {
    const cs = appState?.contacts[c.id]
    return cs ? isMemberFading(c, cs) : true
  })

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <ConnectionStatusBadge />

      {/* Full-bleed cover */}
      <div style={{ position: 'relative', height: 260, flexShrink: 0 }}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={chapter.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, var(--accent-faint) 0%, var(--surface) 100%)',
          }} />
        )}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(42,31,27,0.60) 0%, rgba(42,31,27,0.08) 60%, transparent 100%)',
        }} />

        {/* Back */}
        <div style={{ position: 'absolute', top: 20, left: 24 }}>
          <IconButton
            variant="soft"
            label="Back"
            onClick={onBack}
            icon={<ArrowLeft size={18} strokeWidth={1.8} />}
            style={{ background: 'rgba(249,245,238,0.88)', backdropFilter: 'blur(8px)' }}
          />
        </div>

        {/* Change cover photo */}
        <div style={{ position: 'absolute', top: 20, right: 24 }}>
          <IconButton
            variant="soft"
            label="Change cover photo"
            icon={<Camera size={16} strokeWidth={1.8} />}
            style={{ background: 'rgba(249,245,238,0.88)', backdropFilter: 'blur(8px)' }}
            onClick={async () => {
              try {
                // @ts-ignore
                const path: string | null = await window.loop.photos?.pickChapter?.()
                if (path && appState) {
                  const updated = appState.chapters.map((ch) =>
                    ch.id === chapterId ? { ...ch, coverPhotoPath: path } : ch
                  )
                  await window.loop.state.patch({ chapters: updated })
                }
              } catch { /* ignore */ }
            }}
          />
        </div>

        {/* Chapter title */}
        <div style={{ position: 'absolute', left: 40, right: 40, bottom: 28 }}>
          {yearRange && (
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'rgba(249,245,238,0.75)',
              marginBottom: 6,
            }}>
              {yearRange}
            </div>
          )}
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 34,
            fontWeight: 600,
            color: '#FBF7F0',
            letterSpacing: '-0.02em',
            textShadow: '0 1px 12px rgba(42,31,27,0.4)',
          }}>
            {chapter.name}
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'rgba(249,245,238,0.65)',
            marginTop: 4,
          }}>
            {contacts.length} {contacts.length === 1 ? 'person' : 'people'}
            {fadingContacts.length > 0 ? ` · ${fadingContacts.length} fading` : ''}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 40px 72px' }}>

        {/* Name this chapter prompt (shown for inference-created chapters) */}
        {chapter.confirmed === false && !editing && (
          <div style={{
            background: 'var(--accent-faint)',
            border: '1px solid rgba(184,98,74,0.18)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--accent)', lineHeight: 1.4 }}>
                Give this chapter a name that feels like yours.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditValue(chapter.name)
                setEditing(true)
              }}
              style={{
                flexShrink: 0,
                background: 'var(--accent)',
                color: '#F9F5EE',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 16px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Name it
            </button>
          </div>
        )}

        {/* Inline edit UI */}
        {editing && (
          <div style={{
            marginBottom: 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            padding: '24px',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
          }}>
            <input
              type="text"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editValue.trim() && appState) {
                  const newName = editValue.trim()
                  window.loop.chapters.setName(chapter.id, newName).then(() => {
                    const updated = appState.chapters.map((ch) =>
                      ch.id === chapter.id ? { ...ch, name: newName, confirmed: true } : ch
                    )
                    setData((d) => ({
                      ...d,
                      chapter: { ...chapter, name: newName, confirmed: true },
                      appState: d.appState ? { ...d.appState, chapters: updated } : d.appState,
                    }))
                    setEditing(false)
                  }).catch(() => {})
                } else if (e.key === 'Escape') {
                  setEditing(false)
                }
              }}
              style={{
                width: '100%',
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                fontWeight: 600,
                textAlign: 'center',
                color: 'var(--text-primary)',
                background: 'transparent',
                border: 'none',
                borderBottom: '2px solid var(--accent)',
                padding: '8px 0',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={async () => {
                  if (!editValue.trim() || !appState) return
                  const newName = editValue.trim()
                  try {
                    await window.loop.chapters.setName(chapter.id, newName)
                    const updated = appState.chapters.map((ch) =>
                      ch.id === chapter.id ? { ...ch, name: newName, confirmed: true } : ch
                    )
                    setData((d) => ({
                      ...d,
                      chapter: { ...chapter, name: newName, confirmed: true },
                      appState: d.appState ? { ...d.appState, chapters: updated } : d.appState,
                    }))
                    setEditing(false)
                  } catch { /* pass */ }
                }}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#F9F5EE',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '10px 20px',
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)',
                  padding: '10px 20px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Crew grid */}
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          fontWeight: 600,
          marginBottom: 16,
        }}>
          Crew
        </div>

        {contacts.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
            gap: 4,
            marginBottom: 48,
          }}>
            {contacts.map((contact) => (
              <CrewMember
                key={contact.id}
                contact={contact}
                cs={appState?.contacts[contact.id]}
                onClick={() => onOpenStory(contact.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '32px 24px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            marginBottom: 48,
          }}>
            No people in this chapter yet.
          </div>
        )}

        {/* Moments film strip */}
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          fontWeight: 600,
          marginBottom: 16,
        }}>
          Moments
        </div>
        <FilmStripEmpty />
      </div>
    </div>
  )
}
