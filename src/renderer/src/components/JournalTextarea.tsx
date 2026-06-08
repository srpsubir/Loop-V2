import React, { useState } from 'react'

interface JournalTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  autoFocus?: boolean
}

export function JournalTextarea({
  value,
  onChange,
  placeholder,
  rows = 5,
  autoFocus,
}: JournalTextareaProps): React.JSX.Element {
  const [focused, setFocused] = useState(false)

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      autoFocus={autoFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        resize: 'none',
        background: 'var(--surface)',
        border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border-light)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '16px 18px',
        fontFamily: 'var(--font-sans)',
        fontSize: 15,
        color: 'var(--text-primary)',
        lineHeight: 1.7,
        outline: 'none',
        transition: `border-color var(--duration-fast) var(--ease-out)`,
        boxSizing: 'border-box',
      }}
    />
  )
}
