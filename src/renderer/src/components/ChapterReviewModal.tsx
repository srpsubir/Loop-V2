// MAV-260: lightweight returning-user chapter review — opened from a tap on
// the "Rescan my groups" toast or a sidebar badge, NOT a nav.screen route.
// App chrome stays visible behind this overlay; deliberately not a full-screen
// takeover like first-run onboarding (ChapterInferenceScreen).
import React, { useEffect, useState } from 'react'
import type { ChapterCandidate } from '@shared/types'
import { ChapterNamingScreen } from '../screens/ChapterNamingScreen'

type CSS = React.CSSProperties

interface Props {
  candidates: ChapterCandidate[]
  onClose: () => void
  onConfirmed: () => void
}

function CandidateRow({ candidate, onConfirm, onSkip }: {
  candidate: ChapterCandidate; onConfirm: () => void; onSkip: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        borderRadius: 'var(--radius-lg)', background: hov ? 'var(--surface)' : 'transparent',
        transition: 'background var(--duration-fast) var(--ease-out)',
      } as CSS}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: 'var(--text-primary)' }}>
          {candidate.name}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          {candidate.memberCount} {candidate.memberCount === 1 ? 'person' : 'people'}{candidate.active ? ' · ongoing' : ' · past'}
        </div>
      </div>
      <button type="button" onClick={onSkip} style={{
        height: 32, padding: '0 14px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
        color: 'var(--text-muted)', background: 'transparent', border: 'none', borderRadius: 'var(--radius-full)', cursor: 'pointer',
      } as CSS}>Not this</button>
      <button type="button" onClick={onConfirm} style={{
        height: 32, padding: '0 16px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
        color: 'var(--text-on-accent)', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-full)', cursor: 'pointer',
      } as CSS}>This is one</button>
    </div>
  )
}

export function ChapterReviewModal({ candidates, onClose, onConfirmed }: Props) {
  // Snapshot at open time — per the spec's edge-case note, a background
  // rescan completing mid-review must not reshuffle an in-progress list.
  const [remaining, setRemaining] = useState<ChapterCandidate[]>(candidates)
  const [naming, setNaming] = useState<ChapterCandidate | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !naming) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [naming, onClose])

  const handleSkip = (candidate: ChapterCandidate) => {
    window.loop.chapters.dismissCandidate(candidate.waJid).catch(() => {})
    setRemaining((prev) => prev.filter((c) => c.waJid !== candidate.waJid))
  }

  const handleConfirmName = (name: string) => {
    if (!naming) return
    // chapters:confirm already dedupes against state.chapters by id — safe
    // to call per-candidate rather than batching, keeps this flow simple.
    window.loop.chapters.confirm([naming.waJid]).then(() => {
      if (name !== naming.name) return window.loop.chapters.setName(
        naming.waJid.replace(/@g\.us$/, '').replace(/[^a-z0-9]+/gi, '-'), name
      )
    }).catch(() => {})
    setRemaining((prev) => prev.filter((c) => c.waJid !== naming.waJid))
    setNaming(null)
    onConfirmed()
  }

  if (naming) {
    return (
      <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(42,31,27,0.32)', backdropFilter: 'saturate(1.05) blur(1px)' }}>
        <div role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: 480, height: 440, background: 'var(--bg)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
          <ChapterNamingScreen
            candidate={naming}
            index={0}
            total={1}
            onConfirm={handleConfirmName}
            onSkip={() => { handleSkip(naming); setNaming(null) }}
          />
        </div>
      </div>
    )
  }

  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(42,31,27,0.32)', backdropFilter: 'saturate(1.05) blur(1px)' }}
    >
      <div role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 4 }}>
          We found new chapters
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          A few groups look like they could be chapters. Review whenever you like — nothing here is saved until you say so.
        </div>

        {remaining.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
            All reviewed.
          </div>
        ) : (
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {remaining.map((c) => (
              <CandidateRow key={c.waJid} candidate={c} onSkip={() => handleSkip(c)} onConfirm={() => setNaming(c)} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{
            height: 36, padding: '0 18px', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
            color: 'var(--accent)', background: 'transparent', border: 'none', borderRadius: 'var(--radius-full)', cursor: 'pointer',
          } as CSS}>Done for now</button>
        </div>
      </div>
    </div>
  )
}
