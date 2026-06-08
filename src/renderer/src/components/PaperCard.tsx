import React, { useState } from 'react'

interface PaperCardProps {
  children?: React.ReactNode
  raised?: boolean
  interactive?: boolean
  padding?: number
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  style?: React.CSSProperties
}

export function PaperCard({
  children,
  raised,
  interactive,
  padding = 20,
  onClick,
  style,
}: PaperCardProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
      style={{
        background: raised ? 'var(--surface)' : 'var(--bg)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        padding,
        cursor: interactive ? 'pointer' : 'default',
        transform: interactive && hovered ? 'translateY(-1px)' : 'none',
        transition: `box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
