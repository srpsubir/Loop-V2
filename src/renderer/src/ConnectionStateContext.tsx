import React, { createContext, useContext, useEffect, useState } from 'react'

type ConnectionState =
  | { status: 'connected' }
  | { status: 'reconnecting'; attempt: number; max: number }
  | { status: 'failed' }
  | { status: 'protocol_error'; reason?: string }
  | { status: 'logged_out' }
  | { status: 'disconnected' }

interface ConnectionStateContextValue {
  connectionState: ConnectionState
  retryConnection: () => void
  disconnect: () => void
}

const ConnectionStateContext = createContext<ConnectionStateContextValue>({
  connectionState: { status: 'disconnected' },
  retryConnection: () => {},
  disconnect: () => {},
})

export function ConnectionStateProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'disconnected' })

  useEffect(() => {
    window.loop.whatsapp.status().then(({ status }) => {
      if (status === 'connected') setConnectionState({ status: 'connected' })
    })

    const unsubConnected = window.loop.whatsapp.onConnected(() => {
      setConnectionState({ status: 'connected' })
    })

    const unsubDisconnected = window.loop.whatsapp.onDisconnected((_loggedOut: boolean) => {
      setConnectionState({ status: 'disconnected' })
    })

    const unsubReconnecting = (window.loop.whatsapp as any).onReconnecting(
      (data: { attempt: number; max: number }) => {
        setConnectionState({ status: 'reconnecting', attempt: data.attempt, max: data.max })
      }
    )

    const unsubFailed = window.loop.whatsapp.onConnectionFailed((_reason?: string) => {
      setConnectionState({ status: 'failed' })
    })

    const unsubLoggedOut = (window.loop.whatsapp as any).onLoggedOut(() => {
      setConnectionState({ status: 'logged_out' })
    })

    const unsubProtocolError = (window.loop.whatsapp as any).onProtocolError(
      (data: { reason?: string }) => {
        setConnectionState({ status: 'protocol_error', reason: data?.reason })
      }
    )

    return () => {
      unsubConnected()
      unsubDisconnected()
      unsubReconnecting()
      unsubFailed()
      unsubLoggedOut()
      unsubProtocolError()
    }
  }, [])

  const retryConnection = () => { ;(window.loop.whatsapp as any).retry() }
  const disconnect = () => { window.loop.whatsapp.disconnect() }

  return (
    <ConnectionStateContext.Provider value={{ connectionState, retryConnection, disconnect }}>
      {children}
    </ConnectionStateContext.Provider>
  )
}

export function useConnectionState() {
  return useContext(ConnectionStateContext)
}
