import React, { useState } from 'react'
import { Loader2, Pencil, Check, Plus } from 'lucide-react'
import { Button, IconButton, PaperCard, ProgressDots, JournalTextarea, AckLine } from '../components'
import type { Chapter } from '@shared/types'

interface ChapterInferenceScreenProps {
  onComplete: () => void
  onSkip: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAckLine(answer: string, questionIndex: number): string {
  const first = answer.split(/[,\n]/)[0]?.trim() ?? ''
  if (questionIndex === 1) {
    if (first.length > 1 && first.length < 40) return `${first} — places like that shape a person.`
    return 'Places really do leave their mark.'
  }
  if (first.length > 1 && first.length < 40) return `${first} — that's a chapter in itself.`
  return "That's a rich story so far."
}

async function inferChapters(q1: string, q2: string, q3: string): Promise<Chapter[]> {
  const system = `You are a life chapter inference engine for Loop, a personal relationship memory app.
Extract 2–5 meaningful life chapters from the answers.
Return ONLY a valid JSON array, no other text:
[{"name":"Edinburgh years","location":"Edinburgh, UK","startYear":2014,"endYear":2016,"active":false}]
Rules:
- Name chapters warmly and specifically — never generic labels like "Work" or "School"
- Include startYear/endYear only when clearly inferrable
- The most recent/current period must have "active": true
- Minimum 2 chapters, maximum 5`

  const user = `Where they've lived: ${q1}
Where they studied: ${q2}
Where they've worked: ${q3}`

  try {
    const raw = await window.loop.claude.ask(system, user)
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return fallback()
    const parsed = JSON.parse(match[0]) as Array<{
      name: string; location?: string; startYear?: number; endYear?: number; active?: boolean
    }>
    return parsed.map((c, i) => ({
      id: `ch-${Date.now()}-${i}`,
      name: c.name,
      location: c.location,
      startYear: c.startYear,
      endYear: c.endYear,
      active: c.active ?? i === parsed.length - 1,
    }))
  } catch {
    return fallback()
  }
}

function fallback(): Chapter[] {
  return [
    { id: `ch-${Date.now()}-0`, name: 'Early years', active: false },
    { id: `ch-${Date.now()}-1`, name: 'Current chapter', active: true },
  ]
}

// ─── Chapter card (preview step) ─────────────────────────────────────────────

function ChapterCard({
  chapter,
  onRename,
}: {
  chapter: Chapter
  onRename: (id: string, name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(chapter.name)

  const commit = () => {
    if (draft.trim()) onRename(chapter.id, draft.trim())
    setEditing(false)
  }

  const yearRange = chapter.startYear && chapter.endYear
    ? `${chapter.startYear} – ${chapter.endYear}`
    : chapter.startYear
      ? `${chapter.startYear} – present`
      : chapter.active ? 'Ongoing' : ''

  return (
    <PaperCard padding={16} style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--text-primary)',
                border: 'none',
                borderBottom: '1.5px solid var(--accent)',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                padding: '2px 0',
              }}
            />
          ) : (
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
              {chapter.name}
            </div>
          )}
          {yearRange && (
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {yearRange}
              {chapter.location && ` · ${chapter.location}`}
            </div>
          )}
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          label={editing ? 'Save name' : 'Rename chapter'}
          icon={editing
            ? <Check size={14} strokeWidth={2} />
            : <Pencil size={14} strokeWidth={1.8} />
          }
          onClick={() => editing ? commit() : setEditing(true)}
        />
      </div>
    </PaperCard>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function ChapterInferenceScreen({ onComplete, onSkip }: ChapterInferenceScreenProps) {
  const [step, setStep] = useState(0)
  const [q1, setQ1] = useState('')
  const [q2, setQ2] = useState('')
  const [q3, setQ3] = useState('')
  const [ack1, setAck1] = useState('')
  const [ack2, setAck2] = useState('')
  const [inferring, setInferring] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [saving, setSaving] = useState(false)

  const advanceToQ2 = () => { setAck1(makeAckLine(q1, 1)); setStep(2) }
  const advanceToQ3 = () => { setAck2(makeAckLine(q2, 2)); setStep(3) }

  const advanceToPreview = async () => {
    setStep(4)
    setInferring(true)
    const result = await inferChapters(q1, q2, q3)
    setChapters(result)
    setInferring(false)
  }

  const renameChapter = (id: string, name: string) => {
    setChapters((cs) => cs.map((c) => c.id === id ? { ...c, name } : c))
  }

  const addChapter = () => {
    setChapters((cs) => [
      ...cs,
      { id: `ch-${Date.now()}`, name: 'New chapter', active: false },
    ])
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      await window.loop.state.patch({ chapters, onboardingComplete: true })
      onComplete()
    } catch {
      setSaving(false)
    }
  }

  const centered: React.CSSProperties = {
    height: '100%',
    overflowY: 'auto',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const panel: React.CSSProperties = {
    width: '100%',
    maxWidth: 560,
    padding: '48px 0 64px',
  }

  const skipBtn = (
    <button
      type="button"
      onClick={onSkip}
      style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', marginTop: 16 }}
    >
      Skip for now
    </button>
  )

  // ── Step 0: Intro ──────────────────────────────────────────────────────────
  if (step === 0) return (
    <div style={centered}>
      <div style={panel}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 20 }}>
          Setting up your garden
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 14 }}>
          Let's map the chapters<br />of your life.
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 40, maxWidth: 420 }}>
          Just three questions. Tell me in your own words — no forms, no lists.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          <Button size="lg" onClick={() => setStep(1)}>Begin</Button>
          {skipBtn}
        </div>
      </div>
    </div>
  )

  // ── Step 1: Q1 — Where have you lived? ────────────────────────────────────
  if (step === 1) return (
    <div style={centered}>
      <div style={panel}>
        <div style={{ marginBottom: 32 }}>
          <ProgressDots total={3} current={0} />
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 32, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 10 }}>
          Where have you lived?
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
          Cities, countries — anywhere that shaped you. Don't overthink it.
        </div>
        <JournalTextarea
          value={q1}
          onChange={setQ1}
          placeholder="London, Edinburgh, maybe a stint abroad…"
          rows={5}
          autoFocus
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginTop: 24 }}>
          <Button disabled={!q1.trim()} onClick={advanceToQ2}>Continue →</Button>
          {skipBtn}
        </div>
      </div>
    </div>
  )

  // ── Step 2: Q2 — Where did you study? ─────────────────────────────────────
  if (step === 2) return (
    <div style={centered}>
      <div style={panel}>
        <div style={{ marginBottom: 32 }}>
          <ProgressDots total={3} current={1} />
        </div>
        <AckLine>{ack1}</AckLine>
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 32, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 10 }}>
          Where did you study?
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
          University, college, a course that changed things — anything counts.
        </div>
        <JournalTextarea
          value={q2}
          onChange={setQ2}
          placeholder="University of Edinburgh, 2014–2016…"
          rows={5}
          autoFocus
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginTop: 24 }}>
          <Button disabled={!q2.trim()} onClick={advanceToQ3}>Continue →</Button>
          {skipBtn}
        </div>
      </div>
    </div>
  )

  // ── Step 3: Q3 — And work? ─────────────────────────────────────────────────
  if (step === 3) return (
    <div style={centered}>
      <div style={panel}>
        <div style={{ marginBottom: 32 }}>
          <ProgressDots total={3} current={2} />
        </div>
        <AckLine>{ack2}</AckLine>
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 32, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 10 }}>
          And work — where have you spent your working years?
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
          Companies, roles, cities. Rough years are fine.
        </div>
        <JournalTextarea
          value={q3}
          onChange={setQ3}
          placeholder="Deloitte London 2016–2019, then a startup in Berlin…"
          rows={5}
          autoFocus
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginTop: 24 }}>
          <Button disabled={!q3.trim()} onClick={advanceToPreview}>Continue →</Button>
          {skipBtn}
        </div>
      </div>
    </div>
  )

  // ── Step 4: Chapter preview ────────────────────────────────────────────────
  return (
    <div style={{ ...centered, justifyContent: 'flex-start' }}>
      <div style={{ ...panel, paddingTop: 64 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 14 }}>
          Here's what Loop found
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Your chapters.
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
          Loop inferred these from what you shared. Tap the pencil to rename any of them.
        </div>

        {inferring ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '40px 0', color: 'var(--text-muted)' }}>
            <Loader2 size={20} strokeWidth={1.8} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontStyle: 'italic' }}>Mapping your chapters…</span>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              {chapters.map((ch) => (
                <ChapterCard key={ch.id} chapter={ch} onRename={renameChapter} />
              ))}
            </div>
            <button
              type="button"
              onClick={addChapter}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 32, padding: 0 }}
            >
              <Plus size={14} strokeWidth={1.8} />
              Add a chapter
            </button>
            <Button size="lg" disabled={saving} onClick={handleComplete}>
              {saving ? 'Saving…' : 'These look right →'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
