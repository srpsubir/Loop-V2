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
  const palette = ['var(--people)', 'var(--accent)', 'var(--positive)', 'var(--text-muted)', 'var(--accent-light)', 'var(--text-secondary)']
  const idx = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length
  return palette[idx]
}

// Masked-phone/contact placeholders (e.g. "+56 9123 45678", produced when a
// real display name isn't known yet — see jidToName() in CrewDetectionScreen
// and the equivalent in ChapterInferenceScreen) always start with "+"; real
// human contact names never do. Running a masked string through the
// whitespace-split initials algorithm below produces garbage (e.g. "+9"),
// since it just takes the first character of each token — use a neutral
// placeholder instead.
export function safeInitials(name: string): string {
  if (name.startsWith('+')) return '•'
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
        color: 'var(--text-on-accent)',
        userSelect: 'none',
        ...style,
      }}
    >
      {safeInitials(name)}
    </div>
  )
}
