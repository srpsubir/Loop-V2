# Claude Code rules for Loop

## Before reporting any implementation complete

1. Run `npm run test` — all 114 vitest unit tests must pass (6 files, node + jsdom environments)
2. For any change touching IPC handlers or navigation routing: run `npm run test:ipc` — all wdio tests must pass
3. No TypeScript errors: `npx tsc --noEmit` must exit clean

## Test pyramid

- `npm run test` — unit tests only (fast, always runnable, no build required). Excludes `src/test/electron/**`.
- `npm run test:e2e` — Playwright + osascript + nutjs against a built Electron app. Requires `npm run build` first.
- `npm run test:ipc` — wdio IPC suite. Requires `npm run build` first.
- `npm run test:all` — all three layers in sequence.

**If `npm run test` is red, fix it before anything else. A torn net catches nothing.**

## Product decisions — do not re-question

Read `Context.md` at session start. Decisions marked "settled" are final — execute, don't present as choices.

## Architecture constraints

- `ChapterInferenceScreen` is the only caller of `chapters.detect()` — any change to chapter detection flow must go through it or explicitly justify the divergence
- `Scanner.run()` scans contacts only (stories, occasions, dead threads). It does NOT trigger chapter detection — keep these flows separate
- State lives in `~/Documents/Loop/state.json` — never mutate it outside `store.ts`
- IPC handlers live in `src/main/ipc.ts` — one place, no handler registration elsewhere

## Known bugs fixed (do not reintroduce)

- **Returning user 0-chapters bug (fixed 2026-06-29)**: `onboardingComplete: true` used to skip `chapter-inference` forever. Fixed via global `whatsapp.onConnected` listener in `App.tsx`. Covered by `src/test/electron/wdio/returning-user-chapter-detection.test.ts`. If you touch navigation routing in `App.tsx`, run `npm run test:ipc` — the wdio suite will catch regressions.
- **onboardingComplete never set on happy path (fixed 2026-06-30)**: `goYourLoops` in `App.tsx` never patched `onboardingComplete: true` — only the skip button did. Every post-onboarding launch started at the welcome screen. Fixed by making `goYourLoops` async and patching before navigating (`c1d9904`).
- **Chapter detection infinite hang (fixed 2026-06-30)**: `buildTieStrengthMap()` called `fetchMessagesFromWA()` once per DM contact sequentially — hundreds of network calls, indefinite hang, `chapters:detect` IPC never settled. Replaced with `chatStore.conversationTimestamp` recency lookup — completes in microseconds (`5d37be1`). Do not reintroduce any `await getMessages()` call inside `buildTieStrengthMap()`.
