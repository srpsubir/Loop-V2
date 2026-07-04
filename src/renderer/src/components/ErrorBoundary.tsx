import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(_error: Error, _info: React.ErrorInfo): void {
    // No telemetry — Loop is local-first, no data leaves the device.
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          fontFamily: 'var(--font-sans)',
          gap: 16,
        }}>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
            Loop hit an unexpected error. Your data is safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              background: 'var(--accent)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            Restart
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
