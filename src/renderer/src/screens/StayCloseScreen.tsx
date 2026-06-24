import React, { useState, useEffect, useMemo } from 'react'
import { Search, Check } from 'lucide-react'
import type { Contact, Chapter } from '@shared/types'

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

// ─── Step 2: Picker ───────────────────────────────────────────────────────────

function PickerStep({
  contacts,
  chapters,
  onDone,
  onBack,
}: {
  contacts: Contact[]
  chapters: Chapter[]
  onDone: (ids: string[]) => void
  onBack: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  const chapterMap = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const ch of chapters) m[ch.id] = [ch.name]
    return m
  }, [chapters])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return contacts
    return contacts.filter((c) => c.name.toLowerCase().includes(q))
  }, [contacts, query])

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const count = selectedIds.size

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
        maxHeight: 600,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0,
        }}>
          <button
            onClick={onBack}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Back
          </button>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            {count > 0 ? `${count} selected` : 'Select people'}
          </div>
          <button
            onClick={() => count > 0 && onDone(Array.from(selectedIds))}
            disabled={count === 0}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: count > 0 ? 'var(--accent)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: count > 0 ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            Done
          </button>
        </div>

        {/* Search */}
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            border: '1px solid var(--border-light)',
          }}>
            <Search size={14} strokeWidth={1.8} color="var(--text-muted)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts..."
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '32px 20px',
              textAlign: 'center',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-muted)',
            }}>
              No contacts found.
            </div>
          ) : (
            filtered.map((contact) => {
              const isSelected = selectedIds.has(contact.id)
              const tags = contact.chapterIds
                .map((id) => chapters.find((ch) => ch.id === id)?.name)
                .filter(Boolean) as string[]

              return (
                <button
                  key={contact.id}
                  onClick={() => toggle(contact.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 20px',
                    background: isSelected ? 'rgba(184,98,74,0.05)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 120ms',
                  }}
                >
                  <ContactAvatar name={contact.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      lineHeight: 1.3,
                    }}>
                      {contact.name}
                    </div>
                    {tags.length > 0 && (
                      <div style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}>
                        {tags.join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isSelected ? 'var(--accent)' : 'var(--bg)',
                    border: isSelected ? 'none' : '1.5px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 120ms, border 120ms',
                  }}>
                    {isSelected && <Check size={12} strokeWidth={2.5} color="#F9F5EE" />}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
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
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [cs, state] = await Promise.all([
          window.loop.contacts.list(),
          window.loop.state.get(),
        ])
        setContacts(cs)
        setChapters(state.chapters)
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
