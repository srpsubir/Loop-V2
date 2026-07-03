// MAV-45 — settings screen (CD design + full IPC wiring)
import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MessageCircle, Trash2, Folder, Send, Copy, Check } from 'lucide-react'
import type { AppState, Contact, InviteCode } from '@shared/types'

const MONO = '"SFMono-Regular","SF Mono",ui-monospace,Menlo,monospace'

type CSS = React.CSSProperties

const TOKEN_CSS = `
:root {
  --bg: #F9F5EE; --surface: #EFE6D6; --surface-raised: #E8DBCA;
  --text-primary: #2A1F1B; --text-secondary: #6B5447; --text-muted: #A38F85;
  --text-on-accent: #F9F5EE;
  --accent: #B8624A; --accent-hover: #A6543E; --terracotta-faint: #F5EAD8;
  --rose: #C49A8A; --terracotta-light: #D4856E;
  --positive: #6A9470; --positive-faint: #EAF2EB; --sage: #6A9470;
  --border: #DDD0C0; --border-light: #EDE3D5;
  --font-serif: "Lora", Georgia, serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-md: 12px; --radius-lg: 18px; --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgba(42,31,27,0.05), 0 1px 3px rgba(42,31,27,0.04);
  --shadow-md: 0 1px 2px rgba(42,31,27,0.05), 0 4px 12px rgba(42,31,27,0.07);
  --shadow-xl: 0 4px 10px rgba(42,31,27,0.08), 0 24px 56px rgba(42,31,27,0.16);
  --shadow-inset: inset 0 1px 3px rgba(42,31,27,0.08);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --duration-fast: 120ms; --duration-base: 200ms;
}`

// ─── Design primitives ────────────────────────────────────────────────────────

function PaperCard({ children, padding = 20, style }: {
  children?: React.ReactNode; padding?: number; style?: CSS
}) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', padding, ...style }}>
      {children}
    </div>
  )
}

type BtnVariant = 'primary' | 'secondary' | 'ghost'

function Btn({ variant = 'primary', size = 'md', onClick, children }: {
  variant?: BtnVariant; size?: 'sm' | 'md'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children?: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  const styles: Record<BtnVariant, CSS> = {
    primary: { background: 'var(--accent)', color: 'var(--text-on-accent)', boxShadow: 'var(--shadow-sm)' },
    secondary: { background: 'var(--surface-raised)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' },
    ghost: { background: 'transparent', color: 'var(--accent)' },
  }
  const hoverBg: Record<BtnVariant, string> = {
    primary: 'var(--accent-hover)', secondary: 'var(--terracotta-faint)', ghost: 'var(--terracotta-faint)',
  }
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false) }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: size === 'sm' ? 30 : 38, padding: size === 'sm' ? '0 12px' : '0 18px', fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? 13 : 14, fontWeight: 600, lineHeight: 1, borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', transition: 'background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)', ...styles[variant], ...(hover ? { background: hoverBg[variant] } : null), ...(press ? { transform: 'translateY(0.5px) scale(0.985)' } : null) } as CSS}
    >{children}</button>
  )
}

function IconBtn({ icon, label, onClick, size = 36 }: {
  icon: React.ReactNode; label: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; size?: number
}) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false) }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', background: hover ? 'var(--surface-raised)' : 'transparent', color: 'var(--text-secondary)', transform: press ? 'scale(0.92)' : 'none', transition: 'background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)' }}
    >{icon}</button>
  )
}

function AvatarEl({ name, size = 46, ring = 'none' }: { name: string; size?: number; ring?: 'none' | 'sage' }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const tints = ['var(--rose)', 'var(--terracotta-light)', 'var(--sage)', 'var(--rose)', 'var(--accent)']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return (
    <div style={{ width: size, height: size, borderRadius: 'var(--radius-full)', flex: 'none', boxShadow: ring === 'sage' ? '0 0 0 2px var(--bg), 0 0 0 4px var(--sage)' : 'var(--shadow-sm)' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-full)', background: tints[h % tints.length], color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: Math.round(size * 0.38), letterSpacing: '0.01em' }}>
        {initials}
      </div>
    </div>
  )
}

function PersonRow({ name, note, ring, trailing }: { name: string; note: string; ring: 'none' | 'sage'; trailing?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 8px 10px 12px' }}>
      <AvatarEl name={name} size={46} ring={ring} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.25 }}>{name}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note}</div>
      </div>
      {trailing && <div style={{ flex: 'none' }}>{trailing}</div>}
    </div>
  )
}

function ConfirmDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(42,31,27,0.32)', backdropFilter: 'saturate(1.05) blur(1px)' }}
    >
      <div role="dialog" aria-modal="true"
        style={{ width: '100%', maxWidth: 440, background: 'var(--bg)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', padding: 28 }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', background: 'var(--terracotta-faint)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Trash2 size={20} strokeWidth={2} />
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>Delete everything?</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: 8 }}>
          This clears every person, chapter, and memory Loop holds. It can't be undone. Your actual conversations aren't touched.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Btn variant="ghost" onClick={onClose}>Keep everything</Btn>
          <Btn variant="primary" onClick={onConfirm}>Delete it all</Btn>
        </div>
      </div>
    </div>
  )
}

function ShareDialog({ open, code, onClose, onCopy }: {
  open: boolean; code: string; onClose: () => void; onCopy: () => void
}) {
  const shareMsg = `I've been using Loop to keep up with the people from our chapter. It quietly reminds you who you've drifted from. Here's an invite to join me: ${code}`
  const [copied, setCopied] = useState(false)
  const copyRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(shareMsg).catch(() => {})
    setCopied(true)
    onCopy()
    clearTimeout(copyRef.current)
    copyRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(42,31,27,0.32)', backdropFilter: 'saturate(1.05) blur(1px)' }}>
      <div role="dialog" aria-modal="true"
        style={{ width: '100%', maxWidth: 440, background: 'var(--bg)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', padding: 28 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.25, marginBottom: 14 }}>
          Share an invite
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
          background: 'var(--surface)', borderRadius: 10, padding: '14px 16px',
          userSelect: 'all', marginBottom: 20,
        }}>
          {shareMsg}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={handleCopy}>
            {copied ? <><Check size={13} strokeWidth={2.5} style={{ marginRight: 6 }} />Copied</> : <><Copy size={13} strokeWidth={2} style={{ marginRight: 6 }} />Copy message</>}
          </Btn>
        </div>
      </div>
    </div>
  )
}

