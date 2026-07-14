import React, { useEffect, useState } from 'react'

interface Props {
  onDone: (email: string | null) => void
}

const SERIF = 'var(--font-serif)'
const SANS = 'var(--font-sans)'

export function OnboardingGoogleSignInScreen({ onDone }: Props) {
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Pull first name from WhatsApp creds — available in memory by this point
  useEffect(() => {
    window.loop.state.get().then((s) => {
      // whatsappDisplayName isn't a field on AppState — nothing currently
      // writes it, so this personalization is inert until that's wired up.
      // Cast is deliberately widened via unknown; falls back to generic copy.
      const name = (s as unknown as Record<string, unknown>).whatsappDisplayName as string | undefined
      if (name) setDisplayName(name.split(' ')[0])
    }).catch(() => {})
  }, [])

  const headline = displayName ? `Almost there, ${displayName}.` : 'Almost there.'

  const handleGoogleSignIn = async () => {
    if (loading) return
    setLoading(true)
    try {
      const result = await window.loop.account.signInWithGoogle()
      // account:signInWithGoogle's IPC handler already persists email/googleId
      // itself (main-process write, bypassing the renderer allowlist by
      // design). Re-sending them here used to include disallowed keys in this
      // renderer-side patch, which silently rejects the *entire* patch
      // (RENDERER_PATCH_ALLOWLIST) — including emailCaptured, so a genuinely
      // successful sign-in was never remembered and this screen would
      // resurface on every future launch. Patch only the one allowlisted key.
      await window.loop.state.patch({ emailCaptured: true })
      onDone(result?.email ?? null)
    } catch {
      onDone(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    await window.loop.state.patch({ emailCaptured: true }).catch(() => {})
    onDone(null)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      {/* Content column */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 0,
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--accent)',
            marginBottom: 20,
          }}
        >
          Loop
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: '0 0 14px',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
          }}
        >
          {headline}
        </h1>

        {/* Subline */}
        <p
          style={{
            fontFamily: SANS,
            fontSize: 15,
            fontWeight: 400,
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            margin: '0 0 32px',
            maxWidth: 320,
          }}
        >
          Your people are waiting. One tap to get started.
        </p>

        {/* Google Sign-In button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 1px 2px rgba(26,16,12,0.05)',
            transition: 'box-shadow 120ms ease, opacity 120ms ease',
            marginBottom: 16,
          }}
          onMouseEnter={(e) => {
            if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(26,16,12,0.12)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 2px rgba(26,16,12,0.05)'
          }}
        >
          {/* Google G logo */}
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span
            style={{
              fontFamily: SANS,
              fontSize: 15,
              fontWeight: 500,
              // Fixed, not themed: this button is always white per Google's
              // Sign-In branding guidelines, so its label can't use
              // --text-primary (which flips light in dark mode and would be
              // near-invisible against the button's fixed white background).
              color: '#3C4043',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </span>
        </button>

        {/* Skip */}
        <button
          onClick={handleSkip}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--text-muted)',
            padding: '4px 8px',
            transition: 'opacity 120ms ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}
