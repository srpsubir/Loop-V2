import React, { useState, useEffect } from 'react'
import type { Contact } from '@shared/types'

interface Props {
  onContinue: () => void
}

const SERIF = '"Lora", Georgia, "Times New Roman", serif'
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'

const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000

function initial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

interface InsightRow {
  contact: Contact
  days: number
  insight: string
}

export function OnboardingRevealScreen({ onContinue }: Props) {
  const [rows, setRows] = useState<InsightRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    Promise.all([window.loop.contacts.list(), window.loop.state.get()])
      .then(([contacts, state]) => {
        const contactStateMap = state.contacts ?? {}
        const overdue: InsightRow[] = []

        for (const contact of contacts) {
          const cs = contactStateMap[contact.id]
          const days = daysSince(cs?.lastContactDate ?? null)
          if (days === null || days < 42) continue

          let insight: string
          if (days >= 90) {
            insight = `It's been over ${Math.floor(days / 30)} months since you last spoke.`
          } else {
            insight = `It's been ${days} days since you last spoke.`
          }
          overdue.push({ contact, days, insight })
        }

        overdue.sort((a, b) => b.days - a.days)
        setRows(overdue.slice(0, 3))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const count = rows.length

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#F4E7E2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '72px 40px 56px',
      boxSizing: 'border-box',
      overflowY: 'auto',
    }}>
      <main style={{
        width: '100%',
        maxWidth: 560,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <p style={{
          fontFamily: SANS,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#7A6056',
          margin: 0,
          textAlign: 'center',
        }}>
          What we found
        </p>

        <h1 style={{
          fontFamily: SERIF,
          fontSize: 30,
          fontWeight: 600,
          color: '#1A100C',
          lineHeight: 1.3,
          textAlign: 'center',
          maxWidth: 480,
          margin: '16px 0 0',
        }}>
          {loading
            ? 'Scanning your conversations...'
            : count === 0
              ? "You're doing great — no one's been left behind."
              : `You have ${count} ${count === 1 ? 'person' : 'people'} you haven't spoken to in over 6 weeks.`
          }
        </h1>

        <p style={{
          fontFamily: SANS,
          fontSize: 15,
          color: '#6B5447',
          lineHeight: 1.55,
          textAlign: 'center',
          maxWidth: 420,
          margin: '10px 0 0',
        }}>
          Loop scanned your WhatsApp conversations privately, on your device. Nothing was sent anywhere.
        </p>

        {rows.length > 0 && (
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            margin: '36px 0 0',
          }}>
            {rows.map((row) => (
              <div key={row.contact.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: '#FFFFFF',
                borderRadius: 12,
                borderLeft: '4px solid #B8624A',
                padding: 16,
                boxShadow: '0 1px 3px rgba(26,16,12,0.07), 0 4px 14px rgba(26,16,12,0.07)',
              }}>
                <div style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#B8624A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: SERIF,
                  fontSize: 18,
                  fontWeight: 600,
                }}>
                  {initial(row.contact.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: SERIF,
                    fontSize: 17,
                    fontWeight: 600,
                    color: '#1A100C',
                    lineHeight: 1.25,
                  }}>
                    {row.contact.name.split(' ')[0]}
                  </div>
                  <div style={{
                    fontFamily: SANS,
                    fontSize: 13,
                    fontStyle: 'italic',
                    color: '#6B5447',
                    marginTop: 3,
                    lineHeight: 1.4,
                  }}>
                    {row.insight}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onClick={onContinue}
          style={{
            marginTop: 36,
            width: 220,
            height: 48,
            borderRadius: 999,
            border: 'none',
            background: pressed ? '#A6543E' : '#B8624A',
            color: '#FFFFFF',
            fontFamily: SANS,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 160ms ease, transform 160ms ease',
            transform: pressed ? 'scale(0.98)' : 'scale(1)',
            boxShadow: '0 2px 8px rgba(184,98,74,0.28)',
          }}
        >
          Meet your Loop
        </button>

        <p style={{
          fontFamily: SANS,
          fontSize: 12,
          color: '#7A6056',
          textAlign: 'center',
          margin: '14px 0 0',
        }}>
          Your data stays on your device. Always.
        </p>
      </main>
    </div>
  )
}
