import { useConnectionState } from '../ConnectionStateContext'

export function ConnectionStatusBadge() {
  const { connectionState, retryConnection, disconnect } = useConnectionState()
  const { status } = connectionState

  if (status === 'connected' || status === 'disconnected') return null

  const isReconnecting = status === 'reconnecting'
  const dotColor = isReconnecting ? '#f59e0b' : '#ef4444'
  const bgColor = isReconnecting ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'
  const borderColor = isReconnecting ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'
  const textColor = isReconnecting ? '#92400e' : '#991b1b'

  let primary = ''
  let secondary = ''
  let buttons: { label: string; action: () => void }[] = []

  if (status === 'reconnecting') {
    primary = `Reconnecting to WhatsApp... (attempt ${connectionState.attempt} of ${connectionState.max})`
    secondary = 'Your chapters are still available.'
  } else if (status === 'failed') {
    primary = 'Could not reconnect to WhatsApp.'
    secondary = 'Your chapters are still available to read.'
    buttons = [
      { label: 'Retry', action: retryConnection },
      { label: 'Disconnect', action: disconnect },
    ]
  } else if (status === 'protocol_error') {
    primary = 'WhatsApp connection issue.'
    secondary = 'Check for a Loop update to reconnect.'
    buttons = [
      { label: 'Check for update', action: () => window.loop.update.installNow() },
      { label: 'Retry anyway', action: retryConnection },
    ]
  } else if (status === 'logged_out') {
    primary = "You've been signed out of WhatsApp."
    secondary = 'Sign in again to keep your chapters up to date.'
    buttons = [
      { label: 'Sign in again', action: () => window.loop.whatsapp.start() },
    ]
  }

  return (
    <>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '48px',
        width: '100%',
        boxSizing: 'border-box',
        background: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        flexShrink: 0,
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
            animation: isReconnecting ? 'pulse 1.5s ease-in-out infinite' : undefined,
          }} />
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: textColor,
              lineHeight: '1.3',
            }}>
              {primary}
            </div>
            {secondary && (
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                color: textColor,
                opacity: 0.7,
                lineHeight: '1.3',
              }}>
                {secondary}
              </div>
            )}
          </div>
        </div>
        {buttons.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            {buttons.map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: textColor,
                  fontWeight: 500,
                  textDecoration: 'underline',
                  textDecorationColor: `${textColor}66`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
