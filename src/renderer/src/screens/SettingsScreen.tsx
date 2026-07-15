// MAV-45 — settings screen (CD design + full IPC wiring)
import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MessageCircle, Trash2, Folder, RefreshCw } from 'lucide-react'
import type { AppState, ChapterCandidate, Contact } from '@shared/types'
import { getNewChapterCandidates } from '../lib/newChapterCandidates'
import { ChapterReviewModal } from '../components/ChapterReviewModal'

const MONO = '"SFMono-Regular","SF Mono",ui-monospace,Menlo,monospace'

type CSS = React.CSSProperties

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
  const initials = name.startsWith('+')
    ? '•'
    : name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 8px 10px 12px' }}>
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0,
        background: checked ? 'var(--accent)' : 'var(--border)',
        transition: 'background 200ms',
        position: 'relative', flex: 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        transition: 'left 200ms',
      }} />
    </button>
  )
}

function Section({ label, children, footnote }: { label: string; children?: React.ReactNode; footnote?: string }) {
  return (
    <section>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 10px 6px' }}>{label}</div>
      <PaperCard padding={6}>{children}</PaperCard>
      {footnote && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)', margin: '10px 6px 0' }}>{footnote}</p>}
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
  const [telemetryEnabled, setTelemetryEnabled] = useState(true)
  const [rescanning, setRescanning] = useState(false)
  const [reviewCandidates, setReviewCandidates] = useState<ChapterCandidate[] | null>(null)
  useEffect(() => {
    Promise.all([
      window.loop.state.get(),
      window.loop.contacts.list(),
      window.loop.data.getDir(),
    ]).then(([state, cs, dir]) => {
      setAppState(state)
      setContacts(cs)
      setConnected(state.whatsappConnected)
      setDataDir(dir.replace(/^\/Users\/[^/]+/, '~'))
      setTelemetryEnabled(state.telemetryEnabled !== false)
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

  // MAV-258: once onboarding is done, there was previously no way to refresh
  // WhatsApp group/chapter candidates short of resetting chapterDetectionComplete
  // and restarting the app — which forces a full WhatsApp reconnect and (per
  // WhatsAppManager.disconnect()'s deliberate MAV-256 design) wipes the group
  // cache in the process. That made every "did the fix actually work" check
  // destroy its own evidence. This calls the same chapters:detect() IPC used
  // by onboarding, but as a silent background refresh — no confirm/naming
  // walkthrough, no reconnect, no cache wipe. Deliberate, narrow exception to
  // "ChapterInferenceScreen is the only caller of chapters.detect()" in
  // Loop/CLAUDE.md: that rule protects the *onboarding decision flow* (confirm
  // → name → reveal) from getting a second entry point, not the underlying
  // detection call itself. A returning user rescanning already has their
  // chapters confirmed; forcing them back through onboarding UI would be worse
  // UX than the gap this closes.
  const handleRescanGroups = async () => {
    if (rescanning) return
    setRescanning(true)
    try {
      await window.loop.chapters.detect()
      // chapters:detect() already persists detectedChapters/pendingChapters
      // (main-process side) — re-read state so the "actually new" filter sees
      // this pass's results, not the stale copy fetched on mount.
      const fresh = await window.loop.state.get()
      const newOnes = getNewChapterCandidates(fresh)
      setToast(
        newOnes.length > 0
          ? {
              message: `Found ${newOnes.length} new chapter${newOnes.length === 1 ? '' : 's'}.`,
              tone: 'positive',
              action: { label: 'Review', onClick: () => { setReviewCandidates(newOnes); setToast(null) } },
            }
          : { message: 'Rescanned — no new chapters to suggest right now.', tone: 'positive' }
      )
    } catch {
      setToast({ message: "Couldn't rescan right now. Try again in a bit.", tone: 'neutral' })
    } finally {
      setRescanning(false)
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

  const handleTelemetryToggle = async (enabled: boolean) => {
    setTelemetryEnabled(enabled)
    await window.loop.telemetry.setEnabled(enabled).catch(() => {})
  }

  const handleDeleteAll = () => {
    setConfirmOpen(false)
    window.loop.data.deleteAll().catch(() => {})
  }

  return (
    <div data-screen-label="Settings" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <style>{`
        @keyframes loopRescanSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      {/* MAV-194: left-pad 80px to clear macOS traffic lights in hiddenInset titlebar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px 0 80px' }}>
        <IconBtn label="Back" onClick={onBack} icon={<ArrowLeft size={19} strokeWidth={2} />} />
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '10px 24px 80px' }}>
        <header style={{ margin: '18px 6px 30px' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>Settings</h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.55, color: 'var(--text-secondary)', margin: '8px 0 0' }}>
            How Loop listens, and who it listens for.
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <Section label="WhatsApp">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px' }}>
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
            {connected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-full)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--text-muted)' }}>
                  <RefreshCw size={18} strokeWidth={2} style={rescanning ? { animation: 'loopRescanSpin 900ms linear infinite' } : undefined} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Rescan my groups</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    Refresh chapter candidates from your WhatsApp groups.
                  </div>
                </div>
                <Btn variant="secondary" size="sm" onClick={handleRescanGroups}>
                  {rescanning ? 'Rescanning…' : 'Rescan'}
                </Btn>
              </div>
            )}
          </Section>

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

          <Section label="About">
            <div style={{ padding: '14px 14px' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0 }}>
                "Time passes. People get busy. Silence accumulates. Not because anyone stopped caring. Because staying close takes effort nobody has, and nobody keeps count. Loop keeps count. Quietly."
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', margin: '12px 0 0', lineHeight: 1.5 }}>
                Loop is local-first. Everything stays on your Mac. Nothing is shared, sold, or seen by anyone else.
              </p>
            </div>
          </Section>

          <Section label="Privacy">
            <Row
              title="Anonymous crash reports and usage stats"
              sub="Stack traces and event counts only. No contact data ever leaves your Mac."
              control={<Toggle checked={telemetryEnabled} onChange={handleTelemetryToggle} />}
            />
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


      <Toast toast={toast} onClose={() => setToast(null)} />

      {reviewCandidates && (
        <ChapterReviewModal
          candidates={reviewCandidates}
          onClose={() => setReviewCandidates(null)}
          onConfirmed={() => {}}
        />
      )}
    </div>
  )
}

export default SettingsScreen
