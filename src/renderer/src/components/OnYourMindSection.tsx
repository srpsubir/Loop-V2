import React, { useState, useEffect } from 'react'
import type { Contact, AppState } from '@shared/types'

const SERIF = 'var(--font-serif)'
const SANS = 'var(--font-sans)'

interface OnYourMindSectionProps {
  contacts: Contact[]
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

export function OnYourMindSection({ contacts, onNavigate }: OnYourMindSectionProps) {
  const [appState, setAppState] = useState<AppState | null>(null)

  useEffect(() => {
    window.loop?.state?.get?.().then(setAppState).catch(() => {})
    const unsub = window.loop?.state?.onChange?.(() => {
      window.loop?.state?.get?.().then(setAppState).catch(() => {})
    })
    return () => unsub?.()
  }, [])

  if (contacts.length === 0) return null

  const displayed = contacts.slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {displayed.map((contact) => {
        const cs = appState?.contacts[contact.id]
        const days = daysSince(cs?.lastContactDate)
        const reasonToReachOut = cs?.story?.reasonToReachOut ?? cs?.nextOccasion?.label ?? null

        return (
          <div
            key={contact.id}
            style={{
              background: 'var(--surface-raised)',
              borderRadius: 12,
              padding: '14px 18px',
              boxShadow: '0 1px 4px rgba(26,16,12,0.07)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'var(--text-on-accent)',
                fontFamily: SANS,
                fontWeight: 600,
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                userSelect: 'none',
              }}
            >
              {contact.name.trim()[0]?.toUpperCase() ?? '?'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: SERIF,
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
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
                color: 'var(--text-muted)',
                marginTop: 2,
              }}>
                {lastSpokeLabel(days)}
              </div>
              {reasonToReachOut && (
                <div style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: 'var(--accent)',
                  marginTop: 3,
                }}>
                  {reasonToReachOut}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => onNavigate('story', { contactId: contact.id, chapterId: contact.chapterIds[0] ?? '' })}
                style={{
                  background: 'none',
                  color: 'var(--accent)',
                  border: '1.5px solid var(--accent)',
                  borderRadius: 999,
                  padding: '6px 13px',
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  WebkitAppRegion: 'no-drag',
                } as React.CSSProperties}
              >
                Their world
              </button>
              {contact.whatsappId && (
                <button
                  type="button"
                  onClick={() => window.loop.shell.openWhatsApp(contact.whatsappId!, contact.id).catch(() => {})}
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--text-on-accent)',
                    border: 'none',
                    borderRadius: 999,
                    padding: '6px 13px',
                    fontFamily: SANS,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    WebkitAppRegion: 'no-drag',
                  } as React.CSSProperties}
                >
                  Message
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
