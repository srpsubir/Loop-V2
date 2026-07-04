import React, { useState } from 'react'

const SERIF = 'var(--font-serif)'
const SANS = 'var(--font-sans)'

export interface QuietDayCardProps {
  chapterName?: string
  yearsAgo?: number
  crewInitials?: string[]
  onClick?: () => void
}

export function QuietDayCard({ chapterName, yearsAgo, crewInitials, onClick }: QuietDayCardProps) {
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
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}
        style={{
          background: 'var(--surface-raised)',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: hovered && clickable
            ? '0 2px 8px rgba(26,16,12,0.10)'
            : '0 1px 4px rgba(26,16,12,0.07)',
          cursor: clickable ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'hidden',
          transition: 'box-shadow 150ms ease',
          boxSizing: 'border-box',
        } as React.CSSProperties}
      >
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: 'var(--accent)',
          borderRadius: '12px 0 0 12px',
        }} />

        <div style={{
          fontFamily: SANS,
          fontSize: 11,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          paddingLeft: 4,
        }}>
          {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago today
        </div>

        <h3 style={{
          fontFamily: SERIF,
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          margin: '8px 0 0 0',
          paddingLeft: 4,
        }}>
          {chapterName} started.
        </h3>

        {crewInitials && crewInitials.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, paddingLeft: 4 }}>
            {crewInitials.slice(0, 4).map((initial, i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'var(--surface-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 600,
                  marginLeft: i === 0 ? 0 : -8,
                  border: '2px solid var(--surface-raised)',
                  userSelect: 'none',
                } as React.CSSProperties}
              >
                {initial}
              </div>
            ))}
          </div>
        )}

        <p style={{
          fontFamily: SANS,
          fontSize: 13,
          fontStyle: 'italic',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          marginTop: 8,
          marginBottom: 0,
          paddingLeft: 4,
        }}>
          Your people from that chapter are still close.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--surface-raised)',
      borderRadius: 12,
      padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(26,16,12,0.07)',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
    } as React.CSSProperties}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: 'var(--accent)',
        borderRadius: '12px 0 0 12px',
      }} />

      <h3 style={{
        fontFamily: SERIF,
        fontSize: 20,
        fontStyle: 'italic',
        fontWeight: 400,
        color: 'var(--text-secondary)',
        lineHeight: 1.3,
        margin: 0,
        paddingLeft: 4,
      }}>
        A quiet day.
      </h3>
      <p style={{
        fontFamily: SANS,
        fontSize: 13,
        color: 'var(--text-muted)',
        lineHeight: 1.55,
        marginTop: 6,
        marginBottom: 0,
        paddingLeft: 4,
      }}>
        Nothing needs your attention today.
      </p>
    </div>
  )
}
