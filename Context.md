# Loop Session Context
_Updated: 2026-07-04_

## Current git state
- Branch: main
- Latest commits (newest first):
  - `b9094f5` fix(wdio): green wdio suite — data-testid selectors + scan loading state fix
  - `94454a4` fix: TDZ crash — echoCrewInitials referenced echoChapter before declaration
  - `39b8e2d` feat: Their world CTA renames + T3 dead thread card + T4b dual CTA routing
  - `02470fb` feat: Phase 6 – nostalgia card, people view, dead thread card, on your mind section
  - `428495c` feat: Phase 7+8 – AppShell with sidebar nav + titlebar search
- Uncommitted changes (in progress):
  - `src/main/analytics.ts` — Sentry + PostHog replaced with no-op stubs
  - `src/renderer/src/main.tsx` — Sentry.init removed
  - `src/renderer/src/components/ErrorBoundary.tsx` — Sentry removed, tokens applied, copy fixed
  - `src/main/ipc.ts` — shell:openExternal https:// validation (IN PROGRESS, not yet written)

## Test status
- Unit (vitest): 144 tests, 10 files — ALL PASSING (last run)
- wdio (IPC navigation): 13 tests — ALL PASSING (committed b9094f5)
- Playwright (e2e): not run this session

## What's shipped (committed)
- Phase 6: QuietDayCard, DeadThreadCard (T3 copy), OnYourMindSection (T4b dual CTAs), PeopleScreen
- Phase 7+8: AppShell (200px sidebar), TitlebarSearch (pill search)
- D-II palette tokens (in globals.css)
- "Their world" naming throughout all CTAs
- TDZ bug fix (echoChapter declaration order)
- wdio: scan loading gate + data-testid selectors

## Security fixes — committed `5f83241`
1. **Sentry + PostHog removed** — `analytics.ts` is a no-op stub; `ErrorBoundary.tsx` + `main.tsx` stripped
2. **shell:openExternal validation** — https:// scheme guard in ipc.ts — DONE
3. **Backup before deleteAll** — not yet implemented
4. **Baileys pin** — not yet done

## IPC dead-wiring audit results
- `calendar:addEvent` — in preload, no main handler, no renderer caller. DEAD STUB.
  → Linear ticket needed: Calendar integration conversation (what do we actually want here?)
- `model:status` — in preload, no main handler, no renderer caller. DEAD STUB.
  → Linear ticket needed: On-device SLM/LLM integration planning
- All other 40+ IPC channels: cleanly wired

## MAV-193 scan loading — what happened in wdio
The wdio test injected `onboardingComplete: true` + chapters but did NOT set `whatsappConnected` or
`chapterDetectionComplete`. The user's real `state.json` (from actual WhatsApp usage) had
`whatsappConnected: true` persisted. On test reload, YourLoopsScreen hit this gate:
  `if (state?.whatsappConnected && !state.chapterDetectionComplete)`
...and showed "Loop is reading your conversations" instead of the chapter atoms.
Fix: test now explicitly injects `whatsappConnected: false` + `chapterDetectionComplete: true`
to override any persisted real-session state.

## Design audit — prioritised fixes
1. Token enforcement — replace 22 hardcoded hex values with var(--*) (unblocks dark mode + all fixes below)
2. Reduce font sizes from 28 to 7 on the token scale (remove fractional sizes: 10.5, 11.5, 12.5 etc.)
3. Dark mode — add @media prefers-color-scheme dark palette + dynamic backgroundColor in BrowserWindow
4. 4pt/8pt spacing grid — fix off-grid values (gap:7, gap:14, padding:13px etc.)
5. Concentric radius — ChapterCard borderRadius:14 → var(--radius-md) 12px; sidebar nav item 6→8px
6. Screen transitions — AnimatePresence spring (framer-motion); echoCardIn 460ms → 320ms
7. ErrorBoundary copy + tokens — DONE in this session (no-op Sentry, token styles applied)
8. ConnectionStatusBadge — replace semantic red/amber with warm terra-scale colours
9. AppSidebar/PeopleScreen local SERIF/SANS font constants → var(--font-serif)/var(--font-sans)
10. macOS vibrancy — sidebar vibrancy:'sidebar' in BrowserWindow

## Linear tickets created this session
- **MAV-203** — calendar:addEvent IPC — plan what calendar integration should actually be (Backlog, Medium)
- **MAV-204** — model:status IPC — on-device SLM/LLM integration planning (Backlog, High)

## Pending / in-flight work
1. D-II token enforcement (design fix #1) — awaiting decision to proceed
5. Beat 3 interactive — no decision yet
6. MAV-202 manifesto in settings/about
7. Push to remote: `! git push origin main` (user must run, PAT constraint)
8. DMG: `npm run dist` — gated on all tests green + D-II done + manifesto done
