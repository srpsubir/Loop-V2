import React from 'react'
import { X, Check } from 'lucide-react'

export type UpgradeStatus = 'idle' | 'downloading' | 'complete'

interface ModelUpgradeCardProps {
  status?: UpgradeStatus
  progress?: number // 0–100
  onDismiss?: () => void
  onUpgrade?: () => void
  onCancel?: () => void
}

export function ModelUpgradeCard({
  status = 'idle',
  progress = 0,
  onDismiss,
  onUpgrade,
  onCancel,
}: ModelUpgradeCardProps) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      width: 380,
      borderRadius: 'var(--radius-md)',
      padding: 16,
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      boxShadow: '0 1px 4px rgba(42,31,27,0.08)',
    }}>

      {status === 'idle' && (
        <>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              padding: 0,
            }}
          >
            <X size={16} />
          </button>

          <div style={{ paddingRight: 24, marginBottom: 12 }}>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}>
              Your stories could be richer.
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}>
              Loop can read your actual conversations, privately, on your device. One download, then it stays.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <button
              onClick={onUpgrade}
              style={{
                background: 'var(--accent)',
                color: '#F9F5EE',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Enable richer stories <span style={{ fontSize: 11 }}>↓</span> 935 MB
            </button>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: 'var(--text-muted)',
            }}>
              Downloads in the background. Wi-Fi recommended.
            </div>
          </div>
        </>
      )}

      {status === 'downloading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--text-primary)',
          }}>
            Downloading conversation reader...
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              width: '100%',
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(184,98,74,0.15)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: 'var(--accent)',
                transition: 'width 300ms ease-out',
              }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}>
                {progress}% · {Math.round((progress / 100) * 935)} MB of 935 MB
              </div>
              <button
                onClick={onCancel}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: 'rgba(184,98,74,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              flexShrink: 0,
            }}>
              <Check size={12} strokeWidth={3} />
            </div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              color: 'var(--text-primary)',
            }}>
              Conversation reader ready.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}>
              Your next scan will use your actual conversations.
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: 'var(--text-muted)',
            }}>
              This card will close shortly.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
