import { useEffect, useState } from 'react'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available' }
  | { phase: 'downloading'; percent: number }
  | { phase: 'ready'; version: string }

export function UpdateBanner(): JSX.Element | null {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' })

  useEffect(() => {
    const offChecking = window.loop.update.onChecking(() =>
      setState({ phase: 'checking' })
    )
    const offNotAvailable = window.loop.update.onNotAvailable(() =>
      setState({ phase: 'idle' })
    )
    const offAvailable = window.loop.update.onAvailable(() =>
      setState({ phase: 'available' })
    )
    const offDownloading = window.loop.update.onDownloading(({ percent }) =>
      setState({ phase: 'downloading', percent })
    )
    const offReady = window.loop.update.onReady(({ version }) =>
      setState({ phase: 'ready', version })
    )
    const offError = window.loop.update.onError(({ message }) =>
      console.error('[updater]', message)
    )
    return () => {
      offChecking(); offNotAvailable(); offAvailable(); offDownloading(); offReady(); offError()
    }
  }, [])

  if (state.phase === 'idle') return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#1a1a1a',
      color: '#fff',
      fontSize: 13,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 9999,
    }}>
      {state.phase === 'checking' && (
        <span>Checking for updates...</span>
      )}
      {state.phase === 'available' && (
        <span>A new version is available, downloading...</span>
      )}
      {state.phase === 'downloading' && (
        <span>Downloading update... {state.percent}%</span>
      )}
      {state.phase === 'ready' && (
        <>
          <span>Loop {state.version} is ready. Restart to update.</span>
          <button
            onClick={() => window.loop.update.installNow()}
            style={{
              background: '#fff',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: 4,
              padding: '4px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Restart now
          </button>
        </>
      )}
    </div>
  )
}
