import React from 'react'

interface AboutScreenProps {
  version: string
  onOpenPrivacyPolicy: () => void
  onClose: () => void
}

export function AboutScreen({ version, onOpenPrivacyPolicy, onClose }: AboutScreenProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(10,6,4,0.75)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560, maxWidth: '90vw',
          backgroundColor: 'var(--surface-raised)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          padding: '40px 48px 32px',
          backgroundImage: 'radial-gradient(120% 90% at 50% 40%, var(--accent-faint) 0%, transparent 55%)',
          color: 'var(--text-primary)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Loop mark + wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <LoopMark />
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', fontFamily: '"Inter", sans-serif', color: 'var(--text-primary)' }}>
            Loop
          </span>
        </div>

        {/* Founder letter */}
        <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)' }}>
          <p>
            In the last year and a half, two of my closest friends left Berlin.
            One to London, one back home. It sounds small. But it wasn't the
            first time. I have a long history of this: moving cities, chapters
            closing, good friendships quietly fading into nothing.
          </p>
          <p style={{ marginTop: 20 }}>
            I'm getting older. I have close friends on four continents, people
            I genuinely love, and I'm not doing right by most of them. Not for
            lack of caring. Just because life doesn't remind you, and days
            become months before you notice.
          </p>
          <p style={{ marginTop: 20 }}>
            Loop is my attempt to fix that. It learns who matters to you,
            notices when you're drifting, and nudges you before the gap gets
            too wide. No cold reminders. No contact management. Just a quiet
            hand on the shoulder.
          </p>

          {/* Sign-off */}
          <div style={{ marginTop: 32, fontSize: 13, color: 'var(--text-muted)' }}>
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Subir</p>
            <p>Founder, Loop</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center', fontSize: 11, opacity: 0.4, color: 'var(--text-primary)' }}>
          <span>Version {version}</span>
          <span style={{ margin: '0 8px' }}>·</span>
          <button
            onClick={onOpenPrivacyPolicy}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--accent)', opacity: 1, fontSize: 11, textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  )
}

function LoopMark() {
  return (
    <svg width="40" height="24" viewBox="0 0 48 28" fill="none" role="img" aria-label="Loop">
      <path
        d="M24 14c-3-4.4-5.6-8-10-8s-8 3.6-8 8 3.1 8 8 8c4.4 0 7-3.6 10-8 3-4.4 5.6-8 10-8s8 3.6 8 8-3.1 8-8 8c-4.4 0-7-3.6-10-8Z"
        style={{ stroke: 'var(--accent)' }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </svg>
  )
}
