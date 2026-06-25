import React, { useState } from 'react'

export interface QuietDayCardProps {
  chapterName?: string  // e.g. "Edinburgh" — triggers chapter-moment state
  yearsAgo?: number     // e.g. 3 — required when chapterName present
  onClick?: () => void  // optional: tap to open that chapter (State A only)
}

const SURFACE   = '#F0EBE3'
const HOVER_BG  = 'rgba(184,98,74,0.05)'

const cardBase: React.CSSProperties = {
  border:      '1px solid rgba(42,31,27,0.08)',
  borderRadius: 12,
  padding:     '20px 24px',
  maxWidth:    440,
  width:       '100%',
  boxSizing:   'border-box',
}

export function QuietDayCard({ chapterName, yearsAgo, onClick }: QuietDayCardProps) {
  const [hovered, setHovered] = useState(false)

  const isChapterMoment = Boolean(chapterName) && typeof yearsAgo === 'number'
  const clickable = isChapterMoment && typeof onClick === 'function'

  if (isChapterMoment) {
    return (
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? onClick : undefined}
        onMouseEnter={clickable ? () => setHovered(true) : undefined}
        onMouseLeave={clickable ? () => setHovered(false) : undefined}
        onKeyDown={clickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() }
        } : undefined}
        style={{
          ...cardBase,
          backgroundColor: clickable && hovered ? HOVER_BG : SURFACE,
          cursor: clickable ? 'pointer' : 'default',
        }}
      >
        <div style={{
          fontFamily:    'Inter, system-ui, sans-serif',
          fontSize:      11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color:         '#A38F85',
        }}>
          {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago
        </div>
        <h3 style={{
          fontFamily: 'Lora, Georgia, serif',
          fontSize:   20,
          fontWeight: 600,
          color:      '#2A1F1B',
          lineHeight: 1.2,
          margin:     '8px 0 0 0',
        }}>
          {chapterName} started.
        </h3>
        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   13,
          color:      '#6B5447',
          lineHeight: 1.55,
          marginTop:  6,
          marginBottom: 0,
        }}>
          Your people from that chapter are still close.
        </p>
      </div>
    )
  }

  return (
    <div style={{ ...cardBase, backgroundColor: SURFACE, cursor: 'default' }}>
      <h3 style={{
        fontFamily: 'Lora, Georgia, serif',
        fontSize:   20,
        fontStyle:  'italic',
        fontWeight: 400,
        color:      '#A38F85',
        lineHeight: 1.2,
        margin:     0,
      }}>
        A quiet day.
      </h3>
      <p style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   13,
        color:      '#6B5447',
        lineHeight: 1.55,
        marginTop:  6,
        marginBottom: 0,
      }}>
        Your people are close.
      </p>
    </div>
  )
}
