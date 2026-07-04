import React from 'react'

interface ProgressDotsProps {
  total: number
  current: number // 0-indexed
}

export function ProgressDots({ total, current }: ProgressDotsProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            width: i === current ? 20 : 7,
            height: 7,
            borderRadius: 'var(--radius-full)',
            background: i === current ? 'var(--accent)' : 'var(--border)',
            transition: `width var(--duration-normal) var(--ease-out), background var(--duration-normal) var(--ease-out)`,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}
