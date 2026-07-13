import React, { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { SkeletonBlock } from '../components/SkeletonPulse'
import type { Contact, AppState } from '@shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  chapterId: string
  onSave: (selectedIds: string[]) => void
  onBack: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return 'a while ago'
  const ms = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(ms / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'} ago`
}

// ─── Avatar circle ────────────────────────────────────────────────────────────

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initial = name.startsWith('+') ? '•' : name.charAt(0).toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--accent)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  )
}

// ─── Contact row ─────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  lastContactDate,
  selected,
  onToggle,
}: {
  contact: Contact
  lastContactDate: string | null | undefined
  selected: boolean
  onToggle: () => void
}) {
  const [hov, setHov] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={contact.name}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 16px',
        borderRadius: 'var(--radius-sm)',
        background: hov ? 'rgba(26,16,12,0.03)' : 'transparent',
        cursor: 'pointer',
        outline: 'none',
        transition: 'background var(--duration-fast) var(--ease-out)',
        userSelect: 'none',
      } as React.CSSProperties}
    >
      {/* Avatar */}
      <Avatar name={contact.name} size={44} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {contact.name}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          Last spoke {relativeTime(lastContactDate)}
        </div>
      </div>

      {/* Check indicator */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          flexShrink: 0,
          background: selected ? 'var(--accent)' : 'transparent',
          border: selected ? 'none' : '2px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background var(--duration-fast) var(--ease-out), border var(--duration-fast) var(--ease-out)',
        }}
      >
        {selected && <Check size={12} strokeWidth={3} color="#fff" />}
      </div>
    </div>
  )
}

// ─── Selected tray avatar ─────────────────────────────────────────────────────

function TrayAvatar({ name }: { name: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#fff',
          border: '2px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {name.startsWith('+') ? '•' : name.charAt(0).toUpperCase()}
      </div>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          maxWidth: 52,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name.split(' ')[0]}
      </span>
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ChapterCrewPickerScreen({ chapterId, onSave, onBack }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [appState, setAppState] = useState<AppState | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [state, allContacts] = await Promise.all([
          window.loop.state.get() as Promise<AppState>,
          window.loop.contacts.list(),
        ])
        const chapterContacts = allContacts.filter((c) => c.chapterIds.includes(chapterId))
        setContacts(chapterContacts)
        setAppState(state)

        // Pre-populate: existing crewContactIds if set, else all chapter contacts
        const chapter = state.chapters.find((ch) => ch.id === chapterId)
        const preSelected = chapter?.crewContactIds?.length
          ? new Set(chapter.crewContactIds)
          : new Set(chapterContacts.map((c) => c.id))
        setSelected(preSelected)
      } catch { /* pass */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [chapterId])

  const handleAddNew = async () => {
    const name = newName.trim()
    if (!name) { setAddingNew(false); return }
    const id = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}`
    const contact: Contact = {
      id,
      name,
      chapterIds: [chapterId],
      tier: 'warm',
      createdAt: new Date().toISOString(),
    }
    try {
      await window.loop.contacts.save(contact)
    } catch { /* best-effort, still reflect locally */ }
    setContacts((prev) => [...prev, contact])
    setSelected((prev) => new Set(prev).add(id))
    setNewName('')
    setAddingNew(false)
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    const ids = Array.from(selected)
    try {
      if (appState) {
        const updatedChapters = appState.chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, crewContactIds: ids } : ch
        )
        await window.loop.state.patch({ chapters: updatedChapters })
      }
    } catch { /* best-effort */ }
    onSave(ids)
  }

  const selectedContacts = contacts.filter((c) => selected.has(c.id))
  const chapter = appState?.chapters.find((ch) => ch.id === chapterId)
  const chapterName = chapter?.name ?? 'This chapter'
  const count = selected.size

  if (loading) {
    return (
      <div style={{ height: '100%', background: 'var(--bg)', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonBlock width="100%" height={44} borderRadius={8} />
          <SkeletonBlock width="100%" height={44} borderRadius={8} />
          <SkeletonBlock width="100%" height={44} borderRadius={8} />
          <SkeletonBlock width="100%" height={44} borderRadius={8} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Left zone */}
      <div
        style={{
          width: 380,
          flexShrink: 0,
          paddingLeft: 60,
          paddingTop: 60,
          paddingRight: 32,
          paddingBottom: 100,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Chapter detected
        </div>

        {/* Chapter name */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          {chapterName}
        </h1>

        {/* Subline */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            marginTop: 10,
          }}
        >
          Who were you actually close to during this time?
        </p>

        {/* Selected tray */}
        {selectedContacts.length > 0 && (
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            {selectedContacts.map((c) => (
              <TrayAvatar key={c.id} name={c.name} />
            ))}
          </div>
        )}

        {selectedContacts.length === 0 && (
          <p
            style={{
              marginTop: 20,
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            No one selected yet.
          </p>
        )}
      </div>

      {/* Right zone */}
      <div
        style={{
          flex: 1,
          paddingTop: 60,
          paddingRight: 60,
          paddingLeft: 8,
          paddingBottom: 100,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {contacts.length === 0 ? (
          <div
            style={{
              paddingTop: 40,
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            No contacts found for this chapter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {contacts.map((contact) => {
              const cs = appState?.contacts[contact.id]
              return (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  lastContactDate={cs?.lastContactDate}
                  selected={selected.has(contact.id)}
                  onToggle={() => toggle(contact.id)}
                />
              )
            })}
          </div>
        )}

        {/* Add someone */}
        {addingNew ? (
          <div style={{ marginTop: 16, display: 'flex', gap: 8, padding: '0 16px', alignItems: 'center' }}>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNew()
                if (e.key === 'Escape') { setAddingNew(false); setNewName('') }
              }}
              placeholder="Their name"
              style={{
                flex: 1,
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--text-primary)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                padding: '7px 14px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleAddNew}
              style={{
                background: 'var(--accent)',
                color: 'var(--text-on-accent)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                padding: '7px 16px',
                cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingNew(true)}
            style={{
              marginTop: 16,
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px 16px',
              textAlign: 'left',
              borderRadius: 'var(--radius-full)',
            }}
          >
            + Add someone not on this list
          </button>
        )}
      </div>

      {/* Sticky footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 96,
          pointerEvents: 'none',
        }}
      >
        {/* Gradient fade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent, var(--bg))',
          }}
        />

        {/* Footer content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 60,
            paddingRight: 60,
            pointerEvents: 'all',
          }}
        >
          {/* Count label */}
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-muted)',
            }}
          >
            {count === 0 ? 'No one selected' : `${count} selected`}
          </span>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 600,
                padding: '10px 24px',
                cursor: 'pointer',
              }}
            >
              Save my crew
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
