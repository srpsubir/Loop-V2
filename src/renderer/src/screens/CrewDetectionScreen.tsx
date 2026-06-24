// FILE: src/renderer/src/screens/CrewDetectionScreen.tsx

import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Avatar, Button, PaperCard, ProgressDots } from '../components'
import type { Chapter, Contact, WarmthTier } from '@shared/types'

// ─── Local types ──────────────────────────────────────────────────────────────

interface WAGroupRow {
  id: string
  name: string
  memberCount: number
  memberNames: string[]   // raw JIDs from WA or display names from mock
  chapterId: string | null
}

interface CrewMember {
  id: string
  name: string             // display name or formatted JID
  whatsappJid: string      // raw JID for Contact.whatsappId
  chapterId: string
  selected: boolean
}

interface CrewDetectionScreenProps {
  onComplete: () => void
  onSkip: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jidToName(jid: string): string {
  const phone = jid.replace(/@.*$/, '').replace(/[^0-9]/g, '')
  if (phone.length < 6) return jid
  return `+${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}`
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 48)
}

// ─── Mock data (fallback when WhatsApp IPC unavailable) ───────────────────────

const MOCK_CHAPTERS: Chapter[] = [
  { id: 'ch-1', name: 'Edinburgh years', active: false, startYear: 2012, endYear: 2016 },
  { id: 'ch-2', name: 'London days',     active: false, startYear: 2016, endYear: 2020 },
  { id: 'ch-3', name: 'Working years',   active: true,  startYear: 2020 },
]

const MOCK_GROUPS: WAGroupRow[] = [
  {
    id: 'g1', name: 'Edinburgh Flat 2014 🏠', memberCount: 6, chapterId: null,
    memberNames: ['Priya Raman', 'Marcus Bell', 'Jo Okafor', 'Lena Müller', 'Tom Reid', 'Caitlin Ross'],
  },
  {
    id: 'g2', name: "Deloitte Cohort '16", memberCount: 9, chapterId: null,
    memberNames: ['Sarah Chen', 'James Oduya', 'Fatima Hassan', 'Daniel Park', 'Mei Lin',
                  'Ravi Kapoor', 'Claire Morin', 'Ben Ashford', 'Yuki Tanaka'],
  },
  {
    id: 'g3', name: 'Camden crew', memberCount: 7, chapterId: null,
    memberNames: ['Mike Adeyemi', 'Clara Svensson', 'Rishi Patel', 'Nina Kowalski', 'Tom Okeke', 'Sam Davies', 'Freya Hansen'],
  },
  {
    id: 'g4', name: 'Berlin squad 🇩🇪', memberCount: 4, chapterId: null,
    memberNames: ['Kai Schmidt', 'Ana Pereira', 'Felix Bauer', 'Mia Wolf'],
  },
  {
    id: 'g5', name: 'Family', memberCount: 6, chapterId: null,
    memberNames: ['Mum', 'Dad', 'Sam', 'Gran', 'Uncle Pete', 'Auntie Kath'],
  },
]

// ─── ChapterPill ──────────────────────────────────────────────────────────────

