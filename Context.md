# Loop Session Context
_Updated: 2026-07-04_

## Current git state
- Branch: main
- Latest commits (newest first):
  - `f371f69` chore: update Context.md — backlog complete
  - `e6fea43` feat: D-II token enforcement, deleteAll backup, Baileys pin, manifesto
  - `5f83241` security: remove Sentry/PostHog + validate shell:openExternal
  - `7bfcae4` chore: update Context.md
  - `b9094f5` fix(wdio): green wdio suite — data-testid selectors + scan loading state fix

## Test status
- Unit (vitest): 144 tests, 10 files — ALL PASSING (last run)
- wdio (IPC navigation): 13 tests — ALL PASSING (committed b9094f5)
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

### Signals & ranking
- **MAV-209** — Wire relationshipStrength (C1) into contacts strip + nudge sort (High) ← 2 lines, ship now
- **MAV-210** — Progressive nudge suppression — dismissCount + autosuppressed (High)
- **MAV-211** — Birthday occasion overrides nudge sort priority (High)
- **MAV-212** — lastReachOutAt gate — suppress re-nudge after recent reach-out (Medium)
- **MAV-213** — reconnectedAt ranking boost (Medium)

### Story / Their world
- **MAV-207** — generateStory() template improvements — richer "Their world" without a model (Medium)
- **MAV-214** — draftMessage field on Story — suggested opening message (Medium)

### Core features
- **MAV-205** — Snooze nudge — "remind me in X days" on ContactState (High)
- **MAV-206** — Chapter crew picker — manual warm signal after chapter detection (High) ← blocked on Mobbin
- **MAV-215** — Beat 3 screen — contact picker onboarding (High) ← blocked on Mobbin

### IPC / planning
- **MAV-203** — calendar:addEvent planning (superseded by MAV-205 snooze + MAV-208 billing)
- **MAV-204** — model:status planning (superseded by MAV-207 templates + Apple Intelligence path)

### Parked
- **MAV-208** — Freemium / billing epic (park pre-DMG, Low)

## Pending / in-flight
1. Mobbin re-auth → design research for MAV-206, MAV-215 (Beat 3)
2. Push to remote: `! git push origin main` (user must run, PAT constraint)
3. DMG: `npm run dist` — gated on all tests green (unit + wdio + e2e)

## Next buildable (no design needed, code only)
1. MAV-209 — wire relationshipStrength (2 lines)
2. MAV-211 — birthday nudge override
3. MAV-212 — lastReachOutAt re-nudge gate
4. MAV-210 — dismissCount + progressive suppression
5. MAV-213 — reconnectedAt boost
6. MAV-205 — snoozedUntil on ContactState
7. MAV-207 + MAV-214 — story templates + draftMessage
