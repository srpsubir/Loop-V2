import React from 'react'

type AvatarRing = 'none' | 'sage' | 'terracotta'

interface AvatarProps {
  src?: string
  name?: string
  size?: number
  ring?: AvatarRing
  style?: React.CSSProperties
}

function nameToHue(name: string): string {
  // Deterministic warm color from name
  const palette = ['#C49A8A', '#B8624A', '#6A9470', '#A38F85', '#D4856E', '#8B6A5E']
  const idx = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length
  return palette[idx]
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export function Avatar({ src, name = '', size = 44, ring = 'none', style }: AvatarProps): React.JSX.Element {
  const ringColor =
    ring === 'sage' ? 'var(--positive)' : ring === 'terracotta' ? 'var(--accent)' : 'transparent'
  const ringStyle: React.CSSProperties =
    ring !== 'none'
      ? { boxShadow: `0 0 0 2px var(--bg), 0 0 0 4px ${ringColor}` }
      : {}

  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'block',
    flexShrink: 0,
    ...ringStyle,
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ ...base, objectFit: 'cover', ...style }}
      />
    )
  }

  return (
    <div
      style={{
        ...base,
        background: nameToHue(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: size * 0.37,
        fontWeight: 600,
        color: '#FBF7F0',
        userSelect: 'none',
        ...style,
      }}
    >
      {initials(name)}
    </div>
  )
}
