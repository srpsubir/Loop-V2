import React from 'react'

interface AckLineProps {
  children: React.ReactNode
}

export function AckLine({ children }: AckLineProps): React.JSX.Element {
  return (
    <div
      style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 15,
        color: 'var(--accent)',
        marginBottom: 12,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  )
}
