import React from 'react'
import type { WarmthTier } from '@shared/types'

interface ContactTierIndicatorProps {
  tier: WarmthTier
  name: string
  size?: number
  fading?: boolean
  src?: string
  daysOverdue?: number
}

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function ContactTierIndicator({
  tier,
  name,
  size,
  fading = false,
  src,
  daysOverdue,
}: ContactTierIndicatorProps) {
  const isClose = tier === 'close'
  const avatarSize = size ?? (isClose ? 56 : 48)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      opacity: fading ? 0.55 : (isClose ? 1 : 0.85),
    }}>

      {/* Avatar */}
      <div style={{
        width: avatarSize,
        height: avatarSize,
        borderRadius: '50%',
        background: src ? 'transparent' : (isClose ? 'rgba(184,98,74,0.18)' : 'rgba(163,143,133,0.15)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {src ? (
          <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: isClose ? 18 : 16,
            fontWeight: isClose ? 600 : 500,
            color: isClose ? '#B8624A' : '#A38F85',
            letterSpacing: '0.01em',
            userSelect: 'none',
          }}>
            {toInitials(name)}
          </span>
        )}
      </div>

      {/* Close-tier dot — only when not fading (fading uses terracotta ring in Avatar) */}
      {isClose && !fading && (
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#B8624A',
          marginTop: -2,
        }} />
      )}

      {/* Name */}
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: isClose ? 13 : 12,
        fontWeight: isClose ? 600 : 400,
        color: isClose ? 'var(--text-primary)' : 'var(--text-secondary)',
        textAlign: 'center',
        lineHeight: 1.3,
        maxWidth: 68,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name.split(' ')[0]}
      </div>

      {daysOverdue !== undefined && (
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 10,
          color: daysOverdue >= 30 ? '#C4613C' : '#9B8B82',
          marginTop: -2,
          textAlign: 'center',
        }}>
          {daysOverdue}d
        </div>
      )}
    </div>
  )
}
