import React, { useState } from 'react'

interface Props {
  onDone: (email: string | null) => void
}

const MAILERLITE_KEY = (import.meta as { env?: Record<string, string> }).env?.VITE_MAILERLITE_KEY ?? ''

async function subscribeToMailerLite(firstName: string, email: string): Promise<void> {
  if (!MAILERLITE_KEY) return
  await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MAILERLITE_KEY}`,
    },
    body: JSON.stringify({ email, fields: { name: firstName } }),
  })
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

export function EmailCaptureScreen({ onDone }: Props) {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = firstName.trim().length > 0 && isValidEmail(email)

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    try {
      await subscribeToMailerLite(firstName.trim(), email.trim())
      await window.loop.state.patch({ emailCaptured: true } as never)
    } catch {
      // Non-fatal — still proceed
    } finally {
      setSaving(false)
    }
    onDone(email.trim())
  }

  const handleSkip = async () => {
    try {
      await window.loop.state.patch({ emailCaptured: true } as never)
    } catch { /* pass */ }
    onDone(null)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        padding: '0 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
      }}>

        {/* Heading */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            marginBottom: 10,
          }}>
            One last thing.
          </div>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            margin: 0,
            maxWidth: 360,
          }}>
            If we want to reach you, where should we send you a note?
          </p>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            autoFocus
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              height: 46,
              padding: '0 16px',
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              color: 'var(--text-primary)',
              background: 'var(--surface)',
              border: '1.5px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              outline: 'none',
            }}
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              height: 46,
              padding: '0 16px',
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              color: 'var(--text-primary)',
              background: 'var(--surface)',
              border: '1.5px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              outline: 'none',
            }}
          />
          {error && (
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--accent)', marginTop: -4 }}>
              {error}
            </div>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
          <button
            type="button"
            disabled={!canSubmit || saving}
            onClick={handleSubmit}
            style={{
              width: '100%',
              height: 48,
              background: canSubmit ? 'var(--accent)' : 'var(--border)',
              color: canSubmit ? '#F9F5EE' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Keep me posted'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            Skip for now
          </button>
        </div>

      </div>
    </div>
  )
}
