import React, { useState } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children?: React.ReactNode
  style?: React.CSSProperties
  'data-testid'?: string
}

const sizeTokens = {
  sm: { height: '28px', padding: '0 14px', fontSize: '13px', gap: '6px' },
  md: { height: '36px', padding: '0 20px', fontSize: '14px', gap: '8px' },
  lg: { height: '44px', padding: '0 26px', fontSize: '15px', gap: '10px' },
}

function getVariantStyle(variant: ButtonVariant, hovered: boolean): React.CSSProperties {
  if (variant === 'primary') {
    return {
      background: hovered ? 'var(--accent-hover)' : 'var(--accent)',
      color: 'var(--text-on-accent)',
      border: 'none',
    }
  }
  if (variant === 'secondary') {
    return {
      background: hovered ? 'var(--surface-raised)' : 'var(--surface)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    }
  }
  return {
    background: hovered ? 'var(--surface)' : 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  disabled,
  type = 'button',
  onClick,
  children,
  style,
  'data-testid': dataTestId,
}: ButtonProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const sz = sizeTokens[size]

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      data-testid={dataTestId}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sz.gap,
        height: sz.height,
        padding: sz.padding,
        borderRadius: 'var(--radius-full)',
        fontFamily: 'var(--font-sans)',
        fontSize: sz.fontSize,
        fontWeight: 'var(--weight-semibold)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `background var(--duration-fast) var(--ease-out)`,
        whiteSpace: 'nowrap',
        lineHeight: 1,
        ...getVariantStyle(variant, hovered && !disabled),
        ...style,
      }}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  )
}
