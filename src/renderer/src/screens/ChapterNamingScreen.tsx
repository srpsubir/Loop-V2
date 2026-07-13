import React, { useState } from 'react'
import type { ChapterCandidate } from '@shared/types'

interface Props {
  candidate: ChapterCandidate
  index: number
  total: number
  onConfirm: (name: string) => void
  onSkip: () => void
}

const PALETTE = ['#C49A8A', '#D4856E', '#6A9470', '#B8624A', '#A38F85']

export function ChapterNamingScreen({ candidate, index, total, onConfirm, onSkip }: Props) {
  const [name, setName] = useState(candidate.name)

  const avatarJids = candidate.memberJids.slice(0, 4)
  const overflow = candidate.memberCount - avatarJids.length

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        padding: '0 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
      }}>

        {/* Progress */}
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          {index + 1} of {total}
        </div>

        {/* Avatar stack */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {avatarJids.map((jid, i) => (
            <div
              key={jid}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: PALETTE[i % PALETTE.length],
                border: '2.5px solid var(--bg)',
                marginLeft: i ? -16 : 0,
                position: 'relative',
                zIndex: avatarJids.length - i,
                flexShrink: 0,
              }}
            />
          ))}
          {overflow > 0 && (
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--surface)',
              border: '2.5px solid var(--bg)',
              marginLeft: -16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}>
              +{overflow}
            </div>
          )}
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            marginBottom: 8,
          }}>
            What do you call this chapter?
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            {candidate.memberCount} {candidate.memberCount === 1 ? 'person' : 'people'}
            {candidate.active ? ', ongoing' : ', past'}
          </div>
        </div>

        {/* Name input */}
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onConfirm(name.trim())
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--text-primary)',
            textAlign: 'center',
            background: 'transparent',
            border: 'none',
            borderBottom: '2px solid var(--border)',
            padding: '8px 0',
            outline: 'none',
            letterSpacing: '-0.01em',
          }}
        />

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => { if (name.trim()) onConfirm(name.trim()) }}
            style={{
              width: '100%',
              height: 48,
              background: name.trim() ? 'var(--accent)' : 'var(--border)',
              color: name.trim() ? '#F9F5EE' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              fontWeight: 600,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
            }}
          >
            Name it
          </button>
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            Skip for now
          </button>
        </div>

      </div>
    </div>
  )
}
