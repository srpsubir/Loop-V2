import React, { useState, useEffect, useCallback } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Contact, AppState } from '@shared/types'

const SERIF = '"Lora", Georgia, "Times New Roman", serif'
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'

interface PeopleScreenProps {
  onNavigate: (screen: string, params?: unknown) => void
}

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function lastSpokeLabel(days: number | null): string {
  if (days === null) return 'Not yet spoken'
  if (days === 0) return 'Spoke today'
  if (days === 1) return 'Last spoke yesterday'
  if (days < 7) return `Last spoke ${days} days ago`
  if (days < 14) return 'Last spoke last week'
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `Last spoke ${weeks} week${weeks === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  return `Last spoke ${months} month${months === 1 ? '' : 's'} ago`
}

export function PeopleScreen({ onNavigate }: PeopleScreenProps) {
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

  const closeContacts = contacts
    .filter((c) => c.tier === 'close')
    .sort((a, b) => {
      const dA = daysSince(state?.contacts[a.id]?.lastContactDate) ?? 0
      const dB = daysSince(state?.contacts[b.id]?.lastContactDate) ?? 0
      return dB - dA
    })

  const warmContacts = contacts
    .filter((c) => c.tier === 'warm')
    .sort((a, b) => {
      const dA = daysSince(state?.contacts[a.id]?.lastContactDate) ?? 0
      const dB = daysSince(state?.contacts[b.id]?.lastContactDate) ?? 0
      return dB - dA
    })

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ padding: '32px 44px', maxWidth: 680 }}>
        <h1 style={{
          fontFamily: SERIF,
          fontSize: 22,
          fontWeight: 400,
          color: '#1A100C',
          margin: '0 0 20px 0',
        }}>
          Your People
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {closeContacts.map((contact) => {
            const cs = state?.contacts[contact.id]
            const days = daysSince(cs?.lastContactDate)
            const storyPreview = cs?.story?.reasonToReachOut ?? cs?.nextOccasion?.label ?? null

            return (
              <div
                key={contact.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  padding: '14px 18px',
                  boxShadow: '0 1px 4px rgba(26,16,12,0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#B8624A',
                  border: '2px solid #B8624A',
                  outline: '2px solid #B8624A',
                  outlineOffset: 2,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: 16,
                  userSelect: 'none',
                }}>
                  {contact.name.trim()[0]?.toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: SERIF,
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1A100C',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {contact.name}
                  </div>
                  <div style={{
                    fontFamily: SANS,
                    fontSize: 12,
                    color: '#7A6056',
                    marginTop: 2,
                  }}>
                    {lastSpokeLabel(days)}
                  </div>
                  {storyPreview && (
                    <div style={{
                      fontFamily: SANS,
                      fontSize: 13,
                      fontStyle: 'italic',
                      color: '#B8624A',
                      marginTop: 3,
                    }}>
                      {storyPreview}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('story', { contactId: contact.id, chapterId: contact.chapterIds[0] ?? '' })}
                  style={{
                    background: '#B8624A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 999,
                    padding: '7px 14px',
                    fontFamily: SANS,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    WebkitAppRegion: 'no-drag',
                  } as React.CSSProperties}
                >
                  Their world
                </button>
              </div>
            )
          })}

          {closeContacts.length > 0 && warmContacts.length > 0 && (
            <div style={{ height: 8 }} />
          )}

          {warmContacts.map((contact) => {
            const cs = state?.contacts[contact.id]
            const days = daysSince(cs?.lastContactDate)

            return (
              <div
                key={contact.id}
                onClick={() => onNavigate('story', { contactId: contact.id, chapterId: contact.chapterIds[0] ?? '' })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigate('story', { contactId: contact.id, chapterId: contact.chapterIds[0] ?? '' })}
                style={{
                  background: '#EDD9D2',
                  borderRadius: 12,
                  padding: '12px 16px',
                  boxShadow: '0 1px 3px rgba(26,16,12,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: '#EDD9D2',
                  border: '1.5px solid rgba(26,16,12,0.10)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6B5447',
                  fontFamily: SANS,
                  fontWeight: 500,
                  fontSize: 13,
                  userSelect: 'none',
                }}>
                  {contact.name.trim()[0]?.toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: SERIF,
                    fontSize: 14,
                    fontWeight: 400,
                    color: '#1A100C',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {contact.name}
                  </div>
                  <div style={{
                    fontFamily: SANS,
                    fontSize: 12,
                    color: '#7A6056',
                    marginTop: 1,
                  }}>
                    {lastSpokeLabel(days)}
                  </div>
                </div>

                <ChevronRight size={15} strokeWidth={2} color="#7A6056" style={{ flexShrink: 0 }} />
              </div>
            )
          })}

          {contacts.length === 0 && (
            <div style={{
              fontFamily: SANS,
              fontSize: 14,
              color: '#7A6056',
              fontStyle: 'italic',
              paddingTop: 8,
            }}>
              No people added yet. Mark someone as Close or Warm from their Story.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
