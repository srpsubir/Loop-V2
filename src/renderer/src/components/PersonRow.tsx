import React, { useState } from 'react'
import { Avatar } from './Avatar'

type PersonRowRing = 'none' | 'sage' | 'terracotta'

interface PersonRowProps {
  name: string
  src?: string
  meta?: string
  note?: string
  ring?: PersonRowRing
  trailing?: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  style?: React.CSSProperties
}

export function PersonRow({
  name,
  src,
  meta,
  note,
  ring = 'none',
  trailing,
  onClick,
  style,
}: PersonRowProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => onClick && setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        cursor: onClick ? 'pointer' : 'default',
        background: hovered ? 'var(--surface)' : 'transparent',
        transition: `background var(--duration-fast) var(--ease-out)`,
        ...style,
      }}
    >
      <Avatar name={name} src={src} size={44} ring={ring} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
          }}
        >
          {name}
        </div>
        {(note || meta) && (
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 2,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {note ?? meta}
          </div>
        )}
      </div>
      {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
    </div>
  )
}
