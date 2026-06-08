import React from 'react'

interface SegmentedControlProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  style?: React.CSSProperties
}

export function SegmentedControl({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps): React.JSX.Element {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 3,
        gap: 2,
        ...style,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: '6px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: value === opt ? 600 : 400,
            cursor: 'pointer',
            transition: `background var(--duration-fast) var(--ease-out)`,
            background: value === opt ? 'var(--bg)' : 'transparent',
            color: value === opt ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: value === opt ? 'var(--shadow-sm)' : 'none',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
