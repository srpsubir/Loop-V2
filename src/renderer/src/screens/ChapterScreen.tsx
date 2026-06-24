import React, { useState, useEffect } from 'react'
import { ArrowLeft, Camera } from 'lucide-react'
import { IconButton, PaperCard, PersonRow, Tag, SegmentedControl } from '../components'
import type { Chapter, Contact, AppState } from '@shared/types'

interface ChapterScreenProps {
  chapterId: string
  onBack: () => void
  onOpenStory: (contactId: string) => void
}

interface ChapterData {
  chapter: Chapter | null
  contacts: Contact[]
}

export function ChapterScreen({ chapterId, onBack, onOpenStory }: ChapterScreenProps) {
  const [data, setData] = useState<ChapterData>({ chapter: null, contacts: [] })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('People')
  const [appState, setAppState] = useState<AppState | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [state, contacts] = await Promise.all([
          window.loop.state.get() as Promise<AppState>,
          window.loop.contacts.list(),
        ])
        setAppState(state)
        const chapter = state.chapters.find((ch) => ch.id === chapterId) ?? null
        const chapterContacts = contacts.filter((c) => c.chapterIds.includes(chapterId))
        setData({ chapter, contacts: chapterContacts })
      } catch { /* pass */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [chapterId])

  const { chapter, contacts } = data
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
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text-secondary)' }}>
          Chapter not found.
        </div>
        <IconButton icon={<ArrowLeft size={18} strokeWidth={1.8} />} label="Back" onClick={onBack} />
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      {/* Cover header */}
      <div style={{ position: 'relative', height: 240, flexShrink: 0 }}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={chapter.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, var(--accent-faint) 0%, var(--surface) 100%)',
            }}
          />
        )}
        {/* Dark overlay for text legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(42,31,27,0.55) 0%, rgba(42,31,27,0.1) 60%, transparent 100%)',
          }}
        />
        {/* Back button */}
        <div style={{ position: 'absolute', top: 20, left: 24 }}>
          <IconButton
            variant="soft"
            label="Back"
            onClick={onBack}
            icon={<ArrowLeft size={18} strokeWidth={1.8} />}
            style={{ background: 'rgba(249,245,238,0.85)', backdropFilter: 'blur(8px)' }}
          />
        </div>
        {/* Pick cover photo */}
        <div style={{ position: 'absolute', top: 20, right: 24 }}>
          <IconButton
            variant="soft"
            label="Change cover photo"
            icon={<Camera size={16} strokeWidth={1.8} />}
            style={{ background: 'rgba(249,245,238,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={async () => {
              try {
                // @ts-ignore
                const path: string | null = await window.loop.photos?.pickChapter?.()
                if (path) {
                  const state = appState!
                  const updated = state.chapters.map((ch) =>
                    ch.id === chapterId ? { ...ch, coverPhotoPath: path } : ch
                  )
                  await window.loop.state.patch({ chapters: updated })
                }
              } catch { /* ignore */ }
            }}
          />
        </div>
        {/* Title */}
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 28 }}>
          {yearRange && (
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: 'rgba(249,245,238,0.8)',
                marginBottom: 4,
              }}
            >
              {yearRange}
            </div>
          )}
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 36,
              fontWeight: 600,
              color: '#FBF7F0',
              letterSpacing: '-0.02em',
              textShadow: '0 1px 12px rgba(42,31,27,0.4)',
            }}
          >
            {chapter.name}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 56px 72px' }}>
        {chapter.location && (
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 17,
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              marginBottom: 28,
            }}
          >
            {chapter.location}
            {chapter.active ? ' · Ongoing' : ''}
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <SegmentedControl
            options={['People', 'Moments']}
            value={view}
            onChange={setView}
          />
        </div>

        {view === 'People' ? (
          contacts.length > 0 ? (
            <PaperCard padding={8}>
              {contacts.map((contact, i) => {
                const cs = appState?.contacts[contact.id]
                const meta = cs?.lastContactDate
                  ? `Last spoke ${formatRelativeDate(cs.lastContactDate)}`
                  : undefined
                return (
                  <div key={contact.id}>
                    <PersonRow
                      name={contact.name}
                      meta={meta}
                      ring={contact.tier === 'close' ? 'sage' : 'none'}
                      onClick={() => onOpenStory(contact.id)}
                      trailing={
                        contact.tier === 'close' ? (
                          <Tag tone="positive">Close</Tag>
                        ) : undefined
                      }
                    />
                    {i < contacts.length - 1 && (
                      <div style={{ height: 1, background: 'var(--border-light)', margin: '0 12px' }} />
                    )}
                  </div>
                )
              })}
            </PaperCard>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
              }}
            >
              No people in this chapter yet. Add contacts and assign them here.
            </div>
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <Camera size={28} strokeWidth={1.3} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}>
              Moments from this chapter will gather here as you add them.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatRelativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (days < 30) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  const months = Math.floor(days / 30)
  if (days < 365) return `${months} ${months === 1 ? 'month' : 'months'} ago`
  const years = Math.floor(days / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}
