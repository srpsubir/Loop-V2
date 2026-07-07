import React, { useState, useRef, useEffect } from 'react'

interface NudgeCardContact {
  id: string
  name: string
}

interface NudgeCardProps {
  contact: NudgeCardContact
  contactInitials: string
  nudgeText: string
  onMessage: () => void
  onDismiss?: () => void
}

const SNOOZE_OPTIONS: { label: string; days: number }[] = [
  { label: 'In 3 days',   days: 3  },
  { label: 'Next week',   days: 7  },
  { label: 'In 2 weeks',  days: 14 },
  { label: 'In a month',  days: 30 },
]

export function NudgeCard({ contact, contactInitials, nudgeText, onMessage, onDismiss }: NudgeCardProps) {
  const [hovMsg, setHovMsg]           = useState(false)
  const [hovSnooze, setHovSnooze]     = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [hovOption, setHovOption]     = useState<number | null>(null)
  const [hovCancel, setHovCancel]     = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover when clicking outside
  useEffect(() => {
    if (!showPopover) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPopover])

  async function handleSnooze(days: number) {
    try {
      await window.loop.nudge.snooze(contact.id, days)
    } catch {
      // best-effort — IPC failure should not block dismiss
    }
    setShowPopover(false)
    onDismiss?.()
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: 16,
      background: 'var(--card)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      borderLeft: '4px solid var(--accent)',
    }}>
      {/* Avatar */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'rgba(184,98,74,0.14)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--accent)',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {contactInitials}
        </span>
      </div>

      {/* Text + actions */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}>
          {contact.name}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontStyle: 'italic',
          color: 'rgba(244,231,226,0.70)',
          marginTop: 4,
          lineHeight: 1.45,
        }}>
          {nudgeText}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          {/* Primary CTA */}
          <button
            onClick={onMessage}
            onMouseEnter={() => setHovMsg(true)}
            onMouseLeave={() => setHovMsg(false)}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-on-accent)',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '7px 14px',
              cursor: 'pointer',
              opacity: hovMsg ? 0.88 : 1,
              transition: 'opacity 120ms ease',
            }}
          >
            Message on WhatsApp
          </button>

          {/* Remind me later — anchors the popover */}
          <div style={{ position: 'relative' }} ref={popoverRef}>
            <button
              onClick={() => setShowPopover(prev => !prev)}
              onMouseEnter={() => setHovSnooze(true)}
              onMouseLeave={() => setHovSnooze(false)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 400,
                color: 'rgba(244,231,226,0.55)',
                background: hovSnooze ? 'rgba(184,98,74,0.06)' : 'none',
                border: 'none',
                borderRadius: 'var(--radius-xs)',
                padding: '7px 8px',
                cursor: 'pointer',
                transition: 'background 120ms ease',
              }}
            >
              Remind me later
            </button>

            {/* Snooze popover */}
            {showPopover && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                width: 180,
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-light)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-md)',
                zIndex: 10,
                overflow: 'hidden',
              }}>
                {/* Eyebrow */}
                <div style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  padding: '12px 12px 4px',
                  fontFamily: 'var(--font-sans)',
                }}>
                  Remind me in
                </div>

                {/* Options */}
                {SNOOZE_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.days}
                    onClick={() => handleSnooze(opt.days)}
                    onMouseEnter={() => setHovOption(i)}
                    onMouseLeave={() => setHovOption(null)}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 40,
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      fontWeight: 400,
                      color: 'var(--text-primary)',
                      background: hovOption === i ? 'rgba(184,98,74,0.06)' : 'none',
                      border: 'none',
                      borderBottom: i < SNOOZE_OPTIONS.length - 1 ? '1px solid var(--border-light)' : 'none',
                      textAlign: 'left',
                      padding: '0 12px',
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}

                {/* Divider + Cancel */}
                <div style={{ borderTop: '1px solid var(--border-light)' }}>
                  <button
                    onClick={() => setShowPopover(false)}
                    onMouseEnter={() => setHovCancel(true)}
                    onMouseLeave={() => setHovCancel(false)}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 36,
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'var(--text-secondary)',
                      background: hovCancel ? 'rgba(184,98,74,0.06)' : 'none',
                      border: 'none',
                      textAlign: 'left',
                      padding: '0 12px',
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
