import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Link, Unlink } from 'lucide-react'
import { Avatar, Button, IconButton, PaperCard, SegmentedControl } from '../components'
import type { AppState, Chapter, Contact } from '@shared/types'

interface SettingsScreenProps {
  onBack: () => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        fontWeight: 600,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  )
}

function SettingRow({ label, desc, trailing }: { label: string; desc?: string; trailing: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 20px',
      }}
    >
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          {label}
        </div>
        {desc && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {desc}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{trailing}</div>
    </div>
  )
}

// ─── Chapter form ─────────────────────────────────────────────────────────────

function AddChapterForm({ onSave, onCancel }: { onSave: (ch: Omit<Chapter, 'id'>) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [startYear, setStartYear] = useState('')
  const [endYear, setEndYear] = useState('')

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    color: 'var(--text-primary)',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
  }

  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-light)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <input
          placeholder="Chapter name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...inputStyle, gridColumn: '1 / -1' }}
        />
        <input
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Start year"
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
          <input
            placeholder="End year"
            value={endYear}
            onChange={(e) => setEndYear(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          disabled={!name.trim()}
          onClick={() => {
            onSave({
              name: name.trim(),
              location: location.trim() || undefined,
              startYear: startYear ? parseInt(startYear) : undefined,
              endYear: endYear ? parseInt(endYear) : undefined,
              active: !endYear,
            })
          }}
        >
          Save chapter
        </Button>
      </div>
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [state, setAppState] = useState<AppState | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected'>('disconnected')

  useEffect(() => {
    async function load() {
      try {
        const [s, cs, status] = await Promise.all([
          window.loop.state.get() as Promise<AppState>,
          window.loop.contacts.list(),
          window.loop.whatsapp.status(),
        ])
        setAppState(s)
        setContacts(cs)
        setWhatsappStatus(status.status === 'connected' ? 'connected' : 'disconnected')
      } catch { /* pass */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function patchAndRefresh(patch: Partial<AppState>) {
    try {
      const next = await window.loop.state.patch(patch)
      setAppState(next)
    } catch { /* pass */ }
  }

  const cooldownOptions = ['1h', '4h', '12h', '24h']
  const cooldownMap: Record<string, number> = { '1h': 1, '4h': 4, '12h': 12, '24h': 24 }
  const cooldownLabel = Object.entries(cooldownMap).find(([, v]) => v === state?.scanCooldownHours)?.[0] ?? '4h'

  const handleAddChapter = async (ch: Omit<Chapter, 'id'>) => {
    if (!state) return
    const id = ch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const chapter: Chapter = { ...ch, id }
    await patchAndRefresh({ chapters: [...state.chapters, chapter] })
    setShowAddChapter(false)
  }

  const handleDeleteChapter = async (id: string) => {
    if (!state) return
    await patchAndRefresh({ chapters: state.chapters.filter((ch) => ch.id !== id) })
  }

  const handleDeleteContact = async (id: string) => {
    try {
      await window.loop.contacts.delete(id)
      setContacts((cs) => cs.filter((c) => c.id !== id))
    } catch { /* pass */ }
  }

  const handleWhatsAppReconnect = async () => {
    try {
      await window.loop.whatsapp.start()
    } catch { /* pass */ }
  }

  const handleWhatsAppDisconnect = async () => {
    try {
      await window.loop.whatsapp.disconnect()
      setWhatsappStatus('disconnected')
    } catch { /* pass */ }
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 17 }}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 56px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
          <IconButton label="Back" icon={<ArrowLeft size={18} strokeWidth={1.8} />} onClick={onBack} />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Settings
          </div>
        </div>

        {/* Scanning */}
        <div style={{ marginBottom: 36 }}>
          <SectionLabel>Scanning</SectionLabel>
          <PaperCard padding={0}>
            <SettingRow
              label="Scan cooldown"
              desc="How often Loop re-scans your WhatsApp history"
              trailing={
                <SegmentedControl
                  options={cooldownOptions}
                  value={cooldownLabel}
                  onChange={(v) => patchAndRefresh({ scanCooldownHours: cooldownMap[v] ?? 4 })}
                />
              }
            />
          </PaperCard>
        </div>

        {/* WhatsApp */}
        <div style={{ marginBottom: 36 }}>
          <SectionLabel>WhatsApp</SectionLabel>
          <PaperCard padding={0}>
            <SettingRow
              label="Connection"
              desc={whatsappStatus === 'connected' ? 'Connected and syncing' : 'Not connected'}
              trailing={
                whatsappStatus === 'connected' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<Unlink size={13} strokeWidth={1.8} />}
                    onClick={handleWhatsAppDisconnect}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    iconLeft={<Link size={13} strokeWidth={1.8} />}
                    onClick={handleWhatsAppReconnect}
                  >
                    Connect
                  </Button>
                )
              }
            />
          </PaperCard>
        </div>

        {/* Chapters */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionLabel>Chapters</SectionLabel>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Plus size={13} strokeWidth={1.8} />}
              onClick={() => setShowAddChapter(true)}
            >
              Add chapter
            </Button>
          </div>
          <PaperCard padding={0}>
            {(state?.chapters ?? []).length === 0 && !showAddChapter ? (
              <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}>
                No chapters yet. Add your first one above.
              </div>
            ) : (
              <>
                {(state?.chapters ?? []).map((ch, i) => (
                  <div key={ch.id}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {ch.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {[ch.location, ch.startYear && ch.endYear ? `${ch.startYear}–${ch.endYear}` : ch.startYear ? `${ch.startYear}–` : null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <IconButton
                        icon={<Trash2 size={14} strokeWidth={1.8} />}
                        label={`Delete ${ch.name}`}
                        size="sm"
                        onClick={() => handleDeleteChapter(ch.id)}
                        style={{ color: 'var(--text-muted)', opacity: 0.7 }}
                      />
                    </div>
                    {(i < (state?.chapters.length ?? 0) - 1 || showAddChapter) && (
                      <div style={{ height: 1, background: 'var(--border-light)', margin: '0 20px' }} />
                    )}
                  </div>
                ))}
                {showAddChapter && (
                  <AddChapterForm
                    onSave={handleAddChapter}
                    onCancel={() => setShowAddChapter(false)}
                  />
                )}
              </>
            )}
          </PaperCard>
        </div>

        {/* People */}
        {contacts.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <SectionLabel>People ({contacts.length})</SectionLabel>
            <PaperCard padding={0}>
              {contacts.map((contact, i) => (
                <div key={contact.id}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12 }}>
                    <Avatar name={contact.name} size={36} ring={contact.tier === 'close' ? 'sage' : 'none'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        {contact.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                        {contact.tier === 'close' ? `Close · every ${contact.intervalDays ?? 30} days` : 'Warm'}
                      </div>
                    </div>
                    <IconButton
                      icon={<Trash2 size={13} strokeWidth={1.8} />}
                      label={`Remove ${contact.name}`}
                      size="sm"
                      onClick={() => handleDeleteContact(contact.id)}
                      style={{ color: 'var(--text-muted)', opacity: 0.7 }}
                    />
                  </div>
                  {i < contacts.length - 1 && (
                    <div style={{ height: 1, background: 'var(--border-light)', margin: '0 16px' }} />
                  )}
                </div>
              ))}
            </PaperCard>
          </div>
        )}

        {/* Dev shortcut — bypass onboarding */}
        {state && !state.onboardingComplete && (
          <div style={{ marginTop: 48, borderTop: '1px solid var(--border-light)', paddingTop: 24 }}>
            <SectionLabel>Developer</SectionLabel>
            <PaperCard padding={16} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}>
                Skip onboarding (dev only)
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => patchAndRefresh({ onboardingComplete: true, whatsappConnected: false })}
              >
                Skip to garden
              </Button>
            </PaperCard>
          </div>
        )}
      </div>
    </div>
  )
}
