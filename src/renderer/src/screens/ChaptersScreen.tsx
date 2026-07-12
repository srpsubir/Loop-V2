import React, { useState, useEffect, useCallback } from 'react'
import type { Chapter, Contact } from '@shared/types'

const SERIF = '"Lora", Georgia, "Times New Roman", serif'
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'

// Mirrors YourLoopsScreen's chapter-card gradient picker (MAV-197) — kept in
// sync manually since it's a tiny pure function; not worth cross-importing.
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

function crewLabel(count: number): string {
  if (count === 0) return 'No crew yet'
  if (count === 1) return '1 person'
  return `${count} people`
}

interface ChaptersScreenProps {
  onOpenChapter: (chapterId: string) => void
}

export function ChaptersScreen({ onOpenChapter }: ChaptersScreenProps) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [s, cs] = await Promise.all([
        window.loop.state.get(),
        window.loop.contacts.list(),
      ])
      setChapters(s.chapters ?? [])
      setContacts(cs)
    } catch { /* handlers not yet wired */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const unsub = window.loop?.state?.onChange?.(() => load())
    return () => unsub?.()
  }, [load])

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ padding: '32px 44px', maxWidth: 900 }}>
        <h1 style={{
          fontFamily: SERIF,
          fontSize: 22,
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: '0 0 20px 0',
        }}>
          Your Chapters
        </h1>

        {chapters.length === 0 ? (
          <div style={{
            fontFamily: SANS,
            fontSize: 14,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            paddingTop: 8,
          }}>
            No chapters yet. Connect WhatsApp to discover your loops.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {chapters.map((chapter) => {
              const crewCount = contacts.filter((c) => c.chapterIds?.includes(chapter.id)).length
              return (
                <div
                  key={chapter.id}
                  onClick={() => onOpenChapter(chapter.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onOpenChapter(chapter.id)}
                  style={{
                    width: 200,
                    height: 220,
                    borderRadius: 'var(--radius-lg)',
                    background: gradientFor(chapter.name),
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-on-accent)',
                    fontFamily: SANS,
                    fontWeight: 600,
                    fontSize: 13,
                    marginBottom: 10,
                    userSelect: 'none',
                  }}>
                    {chapter.name.trim()[0]?.toUpperCase()}
                  </div>
                  <div style={{
                    fontFamily: SANS,
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--text-on-accent)',
                  }}>
                    {chapter.name}
                  </div>
                  <div style={{
                    fontFamily: SANS,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.75)',
                    marginTop: 2,
                  }}>
                    {crewLabel(crewCount)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
