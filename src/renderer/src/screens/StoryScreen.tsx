import React, { useState, useEffect } from 'react'
import { ArrowLeft, Send, Camera } from 'lucide-react'
import { Avatar, Button, IconButton, Tag } from '../components'
import type { Contact, Story, AppState, Chapter } from '@shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoryScreenProps {
  contactId: string
  onBack: () => void
}

interface StoryData {
  contact: Contact | null
  brief: Story | null
  chapters: Chapter[]
  lastContactDate: string | null
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({
  dot,
  label,
  text,
  serif,
  last,
}: {
  dot: 'accent' | 'rose'
  label: string
  text: string
  serif?: boolean
  last?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 14 }}>
        <span style={{
          width: 11,
          height: 11,
          borderRadius: '50%',
          background: dot === 'accent' ? 'var(--accent)' : 'var(--people)',
          boxShadow: '0 0 0 4px var(--bg)',
          marginTop: 4,
          flexShrink: 0,
        }} />
        {!last && <span style={{ width: 2, flex: 1, background: 'var(--border-light)', marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: 28, flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 6,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: serif ? 'var(--font-serif)' : 'var(--font-sans)',
          fontSize: serif ? 16 : 14,
          fontStyle: serif ? 'italic' : 'normal',
          color: serif ? 'var(--text-muted)' : 'var(--text-secondary)',
          lineHeight: 1.65,
        }}>
          {text}
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function StoryScreen({ contactId, onBack }: StoryScreenProps) {
  const [data, setData] = useState<StoryData>({
    contact: null,
    brief: null,
    chapters: [],
    lastContactDate: null,
  })
  const [loading, setLoading] = useState(true)
  const [tier, setTier] = useState<'close' | 'warm'>('warm')

  useEffect(() => {
    async function load() {
      try {
        const [brief, contacts, state] = await Promise.all([
          window.loop.story.open(contactId),
          window.loop.contacts.list(),
          window.loop.state.get() as Promise<AppState>,
        ])
        const contact = contacts.find((c) => c.id === contactId) ?? null
        if (contact) setTier(contact.tier)
        const cs = state.contacts[contactId]
        const chapters = contact
          ? state.chapters.filter((ch) => contact.chapterIds.includes(ch.id))
          : []
        setData({
          contact,
          brief,
          chapters,
          lastContactDate: cs?.lastContactDate ?? null,
        })

        // Mark story as opened for reconnection detection (MAV-83)
        if (cs !== undefined) {
          await window.loop.state.patch({
            contacts: {
              ...state.contacts,
              [contactId]: { ...cs, storyOpenedAt: new Date().toISOString() },
            },
          })
        }
      } catch { /* pass */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [contactId])

  const { contact, brief, chapters, lastContactDate } = data
  const heroSrc = brief?.heroPhotoPath ? `loop-file://${brief.heroPhotoPath}` : undefined

  function formatLastContact(iso: string | null): string {
    if (!iso) return 'No history yet'
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
      // @ts-ignore — photos:pickHero not in typed bridge
      const path: string | null = await window.loop.photos?.pickHero?.()
      if (path && brief && contact) {
        const state = await window.loop.state.get()
        const cs = state.contacts[contactId]
        if (cs && cs.story) {
          await window.loop.state.patch({
            contacts: {
              ...state.contacts,
              [contactId]: { ...cs, story: { ...cs.story, heroPhotoPath: path } },
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
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 52px 80px' }}>

        {/* Top bar — back + ghost CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <IconButton
            variant="ghost"
            label="Back"
            icon={<ArrowLeft size={18} strokeWidth={1.8} />}
            onClick={onBack}
          />
          {contact.whatsappId && (
            <Button
              variant="ghost"
              data-testid="open-whatsapp-cta"
              iconLeft={<Send size={13} strokeWidth={1.8} />}
              onClick={async () => {
                if (!contact.whatsappId) return
                try {
                  const state = await window.loop.state.get() as AppState
                  const cs = state.contacts[contactId]
                  if (cs) {
                    const newCount = (cs.reachOutCount ?? 0) + 1
                    await window.loop.state.patch({
                      contacts: {
                        ...state.contacts,
                        [contactId]: {
                          ...cs,
                          lastReachOutAt: new Date().toISOString(),
                          reachOutCount: newCount,
                          suppressNudge: newCount >= 2,
                        },
                      },
                    })
                  }
                } catch { /* non-critical */ }
                window.loop.shell.openWhatsApp(contact.whatsappId)
              }}
            >
              Open WhatsApp
            </Button>
          )}
        </div>

        {/* Hero section */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 28 }}>
          {/* Avatar with photo-pick overlay */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar name={contact.name} src={heroSrc} size={88} />
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
            {/* Name — 38px Lora 600, no tier badge */}
            <div
              data-testid="story-contact-name"
              style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 38,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              {contact.name}
            </div>

            {/* Last spoke */}
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-muted)',
              marginTop: 6,
            }}>
              Last spoke: {formatLastContact(lastContactDate)}
            </div>

            {/* Chapter tags — quiet context, never classification */}
            {chapters.length > 0 && (
              <>
                {chapters.length > 1 && (
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginTop: 10,
                    marginBottom: 6,
                  }}>
                    Across {chapters.length} chapters
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: chapters.length === 1 ? 10 : 0, flexWrap: 'wrap' }}>
                  {chapters.map((ch) => (
                    <Tag key={ch.id} tone="chapter">{ch.name}</Tag>
                  ))}
                </div>
              </>
            )}

            {/* Stay Close tier pill — A4 */}
            <div style={{ marginTop: 12 }}>
              {tier === 'warm' ? (
                <button
                  onClick={async () => {
                    if (!contact) return
                    await window.loop.contacts.save({ ...contact, tier: 'close', intervalDays: 30 })
                    setTier('close')
                  }}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#C4613C',
                    background: 'transparent',
                    border: '1px solid #C4613C',
                    borderRadius: 100,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    letterSpacing: '.02em',
                  }}
                >
                  Stay Close
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#fff',
                    background: '#C4613C',
                    borderRadius: 100,
                    padding: '4px 10px',
                  }}>
                    Close ✓
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#9B8B82' }}>
                    Staying close to {contact?.name.split(' ')[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Story content */}
        {brief ? (
          <>
            {/* Reason to reach out — warm observation, not a warning */}
            {brief.reasonToReachOut && (
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 15,
                color: 'var(--accent)',
                background: 'var(--accent-faint)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                marginBottom: 36,
                lineHeight: 1.6,
              }}>
                {brief.reasonToReachOut}
              </div>
            )}

            {/* Your story together */}
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginBottom: 24,
            }}>
              Your story together
            </div>

            <div>
              {brief.contextLines.map((line, i) => (
                <TimelineItem
                  key={i}
                  dot={i === 0 ? 'accent' : 'rose'}
                  label={i === 0 ? 'Recently' : 'Earlier'}
                  text={line}
                  serif={i === brief.contextLines.length - 1}
                  last={i === brief.contextLines.length - 1}
                />
              ))}
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            fontStyle: 'italic',
          }}>
            Still coming together.
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontStyle: 'normal', marginTop: 8 }}>
              Let Loop read your conversations.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
