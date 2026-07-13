// MAV-49 — polaroid memory card for the Your Loop screen
import React, { useState } from 'react'

type CSS = React.CSSProperties

const WARM_FILTER = 'sepia(.32) saturate(1.05) hue-rotate(-8deg)'

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.startsWith('+')
    ? '•'
    : name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const tints = ['var(--people)', 'var(--accent-light)', 'var(--positive)', 'var(--people)', 'var(--accent)']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return (
    <div style={{
      width: size, height: size, borderRadius: 'var(--radius-full)', flex: 'none',
      background: tints[h % tints.length], color: 'var(--text-on-accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', fontWeight: 600,
      fontSize: Math.round(size * 0.38), letterSpacing: '0.01em',
      boxShadow: 'var(--shadow-sm)',
    }}>{initials}</div>
  )
}

export interface OnThisDayPerson { id: string; name: string }

export interface OnThisDayProps {
  yearsAgo: number
  weekLabel: string
  flavourText: string
  person: OnThisDayPerson
  photoUrl?: string
  rotation?: number
  onClick?: () => void
}

export function OnThisDay({
  yearsAgo,
  weekLabel: _weekLabel,
  flavourText,
  person,
  photoUrl,
  rotation = -1.2,
  onClick,
}: OnThisDayProps) {
  const [hov, setHov] = useState(false)
  const W = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
  const eyebrow = `${W[yearsAgo - 1] || yearsAgo} ${yearsAgo === 1 ? 'year' : 'years'} ago today`

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 296,
        background: 'var(--surface-raised)',
        padding: '16px 16px 36px',
        borderRadius: 4,
        boxShadow: hov
          ? '0 6px 18px rgba(42,31,27,0.14), 0 24px 48px rgba(42,31,27,0.12)'
          : '0 3px 8px rgba(42,31,27,0.09), 0 14px 36px rgba(42,31,27,0.1)',
        transform: `rotate(${hov ? rotation * 0.5 : rotation}deg) translateY(${hov ? -4 : 0}px)`,
        transition: 'transform 200ms cubic-bezier(0.22,0.61,0.36,1), box-shadow 200ms cubic-bezier(0.22,0.61,0.36,1)',
        cursor: onClick ? 'pointer' : 'default',
      } as CSS}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="Memory" style={{
          width: '100%', height: 180, objectFit: 'cover',
          display: 'block', filter: WARM_FILTER, borderRadius: 2,
        }} />
      ) : (
        <div style={{
          width: '100%', height: 180, background: 'var(--surface)',
          borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </div>
      )}

      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
        letterSpacing: '.1em', textTransform: 'uppercase',
        color: 'var(--accent)', marginTop: 16,
      }}>
        {eyebrow}
      </div>

      <div style={{
        fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16,
        color: 'var(--text-primary)', lineHeight: 1.55,
        marginTop: 8, maxWidth: 240,
      }}>{flavourText}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14 }}>
        <Avatar name={person.name} size={28} />
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 13,
          color: 'var(--text-secondary)', lineHeight: 1.3,
        }}>{person.name}</div>
      </div>
    </div>
  )
}

export default OnThisDay
