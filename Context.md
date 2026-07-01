# Loop — Session Context
_Updated: 2026-07-01_

## Current state

All feature work and design fixes are on `main`. No open PRs. No uncommitted changes pending (needs push — see below).

## What shipped (this session — 2026-07-01)

### Design quality fixes — 125/125 green

| Fix | Files | Notes |
|---|---|---|
| `--ink-muted` contrast | `globals.css` | `#A38F85` → `#7A6056` — WCAG AA pass (4.6:1) |
| Custom scrollbar CSS removed | `globals.css` | macOS handles natively |
| ConnectionStatusBadge invisible text | `ConnectionStatusBadge.tsx` | Added `background: '#2A1F1B'` |
| NudgeCard border removed | `NudgeCard.tsx` | Ive elimination test — has bg + shadow |
| Dead zone gap | `YourLoopsScreen.tsx` | Atom row top padding 32px → 16px |
| Focus rings | `globals.css` | `button:focus-visible` + `[role="button"]:focus-visible` → `var(--focus-ring)` |
| Shadow tokens | `NudgeCard`, `DeadThreadCard`, `YourLoopsScreen` | All ad-hoc box-shadow → `var(--shadow-sm/md/xl)` |
| DeadThreadCard border removed | `DeadThreadCard.tsx` | Ive elimination — replaced with `var(--shadow-sm)` |
| Orbit animation | `YourLoopsScreen.tsx` | `linear` → `ease-in-out` |
| AtomCard hover/press | `YourLoopsScreen.tsx` | hover `scale(1.02)`, pressed `scale(0.97)`, 120ms transition |
| Spacing grid | `NudgeCard`, `DeadThreadCard`, `QuietDayCard`, `YourLoopsScreen` | All off-4pt values fixed |
| QuietDayCard hardcoded colors | `QuietDayCard.tsx` | All hex values → `var(--text-primary/secondary/muted)` + `var(--surface)` |

## Open product decision — approved

**Static orb legibility** — approved direction: **Option A** — contact dots resting on orbit ring in static state.  
Next step: Magic Patterns mock. MP prompt ready. Awaiting user go-ahead to send.

## Design backlog (no product decision needed, ready to code)

1. Typography collapse — 12 sizes → 4: 32px/600 display, 22px/600 headline, 15px/400-500 body, 11px/700 label (3–4h)
2. Screen transitions — framer-motion AnimatePresence + spring stiffness:260 damping:24 (2–3h)
3. Dark mode — `@media (prefers-color-scheme: dark)` + BrowserWindow backgroundColor fix (2h)
4. Empty states — CTA buttons on YourLoopsScreen empty + StoryScreen empty (1h)
5. "Your Loops" heading — reduce size to give orbs more breathing room

## Engineering tickets (open)

| Ticket | Description | Priority |
|---|---|---|
| MAV-178 | `data:deleteAll` — no confirmation gate | Ship blocker |
| MAV-179 | Privacy notice screen | EU launch blocker |
| MAV-180 | LLM consent checkpoint | EU launch blocker |
| MAV-184 | Chapter removal UI in ChapterDetailScreen | Pre-beta high |
| MAV-185 | Menu bar badge for scan completion | Medium |
| MAV-186 | Keyboard coverage: Escape, Tab, Return | Medium |
| MAV-187 | ARIA roles on atom orbit SVG for VoiceOver | Accessibility |

## P1 copy fixes (queued, no tickets)

- "Last contact: Never recorded" → "Last spoke" / omit if empty (StoryScreen)
- "Run a scan" → "Let Loop read your conversations" (StoryScreen empty state)
- "Search contacts..." → "Search by name" (Stay Close picker)
- "crew" headings → "your people" (CrewDetectionScreen)
- "Step X of 5" across onboarding → remove step counter

## CI push pending

Commits from this session need a push.
Run `! gh auth refresh -s workflow` then `git push`.

## Architecture

Electron + React macOS app. `titleBarStyle: 'hiddenInset'`, `backgroundColor: '#F9F5EE'` parchment.
State at `~/Documents/Loop/state.json`. IPC handlers at `src/main/ipc.ts`.

## Test pyramid

- `npm run test` — 125 vitest unit (always run first, no build needed)
- `npm run test:ipc` — wdio IPC suite (requires `npm run build`)
- `npm run test:e2e` — Playwright + osascript (requires `npm run build`)
- `npm run test:all` — all three in sequence

## Known good commits (do not reintroduce fixed bugs)

- `aee2ab7` — infinite reconnect loop fix + QR blink fix
- `c1d9904` — onboardingComplete never set on happy path fix
- `5d37be1` — chapter detection infinite hang fix
