import * as Sentry from '@sentry/electron/renderer'
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

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
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
          background: '#F9F5EE',
          fontFamily: 'system-ui, sans-serif',
          gap: 16,
        }}>
          <p style={{ fontSize: 15, color: '#6B5C55', margin: 0 }}>
            Something went wrong. Restart Loop to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              background: '#B8624A',
              color: '#F9F5EE',
              border: 'none',
              borderRadius: 999,
              fontSize: 14,
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
