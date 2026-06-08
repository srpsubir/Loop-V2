import React from 'react'

type TagTone = 'neutral' | 'chapter' | 'people' | 'positive'

interface TagProps {
  children?: React.ReactNode
  tone?: TagTone
  icon?: React.ReactNode
  style?: React.CSSProperties
}

const toneBg: Record<TagTone, string> = {
  neutral: 'var(--surface-raised)',
  chapter: 'var(--surface)',
  people: 'var(--people-faint)',
  positive: 'var(--positive-faint)',
}

const toneColor: Record<TagTone, string> = {
  neutral: 'var(--text-muted)',
  chapter: 'var(--text-muted)',
  people: 'var(--people)',
  positive: 'var(--positive)',
}

export function Tag({ children, tone = 'neutral', icon, style }: TagProps): React.JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        background: toneBg[tone],
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 500,
        color: toneColor[tone],
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  )
}