type ToastState = { message: string; tone: 'neutral' | 'positive'; action?: { label: string; onClick: () => void } } | null

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div role="status" aria-live="polite"
      style={{ position: 'fixed', left: '50%', bottom: 32, transform: 'translateX(-50%)', zIndex: 120, display: 'inline-flex', alignItems: 'center', gap: 12, maxWidth: 'min(92vw, 420px)', padding: toast.action ? '12px 12px 12px 18px' : '13px 20px', background: 'var(--bg)', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-xl)', fontFamily: 'var(--font-sans)' }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', background: toast.tone === 'positive' ? 'var(--sage)' : 'var(--accent)', flex: 'none' }} />
      <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>{toast.message}</span>
      {toast.action && (
        <button type="button" onClick={toast.action.onClick}
          style={{ flex: 'none', border: 'none', cursor: 'pointer', background: 'var(--surface-raised)', color: 'var(--accent)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 'var(--radius-full)' }}
        >{toast.action.label}</button>
      )}
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function Section({ label, children, footnote }: { label: string; children?: React.ReactNode; footnote?: string }) {
  return (
    <section>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 10px 6px' }}>{label}</div>
      <PaperCard padding={6}>{children}</PaperCard>
      {footnote && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-muted)', margin: '10px 6px 0' }}>{footnote}</p>}
    </section>
  )
}

function Row({ title, sub, control, stacked = false, divider = false }: {
  title: string; sub?: string; control?: React.ReactNode; stacked?: boolean; divider?: boolean
}) {
  const titleEl = (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>{title}</div>
      {sub && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)', marginTop: 3, maxWidth: 400 }}>{sub}</div>}
    </div>
  )
  return (
    <div style={{ padding: '14px 14px', borderTop: divider ? '1px solid var(--border-light)' : 'none' }}>
      {stacked ? (
        <div>{titleEl}<div style={{ marginTop: 14 }}>{control}</div></div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{titleEl}</div>
          <div style={{ flex: 'none' }}>{control}</div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contactNote(contact: Contact, appState: AppState | null): string {
  const cs = appState?.contacts[contact.id]
  if (cs?.lastContactDate) {
    const days = Math.floor((Date.now() - new Date(cs.lastContactDate).getTime()) / 86400000)
    if (days === 0) return 'You spoke today'
    if (days === 1) return 'You spoke yesterday'
    if (days < 7) return `${days} days since you last spoke`
    const wks = Math.floor(days / 7)
    if (days < 30) return `${wks} week${wks > 1 ? 's' : ''} since you last spoke`
    const mths = Math.floor(days / 30)
    return `${mths} month${mths > 1 ? 's' : ''} since you last spoke`
  }
  return contact.tier === 'close' ? 'Close contact' : 'Warm contact'
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export interface SettingsScreenProps { onBack?: () => void; onConnect?: () => void }

export function SettingsScreen({ onBack, onConnect }: SettingsScreenProps) {
  const [appState, setAppState] = useState<AppState | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [connected, setConnected] = useState(false)
  const [dataDir, setDataDir] = useState('~/Documents/Loop')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      window.loop.state.get(),
      window.loop.contacts.list(),
      window.loop.data.getDir(),
      window.loop.invite.generate(),
    ]).then(([state, cs, dir, codes]) => {
      setAppState(state)
      setContacts(cs)
      setConnected(state.whatsappConnected)
      setDataDir(dir.replace(/^\/Users\/[^/]+/, '~'))
      setInviteCodes(codes)
    }).catch(() => {})

    const unsub = window.loop.state.onChange(() => {
      window.loop.state.get().then((s) => {
        setAppState(s)
        setConnected(s.whatsappConnected)
      }).catch(() => {})
    })
    return () => unsub?.()
  }, [])

  const handleToggleConnection = async () => {
    if (connected) {
      await window.loop.whatsapp.disconnect().catch(() => {})
      setConnected(false)
      setToast({ message: 'Disconnected. Loop keeps what it already remembers.', tone: 'neutral' })
    } else {
      onConnect?.()
    }
  }

  const handleRemoveContact = (contact: Contact) => {
    const before = contacts
    setContacts(before.filter((x) => x.id !== contact.id))
    window.loop.contacts.delete(contact.id).catch(() => {})
    setToast({
      message: `${contact.name.split(' ')[0]} won't come up anymore.`,
      tone: 'neutral',
      action: {
        label: 'Undo',
        onClick: () => {
          setContacts(before)
          window.loop.contacts.save(contact).catch(() => {})
          setToast(null)
        },
      },
    })
  }

  const handleDeleteAll = () => {
    setConfirmOpen(false)
    window.loop.data.deleteAll().catch(() => {})
  }

  return (
    <div data-screen-label="Settings" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <style dangerouslySetInnerHTML={{ __html: TOKEN_CSS }} />

      {/* MAV-194: left-pad 80px to clear macOS traffic lights in hiddenInset titlebar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px 0 80px' }}>
        <IconBtn label="Back" onClick={onBack} icon={<ArrowLeft size={19} strokeWidth={2} />} />
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '10px 24px 80px' }}>
        <header style={{ margin: '18px 6px 30px' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>Settings</h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-secondary)', margin: '8px 0 0' }}>
            How Loop listens, and who it listens for.
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <Section label="WhatsApp">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px' }}>
              <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-full)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: connected ? 'var(--positive-faint)' : 'var(--surface)', color: connected ? 'var(--positive)' : 'var(--text-muted)', transition: 'all var(--duration-base) var(--ease-out)' }}>
                <MessageCircle size={20} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>WhatsApp</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.5, color: connected ? 'var(--positive)' : 'var(--text-muted)', marginTop: 3 }}>
                  {connected
                    ? 'Connected. Loop is reading your conversations.'
                    : 'Not connected. Loop can only remember conversations you share with it.'}
                </div>
              </div>
              <Btn variant={connected ? 'secondary' : 'primary'} size="sm" onClick={handleToggleConnection}>
                {connected ? 'Disconnect' : 'Connect'}
              </Btn>
            </div>
          </Section>

          {/* ── Invite Your Chapters ───────────────────────────────────────── */}
          {inviteCodes.length > 0 && (() => {
            const usedCount = inviteCodes.filter(c => c.usedAt).length
            const firstAvailable = inviteCodes.find(c => !c.usedAt)
            const copyCode = (code: string) => {
              navigator.clipboard.writeText(code).catch(() => {})
              setToast({ message: 'Code copied.', tone: 'positive' })
            }
            return (
              <Section label="Invite your chapters">
                <div style={{ padding: '12px 14px 6px' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 14px' }}>
                    Invite the people from your chapters to join Loop.
                  </p>
                  <div style={{ borderTop: '1px solid var(--border-light)' }}>
                    {inviteCodes.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 4px', borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: MONO, fontSize: 14.5, fontWeight: 500, letterSpacing: '.03em', color: c.usedAt ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                            {c.code}
                          </span>
                          {!c.usedAt && (
                            <IconBtn size={28} label="Copy code" onClick={() => copyCode(c.code)}
                              icon={<Copy size={13} strokeWidth={2} />} />
                          )}
                        </div>
                        <span style={{
                          fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500, padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: c.usedAt ? 'var(--surface)' : 'var(--terracotta-faint)',
                          color: c.usedAt ? 'var(--text-muted)' : 'var(--accent)',
                        }}>
                          {c.usedAt ? 'Used' : 'Available'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}>
                      {usedCount} of 3 invites used
                    </span>
                    {firstAvailable && (
                      <Btn variant="secondary" size="sm" onClick={() => setShareDialogOpen(true)}>
                        <Send size={12} strokeWidth={2} style={{ marginRight: 6 }} />Share an invite
                      </Btn>
                    )}
                  </div>
                </div>
              </Section>
            )
          })()}

          <Section
            label="People"
            footnote="Removing someone only removes them from Loop. Your actual conversations are never touched."
          >
            {contacts.map((contact, i) => (
              <div key={contact.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-light)' }}>
                <PersonRow
                  name={contact.name}
                  note={contactNote(contact, appState)}
                  ring={contact.tier === 'close' ? 'sage' : 'none'}
                  trailing={
                    <IconBtn
                      size={30}
                      label={`Remove ${contact.name.split(' ')[0]}`}
                      onClick={() => handleRemoveContact(contact)}
                      icon={<Trash2 size={16} strokeWidth={2} />}
                    />
                  }
                />
              </div>
            ))}
            {contacts.length === 0 && (
              <div style={{ padding: '16px 14px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--text-muted)' }}>
                No one yet. Loop will suggest people as it reads.
              </div>
            )}
          </Section>

          <Section label="Data">
            <Row
              stacked title="Where Loop keeps things"
              sub="Everything stays on this Mac, in one folder."
              control={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--surface)', boxShadow: 'var(--shadow-inset)', color: 'var(--text-secondary)' }}>
                  <Folder size={16} strokeWidth={2} color="var(--text-muted)" style={{ flex: 'none' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dataDir}
                  </span>
                </div>
              }
            />
            <Row
              divider title="Delete all data"
              sub="Every chapter, crew, and memory. Gone for good."
              control={
                <Btn variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>
                  Delete all data
                </Btn>
              }
            />
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteAll}
      />

      <ShareDialog
        open={shareDialogOpen}
        code={inviteCodes.find(c => !c.usedAt)?.code ?? ''}
        onClose={() => setShareDialogOpen(false)}
        onCopy={() => {
          setShareDialogOpen(false)
          setToast({ message: 'Invite copied. Paste it anywhere.', tone: 'positive' })
        }}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

export default SettingsScreen
