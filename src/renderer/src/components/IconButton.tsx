import React, { useState } from 'react'

type IconButtonSize = 'sm' | 'md' | 'lg'
type IconButtonVariant = 'ghost' | 'soft' | 'primary'

interface IconButtonProps {
  icon: React.ReactNode
  size?: IconButtonSize
  variant?: IconButtonVariant
  disabled?: boolean
  label?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  style?: React.CSSProperties
}

const dims = { sm: 28, md: 34, lg: 40 }

export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  disabled,
  label,
  onClick,
  style,
}: IconButtonProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const dim = dims[size]

  const bg =
    variant === 'ghost'
      ? hovered
        ? 'var(--surface)'
        : 'transparent'
      : variant === 'soft'
        ? hovered
          ? 'var(--surface-raised)'
          : 'var(--surface)'
        : hovered
          ? 'var(--accent-hover)'
          : 'var(--accent)'

  const color = variant === 'primary' ? 'var(--text-on-accent)' : 'var(--text-secondary)'

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: bg,
        color,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
        transition: `background var(--duration-fast) var(--ease-out)`,
        ...style,
      }}
    >
      {icon}
    </button>
  )
}
