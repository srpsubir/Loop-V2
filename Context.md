# Loop Session Context
_Updated: 2026-07-05_

## Current git state
- Branch: main
- Latest commits (newest first):
  - `1dfa7cd` feat: Beat 3 contact picker + Chapter crew picker (MAV-215, MAV-206)
  - `8075850` feat: signals ranking + progressive suppression + snooze data model (MAV-205, MAV-209, MAV-210, MAV-211, MAV-212, MAV-213)
  - `f371f69` chore: update Context.md — backlog complete
  - `e6fea43` feat: D-II token enforcement, deleteAll backup, Baileys pin, manifesto
  - `5f83241` security: remove Sentry/PostHog + validate shell:openExternal
  - `b9094f5` fix(wdio): green wdio suite — data-testid selectors + scan loading state fix

## Test status
- Unit (vitest): 144 tests, 10 files — ALL PASSING (2026-07-04)
- wdio (IPC navigation): 13 tests — ALL PASSING (2026-07-04)
- Playwright (e2e): not run this session

## What's shipped (committed)
- Phase 6+7+8: AppShell, sidebar nav, TitlebarSearch, QuietDayCard, DeadThreadCard, OnYourMindSection, PeopleScreen
- D-II token enforcement (22 hardcoded hex → CSS vars, all components)
- Dark mode (@media prefers-color-scheme + data-theme, transparent BG)
- Font scale, spacing grid, concentric radius, vibrancy fixes
- Security: Sentry/PostHog removed, shell:openExternal https:// guard, deleteAll backup
- Baileys pinned to 7.0.0-rc11 (no ^)
- MAV-202 manifesto in Settings/About screen
- Product-vision.md: Beat 3 declaration framing struck, contact picker confirmed

## Security — ALL DONE
- `5f83241` Sentry + PostHog removed; shell:openExternal https:// guard
- `e6fea43` Backup before deleteAll; Baileys pinned

## Design audit — ALL DONE
All 10 design fixes shipped across `e6fea43` and `c95da16`. Screen transitions skipped (framer-motion not installed).

## Research outputs (written to Loop folder)
- `signals-audit.md` — full C1/ranking gap analysis
- `story-audit.md` — generateStory() teardown, 8 reasonToReachOut variants, draftMessage templates
- `MAV-203-analysis.md` — calendar/freemium analysis
- `MAV-204-analysis.md` — SLM/LLM/Baileys coverage analysis
- `design-research.md` — Mobbin searches pending (re-auth needed)

## Architecture decisions (locked)
- No bundled language model. 700MB is a non-starter.
- Long-term generative path: Apple Intelligence (iOS 18+ / macOS Sequoia+), zero app size overhead.
- Group chat mood inference: not feasible (Baileys syncFullHistory: false, group content not fetched). Replaced by MAV-206 crew picker.
- Ex/unwanted contact filtering: rules on behavioral signals (dismissCount), no model.
- Calendar integration: replaced by snooze (MAV-205). Calendar export opt-in later if ever.
- Freemium: one-time purchase, parked until post-DMG (MAV-208).

## Full Linear backlog

### Signals & ranking — SHIPPED 2026-07-04
- **MAV-209** DONE — relationshipStrength (C1) wired into contacts strip + nudge sort
- **MAV-210** DONE — Progressive nudge suppression (nudgeDismissCount, autosuppressed)
- **MAV-211** DONE — Birthday occasion overrides nudge sort priority
- **MAV-212** DONE — lastReachOutAt gate (7-day re-nudge suppression after reach-out)
- **MAV-213** DONE — reconnectedAt ranking boost (1.3x within 14 days)

### Core features — SHIPPED 2026-07-04
- **MAV-205** DONE — snoozedUntil on ContactState + nudge:snooze IPC handler + snooze UI on NudgeCard ("Remind me later" popover with 4 options, fully shipped)

### Story / Their world
- **MAV-207** DONE — generateStory() template improvements, all copy approved + shipped (`f782031`)
- **MAV-214** DONE — draftMessage field on Story + generateDraftMessage() helper, all copy approved + shipped (`f782031`)

### Core features
- **MAV-206** DONE — Chapter crew picker — two-zone layout, saves crewContactIds to chapter state
- **MAV-215** DONE — Beat 3 contact picker — 4-column avatar grid, saves manuallySelected to state

### IPC / planning
- **MAV-203** — calendar:addEvent planning (superseded by MAV-205 snooze + MAV-208 billing)
- **MAV-204** — model:status planning (superseded by MAV-207 templates + Apple Intelligence path)

### Parked
- **MAV-208** — Freemium / billing epic (park pre-DMG, Low)

## Pending / in-flight
1. Push to remote: `git push origin main` (user must run, PAT constraint)
2. DMG: `npm run dist` — gated on all tests green (unit + wdio + e2e)
