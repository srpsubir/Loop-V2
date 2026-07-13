import React, { useState } from 'react'
import { TRAFFIC_LIGHT_POSITION, TRAFFIC_LIGHT_SAFE_ZONE } from '../../../shared/layout'

// MAV-253: reserve room below the native traffic-light buttons so the
// wordmark never collides with them — was previously a bare 18px guess.
const WORDMARK_TOP_PADDING = TRAFFIC_LIGHT_POSITION.y + TRAFFIC_LIGHT_SAFE_ZONE.height + 8

const SERIF = 'var(--font-serif)'
const SANS = 'var(--font-sans)'

type SidebarSection = 'your-loops' | 'people' | 'chapters' | 'settings'

interface Props {
  currentScreen: string
  // Which sidebar section the user actually navigated from, for screens (like
  // 'story') reachable from more than one section — without this, the story
  // screen always highlighted "Chapters" even when opened from People.
  storyFrom?: SidebarSection
  onNavigate: (section: SidebarSection) => void
}

const NAV_ITEMS: { id: SidebarSection; label: string }[] = [
  { id: 'your-loops', label: 'Your Loop' },
  { id: 'people', label: 'People' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'settings', label: 'Settings' },
]

function activeSection(screen: string, storyFrom?: SidebarSection): SidebarSection {
  if (screen === 'settings') return 'settings'
  if (screen === 'story') return storyFrom ?? 'chapters'
  if (screen === 'chapters' || screen === 'chapter-detail' || screen === 'chapter-naming' || screen === 'chapter-crew-picker') return 'chapters'
  if (screen === 'people') return 'people'
  return 'your-loops'
}

export function AppSidebar({ currentScreen, storyFrom, onNavigate }: Props) {
  const active = activeSection(currentScreen, storyFrom)
  const [hov, setHov] = useState<SidebarSection | null>(null)

  return (
    <div
      style={{
        width: 200,
        height: '100%',
        background: 'var(--sidebar-bg)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid var(--border-light)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Wordmark — data-testid sits on the inner text span, not this padded
          wrapper, so a safe-zone bounding-box check measures where the glyph
          actually renders rather than the whole padded container (which
          always starts at the container's own origin regardless of padding). */}
      <div
        style={{
          padding: `${WORDMARK_TOP_PADDING}px 20px 10px`,
          fontFamily: SERIF,
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <span data-testid="app-wordmark">Loop</span>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: '4px 8px',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {NAV_ITEMS.map(({ id, label }) => {
          const isActive = active === id
          const isHov = hov === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              onMouseEnter={() => setHov(id)}
              onMouseLeave={() => setHov(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                height: 36,
                paddingLeft: isActive ? 10 : 12,
                paddingRight: 12,
                border: 'none',
                borderLeft: isActive ? '2px solid #C8724A' : '2px solid transparent',
                background: isActive
                  ? 'transparent'
                  : isHov
                  ? 'rgba(128,80,56,0.06)'
                  : 'transparent',
                cursor: 'pointer',
                fontFamily: SANS,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#F4E7E2' : 'rgba(244,231,226,0.45)',
                textAlign: 'left',
                borderRadius: 8,
                transition: 'background 120ms ease',
                boxSizing: 'border-box',
              } as React.CSSProperties}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {/* User avatar */}
      <div
        style={{
          padding: 16,
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: SERIF,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-on-accent)',
          }}
        >
          L
        </div>
      </div>
    </div>
  )
}
