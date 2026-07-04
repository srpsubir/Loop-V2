import React, { useState, useEffect, useMemo } from 'react'
import { Search, Check, ChevronDown } from 'lucide-react'
import type { Contact, Chapter, AppState, ContactState } from '@shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StayCloseScreenProps {
  onDone: () => void
}

type Step = 'intent' | 'picker' | 'confirm'

// ─── Avatar ───────────────────────────────────────────────────────────────────

const TINTS = ['#C49A8A', '#D4856E', '#6A9470', '#B8624A', '#A38F85']
function tintFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

function ContactAvatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: tintFor(name),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'var(--font-serif)',
        fontSize: size * 0.38,
        fontWeight: 600,
        color: '#F9F5EE',
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {name[0]?.toUpperCase()}
      </span>
    </div>
  )
}

// ─── Step 1: Intent ───────────────────────────────────────────────────────────

function IntentStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      background: 'var(--bg)',
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 36,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          marginBottom: 16,
        }}>
          Who do you want to stay close to?
        </h1>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 36,
          maxWidth: 380,
          margin: '0 auto 36px',
        }}>
          Pick a few people you care about.
          Loop will gently remind you if it has been a while.
        </p>
        <button
          onClick={onContinue}
          style={{
            background: 'var(--accent)',
            color: '#F9F5EE',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            padding: '12px 28px',
            cursor: 'pointer',
          }}
        >
          Choose people
        </button>
      </div>
    </div>
  )
}

// ─── Strength badge ───────────────────────────────────────────────────────────

function StrengthBadge({ strength }: { strength?: 'high' | 'medium' | 'low' }) {
  if (strength === 'high') {
    return (
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500,
        color: '#fff', background: '#C4613C',
        borderRadius: 100, padding: '2px 7px', flexShrink: 0,
      }}>Strong</span>
    )
  }
  if (strength === 'medium') {
    return (
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500,
        color: '#C4613C', background: 'transparent',
        border: '1px solid #C4613C',
        borderRadius: 100, padding: '2px 7px', flexShrink: 0,
      }}>Moderate</span>
    )
  }
  return (
    <span style={{
      fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500,
      color: '#9B8B82', background: 'transparent',
      border: '1px solid #9B8B82',
      borderRadius: 100, padding: '2px 7px', flexShrink: 0,
    }}>Light</span>
  )
}

// ─── Step 2: Picker ───────────────────────────────────────────────────────────

type SortMode = 'strength' | 'name' | 'recency'

