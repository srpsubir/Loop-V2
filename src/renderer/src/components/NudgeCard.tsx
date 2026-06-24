import React, { useState } from 'react'

interface NudgeCardProps {
  contactName: string
  contactInitials: string
  nudgeText: string
  onMessage: () => void
  onDismiss: () => void
}

export function NudgeCard({ contactName, contactInitials, nudgeText, onMessage, onDismiss }: NudgeCardProps) {
  const [hovMsg, setHovMsg] = useState(false)
  const [hovDismiss, setHovDismiss] = useState(false)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: 16,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 1px 4px rgba(42,31,27,0.06)',
    }}>
      {/* Avatar */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'rgba(184,98,74,0.14)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--accent)',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {contactInitials}
        </span>
      </div>

      {/* Text + actions */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}>
          {contactName}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontStyle: 'italic',
          color: 'var(--text-secondary)',
          marginTop: 3,
          lineHeight: 1.45,
        }}>
          {nudgeText}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <button
            onClick={onMessage}
            onMouseEnter={() => setHovMsg(true)}
            onMouseLeave={() => setHovMsg(false)}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: '#F9F5EE',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '7px 14px',
              cursor: 'pointer',
              opacity: hovMsg ? 0.88 : 1,
              transition: 'opacity 120ms ease',
            }}
          >
            Message on WhatsApp
          </button>
          <button
            onClick={onDismiss}
            onMouseEnter={() => setHovDismiss(true)}
            onMouseLeave={() => setHovDismiss(false)}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 400,
              color: hovDismiss ? 'var(--text-secondary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              padding: '7px 0',
              cursor: 'pointer',
              transition: 'color 120ms ease',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