function ChapterPill({
  chapterId,
  chapters,
  onChange,
}: {
  chapterId: string | null
  chapters: Chapter[]
  onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const chapter = chapters.find(c => c.id === chapterId) ?? null

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 'var(--radius-full)',
          background: chapter ? 'var(--accent-faint)' : 'var(--surface-raised)',
          border: chapter ? '1px solid rgba(184,98,74,0.22)' : '1px solid transparent',
          fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
          color: chapter ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'background var(--duration-fast) var(--ease-out)',
        }}
      >
        {chapter ? chapter.name : 'Assign chapter'}
        <ChevronDown size={10} strokeWidth={2} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', minWidth: 192,
        }}>
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '9px 14px', border: 'none',
              background: !chapterId ? 'var(--surface)' : 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: 13,
              color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left',
            }}
          >
            No chapter
          </button>
          {chapters.map(ch => (
            <button
              key={ch.id}
              type="button"
              onClick={() => { onChange(ch.id); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '9px 14px', border: 'none',
                background: ch.id === chapterId ? 'var(--surface)' : 'transparent',
                fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                color: ch.id === chapterId ? 'var(--accent)' : 'var(--text-primary)',
                transition: 'background var(--duration-fast)',
              }}
            >
              {ch.name}
              {ch.id === chapterId && <Check size={12} strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── GroupRow ─────────────────────────────────────────────────────────────────

function GroupRow({
  group, chapters, onAssign, isLast,
}: {
  group: WAGroupRow
  chapters: Chapter[]
  onAssign: (groupId: string, chapterId: string | null) => void
  isLast: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 20px',
      borderBottom: isLast ? 'none' : '1px solid var(--border-light)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          color: 'var(--text-primary)', marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {group.name}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>
          {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'}
        </div>
      </div>
      <ChapterPill
        chapterId={group.chapterId}
        chapters={chapters}
        onChange={id => onAssign(group.id, id)}
      />
    </div>
  )
}

// ─── AvatarCell ───────────────────────────────────────────────────────────────

function AvatarCell({ member, onToggle }: { member: CrewMember; onToggle: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        background: hov ? 'var(--surface)' : 'transparent',
        border: 'none', cursor: 'pointer',
        padding: '10px 8px', borderRadius: 'var(--radius-md)',
        opacity: member.selected ? 1 : 0.38,
        transition: `opacity var(--duration-base) var(--ease-out), background var(--duration-fast) var(--ease-out)`,
      }}
    >
      <div style={{ position: 'relative' }}>
        <Avatar name={member.name} size={52} ring={member.selected ? 'terracotta' : 'none'} />
        {member.selected && (
          <div style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--accent)', border: '2px solid var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={9} strokeWidth={3} color="var(--text-on-accent)" />
          </div>
        )}
      </div>
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 11,
        color: 'var(--text-secondary)', textAlign: 'center',
        lineHeight: 1.3, maxWidth: 68,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {member.name.split(' ')[0]}
      </span>
    </button>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CrewDetectionScreen({ onComplete, onSkip }: CrewDetectionScreenProps) {
  const [step, setStep]         = useState(0)
  const [chapters, setChapters] = useState<Chapter[]>(MOCK_CHAPTERS)
  const [groups, setGroups]     = useState<WAGroupRow[]>([])
  const [members, setMembers]   = useState<CrewMember[]>([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    window.loop.state.get()
      .then(s => { if (s.chapters?.length) setChapters(s.chapters) })
      .catch(() => { /* keep MOCK_CHAPTERS */ })
  }, [])

  // ── Step 0 → 1: scan groups ───────────────────────────────────────────────

  const handleScanGroups = async () => {
    setLoading(true)
    try {
      const raw = await window.loop.whatsapp.listGroups()
      const rows: WAGroupRow[] = raw.map(g => ({
        id: g.id,
        name: g.name,
        memberCount: g.members.length,
        memberNames: g.members,
        chapterId: null,
      }))
      setGroups(rows.length ? rows : MOCK_GROUPS)
    } catch {
      setGroups(MOCK_GROUPS)
    }
    setLoading(false)
    setStep(1)
  }

  // ── Step 1 actions ────────────────────────────────────────────────────────

  const assignChapter = (groupId: string, chapterId: string | null) => {
    setGroups(gs => gs.map(g => g.id === groupId ? { ...g, chapterId } : g))
  }

  const assignedCount = groups.filter(g => g.chapterId !== null).length

  const handleBuildCrew = () => {
    const seen = new Set<string>()
    const crew: CrewMember[] = []

    for (const group of groups.filter(g => g.chapterId !== null)) {
      for (const jid of group.memberNames) {
        const key = jid.includes('@') ? jid : jid.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        crew.push({
          id: `${group.chapterId!}-${slugify(jid)}`,
          name: jid.includes('@') ? jidToName(jid) : jid,
          whatsappJid: jid,
          chapterId: group.chapterId!,
          selected: true,
        })
      }
    }

    setMembers(crew)
    setStep(2)
  }

  // ── Step 2 actions ────────────────────────────────────────────────────────

  const toggleMember  = (id: string) => setMembers(ms => ms.map(m => m.id === id ? { ...m, selected: !m.selected } : m))
  const selectAll     = () => setMembers(ms => ms.map(m => ({ ...m, selected: true  })))
  const deselectAll   = () => setMembers(ms => ms.map(m => ({ ...m, selected: false })))
  const selectedCount = members.filter(m => m.selected).length

  const handleComplete = async () => {
    setSaving(true)
    try {
      const toSave = members.filter(m => m.selected)
      await Promise.all(
        toSave.map(m => {
          const contact: Contact = {
            id:         m.id,
            name:       m.name,
            whatsappId: m.whatsappJid,
            chapterIds: [m.chapterId],
            tier:       'warm' as WarmthTier,
            createdAt:  new Date().toISOString(),
          }
          return window.loop.contacts.save(contact)
        })
      )
      onComplete()
    } catch {
      setSaving(false)
    }
  }

  // ── Shared layout ─────────────────────────────────────────────────────────

  const centered: React.CSSProperties = {
    height: '100%', overflowY: 'auto', background: 'var(--bg)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  }

  const panel: React.CSSProperties = {
    width: '100%', maxWidth: 560, padding: '48px 0 64px',
  }

  const eyebrow: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.1em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    fontWeight: 600, marginBottom: 20,
  }

  const skipBtn = (
    <button
      type="button"
      onClick={onSkip}
      style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
    >
      Skip for now
    </button>
  )

  // ── Step 0: Permission gate ───────────────────────────────────────────────

  if (step === 0) return (
    <div style={centered}>
      <div style={panel}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Step 3 of 5
        </div>
        <div style={eyebrow}>Your crew</div>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 600,
          color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 14,
        }}>
          Your people are already<br />in your groups.
        </div>
        <p style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-secondary)',
          lineHeight: 1.65, marginBottom: 40, maxWidth: 400,
        }}>
          Loop can scan your WhatsApp groups and pull in your people,
          sorted by chapter, ready to tend to.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          <Button size="lg" disabled={loading} onClick={handleScanGroups}>
            {loading ? 'Scanning…' : 'Scan my groups'}
          </Button>
          {skipBtn}
        </div>
      </div>
    </div>
  )

  // ── Step 1: Group → chapter assignment ────────────────────────────────────

  if (step === 1) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 560, padding: '48px 0 32px' }}>
          <div style={{ marginBottom: 32 }}>
            <ProgressDots total={2} current={0} />
          </div>
          <div style={eyebrow}>Loop found {groups.length} groups</div>
          <div style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 30, fontWeight: 600,
            color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.22, marginBottom: 10,
          }}>
            Which chapters do these belong to?
          </div>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)',
            lineHeight: 1.65, marginBottom: 28, maxWidth: 420,
          }}>
            Assign each group to a chapter. Anyone in an assigned group will show up in Your Loop.
          </p>
          <PaperCard raised padding={0} style={{ overflow: 'visible' }}>
            {groups.map((group, i) => (
              <GroupRow
                key={group.id}
                group={group}
                chapters={chapters}
                onAssign={assignChapter}
                isLast={i === groups.length - 1}
              />
            ))}
          </PaperCard>
        </div>
      </div>
      <div style={{
        flexShrink: 0, borderTop: '1px solid var(--border-light)',
        background: 'var(--bg)', padding: '16px 0',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          width: '100%', maxWidth: 560,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {skipBtn}
          <Button disabled={assignedCount === 0} onClick={handleBuildCrew}>
            Add {assignedCount > 0 ? assignedCount : ''}{' '}
            {assignedCount === 1 ? 'group' : 'groups'} →
          </Button>
        </div>
      </div>
    </div>
  )

  // ── Step 2: Contact confirmation grid ─────────────────────────────────────

  const byChapter = chapters
    .map(ch => ({ chapter: ch, crew: members.filter(m => m.chapterId === ch.id) }))
    .filter(g => g.crew.length > 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 560, padding: '48px 0 32px' }}>
          <div style={{ marginBottom: 32 }}>
            <ProgressDots total={2} current={1} />
          </div>
          <div style={eyebrow}>{members.length} people found</div>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 600,
            color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.22, marginBottom: 10,
          }}>
            Your crew.
          </div>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)',
            lineHeight: 1.65, marginBottom: 36, maxWidth: 420,
          }}>
            Tap anyone to remove them. Everyone else shows up in Your Loop.
          </p>

          {byChapter.map(({ chapter, crew }) => (
            <div key={chapter.id} style={{ marginBottom: 36 }}>
              <div style={{
                fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600,
                color: 'var(--text-secondary)', letterSpacing: '-0.01em',
                paddingBottom: 10, marginBottom: 12,
                borderBottom: '1px solid var(--border-light)',
              }}>
                {chapter.name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {crew.map(member => (
                  <AvatarCell
                    key={member.id}
                    member={member}
                    onToggle={() => toggleMember(member.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{
        flexShrink: 0, borderTop: '1px solid var(--border-light)',
        background: 'var(--bg)', padding: '16px 0',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          width: '100%', maxWidth: 560,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <button type="button" onClick={selectAll}
              style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
              Select all
            </button>
            <button type="button" onClick={deselectAll}
              style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
              Deselect all
            </button>
          </div>
          <Button disabled={selectedCount === 0 || saving} onClick={handleComplete}>
            {saving
              ? 'Saving…'
              : `Add ${selectedCount} ${selectedCount === 1 ? 'person' : 'people'} to Your Loop →`}
          </Button>
        </div>
      </div>
    </div>
  )
}
