import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

type ConnectionState =
  | { status: 'idle' }
  | { status: 'reconnecting'; attempt: number; maxAttempts: number; nextRetryIn?: number }
  | { status: 'failed'; errorCode?: number }
  | { status: 'protocol_error'; errorCode?: number; errorReason?: string }
  | { status: 'logged_out' }

interface ConnectionStatusBannerProps {
  onNavigateToQR?: () => void
}

export function ConnectionStatusBanner({ onNavigateToQR }: ConnectionStatusBannerProps): JSX.Element | null {
  const [state, setState] = useState<ConnectionState>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const offStatus = window.loop.whatsapp.onStatusChanged((status, metadata) => {
      setDismissed(false) // Reset dismissed state on new status change
      
      switch (status) {
        case 'reconnecting':
          setState({
            status: 'reconnecting',
            attempt: metadata?.attempt ?? 1,
            maxAttempts: metadata?.maxAttempts ?? 8,
            nextRetryIn: metadata?.nextRetryIn,
          })
          break
        case 'failed':
          setState({
            status: 'failed',
            errorCode: metadata?.errorCode,
          })
          break
        case 'protocol_error':
          setState({
            status: 'protocol_error',
            errorCode: metadata?.errorCode,
            errorReason: metadata?.errorReason,
          })
          break
        case 'logged_out':
          setState({ status: 'logged_out' })
          break
        case 'connected':
          // Auto-dismiss on reconnect
          setState({ status: 'idle' })
          break
        default:
          // Don't show banner for other states (disconnected, connecting, qr_pending)
          break
      }
    })

    return () => { offStatus() }
  }, [])

  if (state.status === 'idle' || dismissed) return null

  const handleRetry = async () => {
    try {
      await window.loop.whatsapp.start()
    } catch (err) {
      console.error('[ConnectionStatusBanner] Retry failed:', err)
    }
  }

  const handleScanQR = () => {
    if (onNavigateToQR) {
      onNavigateToQR()
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  // Banner styling based on state
  const getBannerStyle = () => {
    switch (state.status) {
      case 'reconnecting':
        return {
          background: '#F59E0B', // amber
          color: '#78350F', // amber-900
        }
      case 'failed':
        return {
          background: '#DC2626', // red
          color: '#FFFFFF',
        }
      case 'protocol_error':
        return {
          background: '#EA580C', // orange
          color: '#FFFFFF',
        }
      case 'logged_out':
        return {
          background: '#71717A', // neutral gray
          color: '#FFFFFF',
        }
      default:
        return {
          background: '#71717A',
          color: '#FFFFFF',
        }
    }
  }

  const bannerStyle = getBannerStyle()
  const isDismissible = state.status === 'failed' || state.status === 'protocol_error'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: bannerStyle.background,
        color: bannerStyle.color,
        fontSize: 13,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 9999,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ flex: 1 }}>
        {state.status === 'reconnecting' && (
          <span>
            Reconnecting to WhatsApp... (attempt {state.attempt} of {state.maxAttempts})
            {state.nextRetryIn && state.nextRetryIn > 0 && (
              <span style={{ opacity: 0.8, marginLeft: 8 }}>
                • Next retry in {Math.ceil(state.nextRetryIn / 1000)}s
              </span>
            )}
          </span>
        )}

        {state.status === 'failed' && (
          <span>
            Could not reconnect to WhatsApp. Connection attempts exhausted.
            {state.errorCode && (
              <span style={{ opacity: 0.8, marginLeft: 8 }}>(Error {state.errorCode})</span>
            )}
          </span>
        )}

        {state.status === 'protocol_error' && (
          <span>
            WhatsApp connection error. Restart may be required.
            {state.errorReason && (
              <span style={{ opacity: 0.8, marginLeft: 8 }}>• {state.errorReason}</span>
            )}
          </span>
        )}

        {state.status === 'logged_out' && (
          <span>WhatsApp session expired. Scan QR code to reconnect.</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
        {state.status === 'failed' && (
          <button
            onClick={handleRetry}
            style={{
              background: '#FFFFFF',
              color: bannerStyle.background,
              border: 'none',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Retry now
          </button>
        )}

        {state.status === 'protocol_error' && (
          <button
            onClick={handleRetry}
            style={{
              background: '#FFFFFF',
              color: bannerStyle.background,
              border: 'none',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reconnect
          </button>
        )}

        {state.status === 'logged_out' && onNavigateToQR && (
          <button
            onClick={handleScanQR}
            style={{
              background: '#FFFFFF',
              color: bannerStyle.background,
              border: 'none',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Scan QR
          </button>
        )}

        {isDismissible && (
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: bannerStyle.color,
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8,
            }}
            aria-label="Dismiss"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}
