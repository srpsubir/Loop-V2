// MAV-179 — Privacy notice screen (EU launch requirement)
// MAV-180 — LLM consent checkpoint (Option A: combined with privacy notice)
import React, { useState } from 'react'
import { Button } from '../components'

const ITEMS: { heading: string; body: string }[] = [
  {
    heading: 'What Loop reads',
    body: 'WhatsApp group names, participant lists, and message timestamps — the metadata visible in your chats list.',
  },
  {
    heading: 'Everything stays on this Mac',
    body: 'No data is uploaded, synced, or shared with any server. Your conversations never leave your device.',
  },
  {
    heading: 'Your local AI writes your stories',
    body: 'When you open a story, Loop reads recent messages from that person on your Mac to write a personal summary. This processing happens locally — nothing is sent to the cloud.',
  },
  {
    heading: 'Delete everything, any time',
    body: 'Settings → Delete all data removes every person, chapter, and memory Loop holds.',
  },
]

export interface PrivacyNoticeScreenProps {
  onAccept: () => void
}

export function PrivacyNoticeScreen({ onAccept }: PrivacyNoticeScreenProps) {
  const [consented, setConsented] = useState(false)

  const handleContinue = () => {
    if (!consented) return
    onAccept()
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '32px 24px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              margin: '0 0 8px',
              lineHeight: 1.2,
            }}
          >
            Before we start
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Here's exactly how Loop works with your data. Plain language, no legalese.
          </p>
        </div>

        {/* Notice items */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '4px 0',
            marginBottom: 24,
          }}
        >
          {ITEMS.map((item, i) => (
            <div
              key={item.heading}
              style={{
                padding: '16px 20px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border-light)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                {item.heading}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                {item.body}
              </div>
            </div>
          ))}
        </div>

        {/* LLM consent checkbox — MAV-180 */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            cursor: 'pointer',
            marginBottom: 28,
            padding: '12px 16px',
            background: consented ? 'rgba(184,98,74,0.06)' : 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${consented ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out)',
          }}
        >
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            aria-label="Consent to Loop reading recent message content locally to generate stories"
            style={{
              width: 18,
              height: 18,
              marginTop: 1,
              flexShrink: 0,
              accentColor: 'var(--accent)',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            I consent to Loop reading my recent message content locally to generate my stories. I understand this happens on my Mac and is never sent anywhere.
          </span>
        </label>

        {/* CTA */}
        <Button
          size="lg"
          disabled={!consented}
          onClick={handleContinue}
          style={{ width: '100%' }}
        >
          Continue
        </Button>

        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: 12,
            lineHeight: 1.5,
          }}
        >
          You can delete all your data at any time from Settings.
        </p>
      </div>
    </div>
  )
}

export default PrivacyNoticeScreen