function PickerStep({
  contacts,
  chapters,
  contactStates,
  onDone,
  onBack,
}: {
  contacts: Contact[]
  chapters: Chapter[]
  contactStates: Record<string, ContactState>
  onDone: (ids: string[]) => void
  onBack: () => void
}) {
  const [sortMode, setSortMode] = useState<SortMode>('strength')
  const [query, setQuery] = useState('')

  const sortedContacts = useMemo(() => {
    const cs = [...contacts]
    if (sortMode === 'strength') {
      cs.sort((a, b) => (contactStates[b.id]?.relationshipStrength ?? 0) - (contactStates[a.id]?.relationshipStrength ?? 0))
    } else if (sortMode === 'name') {
      cs.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      cs.sort((a, b) => {
        const ta = contactStates[a.id]?.lastContactDate ? new Date(contactStates[a.id].lastContactDate!).getTime() : 0
        const tb = contactStates[b.id]?.lastContactDate ? new Date(contactStates[b.id].lastContactDate!).getTime() : 0
        return tb - ta
      })
    }
    return cs
  }, [contacts, contactStates, sortMode])

  const suggestedIds = useMemo(() => {
    return new Set(
      [...contacts]
        .sort((a, b) => (contactStates[b.id]?.relationshipStrength ?? 0) - (contactStates[a.id]?.relationshipStrength ?? 0))
        .slice(0, 5)
        .map((c) => c.id)
    )
  }, [contacts, contactStates])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(suggestedIds)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return sortedContacts
    return sortedContacts.filter((c) => c.name.toLowerCase().includes(q))
  }, [sortedContacts, query])

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const count = selectedIds.size
  const showDivider = !query && sortMode === 'strength'

  let passedDivider = false

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 4px 24px rgba(42,31,27,0.10)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 640,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
              Stay Close
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 11, color: '#C4613C',
                  background: 'transparent', border: 'none', outline: 'none',
                  cursor: 'pointer', appearance: 'none', paddingRight: 14,
                }}
              >
                <option value="strength">Relationship strength</option>
                <option value="recency">Recency</option>
                <option value="name">Name</option>
              </select>
              <ChevronDown size={11} strokeWidth={2} color="#C4613C" style={{ marginLeft: -12, pointerEvents: 'none' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>
            People you message most
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg)', borderRadius: 'var(--radius-md)',
            padding: '8px 12px', border: '1px solid var(--border-light)',
          }}>
            <Search size={14} strokeWidth={1.8} color="var(--text-muted)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
              No contacts found.
            </div>
          ) : (
            filtered.map((contact) => {
              const isSelected = selectedIds.has(contact.id)
              const isSuggested = suggestedIds.has(contact.id)
              const cs = contactStates[contact.id]
              const strength = cs?.messageStrength

              let showDividerBefore = false
              if (showDivider && !isSuggested && !passedDivider) {
                showDividerBefore = true
                passedDivider = true
              }

              return (
                <React.Fragment key={contact.id}>
                  {showDividerBefore && (
                    <div style={{
                      padding: '8px 20px 4px',
                      fontFamily: 'var(--font-sans)', fontSize: 10,
                      fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-light)',
                    }}>
                      Also suggested
                    </div>
                  )}
                  <button
                    onClick={() => toggle(contact.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 20px',
                      paddingLeft: isSelected ? 17 : 20,
                      borderLeft: isSelected ? '3px solid #C4613C' : '3px solid transparent',
                      background: isSelected ? 'rgba(196,97,60,0.04)' : 'transparent',
                      border: 'none',
                      borderLeftWidth: 3,
                      borderLeftStyle: 'solid',
                      borderLeftColor: isSelected ? '#C4613C' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 120ms',
                    }}
                  >
                    <ContactAvatar name={contact.name} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                          color: 'var(--text-primary)', lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {contact.name}
                        </div>
                        <StrengthBadge strength={strength} />
                      </div>
                      {cs?.lastContactDate && (
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatRelative(cs.lastContactDate)}
                        </div>
                      )}
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: isSelected ? 'var(--accent)' : 'var(--bg)',
                      border: isSelected ? 'none' : '1.5px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background 120ms, border 120ms',
                    }}>
                      {isSelected && <Check size={12} strokeWidth={2.5} color="#F9F5EE" />}
                    </div>
                  </button>
                </React.Fragment>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10 }}>
            You can always add more from their world.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={onBack} style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
              Back
            </button>
            <button
              onClick={() => count > 0 && onDone(Array.from(selectedIds))}
              disabled={count === 0}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                color: '#fff',
                background: count > 0 ? '#C4613C' : 'var(--text-muted)',
                border: 'none', borderRadius: 6,
                padding: '8px 18px', cursor: count > 0 ? 'pointer' : 'default',
              }}
            >
              Save {count > 0 ? `${count} close ` : ''}contacts
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (days < 30) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'month' : 'months'} ago`
}

// ─── Step 3: Confirmation ─────────────────────────────────────────────────────

function ConfirmStep({
  selected,
  onConfirm,
  onBack,
}: {
  selected: Contact[]
  onConfirm: () => void
  onBack: () => void
}) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      background: 'var(--bg)',
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 34,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          marginBottom: 14,
        }}>
          You've chosen {selected.length} {selected.length === 1 ? 'person' : 'people'}.
        </h1>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 36,
        }}>
          Loop will check in if it has been a while since you last spoke.
          No pressure. Just a gentle nudge.
        </p>

        {/* Selected avatars */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: 16,
          marginBottom: 40,
          flexWrap: 'wrap',
        }}>
          {selected.map((c) => (
            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ContactAvatar name={c.name} size={56} />
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--text-primary)',
                fontWeight: 500,
                maxWidth: 72,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {c.name.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              fontWeight: 500,
              padding: '12px 24px',
              cursor: 'pointer',
            }}
          >
            Change
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: 'var(--accent)',
              color: '#F9F5EE',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              fontWeight: 600,
              padding: '12px 28px',
              cursor: 'pointer',
            }}
          >
            Let's go
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function StayCloseScreen({ onDone }: StayCloseScreenProps) {
  const [step, setStep] = useState<Step>('intent')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [contactStates, setContactStates] = useState<Record<string, ContactState>>({})
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [cs, state] = await Promise.all([
          window.loop.contacts.list(),
          window.loop.state.get() as Promise<AppState>,
        ])
        setContacts(cs)
        setChapters(state.chapters)
        setContactStates(state.contacts)
      } catch { /* pass */ }
    }
    load()
  }, [])

  const handlePickerDone = (ids: string[]) => {
    const selected = contacts.filter((c) => ids.includes(c.id))
    setSelectedContacts(selected)
    setStep('confirm')
  }

  const handleConfirm = async () => {
    if (saving) return
    setSaving(true)
    try {
      await Promise.all(
        selectedContacts.map((c) =>
          window.loop.contacts.save({ ...c, tier: 'close', intervalDays: 30 })
        )
      )
      await window.loop.state.patch({ stayCloseComplete: true } as never)
    } catch { /* non-critical */ } finally {
      setSaving(false)
    }
    onDone()
  }

  if (step === 'intent') {
    return <IntentStep onContinue={() => setStep('picker')} />
  }

  if (step === 'picker') {
    return (
      <PickerStep
        contacts={contacts}
        chapters={chapters}
        contactStates={contactStates}
        onDone={handlePickerDone}
        onBack={() => setStep('intent')}
      />
    )
  }

  return (
    <ConfirmStep
      selected={selectedContacts}
      onConfirm={handleConfirm}
      onBack={() => setStep('picker')}
    />
  )
}
