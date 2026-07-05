import React, { useState } from 'react'

type ComposerState = 'default' | 'sending' | 'sent'

interface MessageComposerProps {
  draftMessage?: string
  whatsappId: string
  contactId: string
  contactName: string
}

export function MessageComposer({ draftMessage, whatsappId, contactId, contactName }: MessageComposerProps) {
  const [composerState, setComposerState] = useState<ComposerState>('default')
  const [text, setText] = useState(draftMessage ?? '')
  const [error, setError] = useState<string | null>(null)

  if (composerState === 'sent') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 8,
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--positive)' }}>
          <span style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--positive-faint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            flexShrink: 0,
          }}>✓</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
            Sent to {contactName}
          </span>
        </div>
        <button
          onClick={() => window.loop.shell.openWhatsApp(whatsappId, contactId)}
          style={{
            fontSize: 12,
            color: 'var(--ink-mid)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            padding: 0,
          }}
        >
          View in WhatsApp ↗
        </button>
      </div>
    )
  }

  const isSending = composerState === 'sending'

  const handleSend = async () => {
    if (!text.trim() || isSending) return
    setError(null)
    setComposerState('sending')
    try {
      const result = await window.loop.whatsapp.sendMessage(whatsappId, text, contactId)
      if (result.ok) {
        setComposerState('sent')
      } else {
        setError(result.error ?? 'Couldn\'t send. Try opening WhatsApp directly.')
        setComposerState('default')
      }
    } catch {
      setError('Couldn\'t send. Try opening WhatsApp directly.')
      setComposerState('default')
    }
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-light)',
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{
          fontSize: 12,
          fontFamily: 'var(--font-sans)',
          color: 'var(--ink-mid)',
          fontWeight: 500,
        }}>
          Your message
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSending}
          rows={3}
          placeholder="Write something..."
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            resize: 'none',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--text-primary)',
            lineHeight: 1.6,
            opacity: isSending ? 0.5 : 1,
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{
            fontSize: 12,
            color: 'var(--terracotta)',
            fontFamily: 'var(--font-sans)',
          }}>
            {error}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTop: '1px solid var(--border-light)',
      }}>
        <button
          onClick={() => window.loop.shell.openWhatsApp(whatsappId, contactId)}
          style={{
            fontSize: 12,
            color: 'var(--ink-mid)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Open in WhatsApp ↗
        </button>

        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          style={{
            background: !text.trim() || isSending ? 'var(--accent-light)' : 'var(--accent)',
            color: 'var(--text-on-accent)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 18px',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            cursor: !text.trim() || isSending ? 'not-allowed' : 'pointer',
            minWidth: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 120ms ease',
          }}
          aria-busy={isSending}
          aria-label={isSending ? 'Sending message' : 'Send'}
        >
          {isSending ? '⟳' : 'Send'}
        </button>
      </div>
    </div>
  )
}
