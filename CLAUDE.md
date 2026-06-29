# Claude Code rules for Loop

## Before reporting any implementation complete

1. Run `npm run test` — all vitest unit tests must pass
2. For any change touching IPC handlers or navigation routing: run `npm run test:ipc` — all wdio tests must pass
3. No TypeScript errors: `npx tsc --noEmit` must exit clean

## Product decisions — do not re-question

Read `Context.md` at session start. Decisions marked "settled" are final — execute, don't present as choices.

## Architecture constraints

- `ChapterInferenceScreen` is the only caller of `chapters.detect()` — any change to chapter detection flow must go through it or explicitly justify the divergence
- `Scanner.run()` scans contacts only (stories, occasions, dead threads). It does NOT trigger chapter detection — keep these flows separate
- State lives in `~/Documents/Loop/state.json` — never mutate it outside `store.ts`
- IPC handlers live in `src/main/ipc.ts` — one place, no handler registration elsewhere

## Known bugs fixed (do not reintroduce)

- **Returning user 0-chapters bug (fixed 2026-06-29)**: `onboardingComplete: true` used to skip `chapter-inference` forever. Fixed via global `whatsapp.onConnected` listener in `App.tsx`. Covered by `wdio/returning-user-chapter-detection.test.ts`. If you touch navigation routing in `App.tsx`, run `npm run test:ipc` — the wdio suite will catch regressions.
