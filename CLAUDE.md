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

**Vision (locked 2026-07-02):** Loop is a dual-layer relationship companion. PEOPLE LAYER (relationship intelligence: who do I stay close to, chapter-agnostic) and CHAPTER LAYER (identity + memory: who was I then, who was there) are co-equal. Neither subordinates the other. Do not re-open the chapter-first vs people-first debate — both are first-class. See PRODUCT_CONVERSATIONS.md Vision section for full statement.

## Architecture constraints

- `ChapterInferenceScreen` is the only caller of `chapters.detect()` — any change to chapter detection flow must go through it or explicitly justify the divergence
- `Scanner.run()` scans contacts only (stories, occasions, dead threads). It does NOT trigger chapter detection — keep these flows separate
- State lives in `<userData>/LoopData/state.json` (`~/Library/Application Support/loop/LoopData/state.json` in dev) — never mutate it outside `store.ts`. Moved off `~/Documents/Loop` in MAV-252 because iCloud Desktop/Documents sync silently hangs or empties file reads when unhealthy, which broke WhatsApp QR linking. `store.ts` migrates legacy `~/Documents/Loop` data automatically on first launch post-fix.
- IPC handlers live in `src/main/ipc.ts` — one place, no handler registration elsewhere

## Design/UX audits — two separate passes, never one blended review (MAV-253)

A traffic-light/wordmark collision, an un-tokenized search bar color, and an orphaned Settings icon all shipped past multiple past audits because every audit reviewed *content and hierarchy* (copy tone, information density, emotional register) and never the actual pixels of the real running native macOS app. Magic Patterns previews and Storybook screenshots structurally cannot show native title-bar chrome — there are no real traffic lights in a browser tab. Going forward, run these as two distinct, separately-scoped passes — never conflate them:

1. **Mechanical pass (automated, CI-enforced)**: `npm run lint:colors` (fails on any new raw hex/rgba outside `src/renderer/src/styles/globals.css`'s token system) + the native-chrome safe-zone assertion in `src/test/electron/app.test.ts` (part of `npm run test:e2e`). These are binary pass/fail gates, not judgment calls.
2. **Content/tone pass (human or LLM judgment)**: copy, hierarchy, emotional register — same as before, but must run against a screenshot of the real packaged app (via Peekaboo or macos-use, both set up per MAV-251), never a Magic Patterns mockup or Storybook page alone. A mockup review, however careful, cannot catch a bug that only exists once real OS chrome is drawn on top of the renderer's content.

See `src/shared/layout.ts` for the traffic-light safe-zone constants shared between main (`trafficLightPosition`) and renderer (safe-zone padding) — if you ever touch `BrowserWindow` creation or the sidebar wordmark, keep both in sync via that file, not separate hardcoded values.

## Known bugs fixed (do not reintroduce)

- **Returning user 0-chapters bug (fixed 2026-06-29)**: `onboardingComplete: true` used to skip `chapter-inference` forever. Fixed via global `whatsapp.onConnected` listener in `App.tsx`. Covered by `src/test/electron/wdio/returning-user-chapter-detection.test.ts`. If you touch navigation routing in `App.tsx`, run `npm run test:ipc` — the wdio suite will catch regressions.
- **onboardingComplete never set on happy path (fixed 2026-06-30)**: `goYourLoops` in `App.tsx` never patched `onboardingComplete: true` — only the skip button did. Every post-onboarding launch started at the welcome screen. Fixed by making `goYourLoops` async and patching before navigating (`c1d9904`).
- **Chapter detection infinite hang (fixed 2026-06-30)**: `buildTieStrengthMap()` called `fetchMessagesFromWA()` once per DM contact sequentially — hundreds of network calls, indefinite hang, `chapters:detect` IPC never settled. Replaced with `chatStore.conversationTimestamp` recency lookup — completes in microseconds (`5d37be1`). Do not reintroduce any `await getMessages()` call inside `buildTieStrengthMap()`.
- **QR "failed" blink (fixed 2026-06-30)**: Baileys emits `connection.close` with unrecognised status codes during QR handshake. Old code only silently retried known-recoverable codes — unknown codes fell into the else branch and emitted `disconnected` to the renderer, causing a "connection failed" flash. Fix: any `connection.close` before `hasConnectedOnce` is now always retried silently regardless of status code (`aee2ab7`).
- **Infinite reconnect loop (fixed 2026-06-30)**: `setTimeout(() => this.start(), 3000)` retried forever with no budget. Added `MAX_RECONNECT_ATTEMPTS = 8` + exponential backoff (800ms×2^n capped at 15s for pre-connect, 3000ms×1.5^n capped at 60s post-connect). After exhaustion emits `disconnected` with `exhausted: true` (`aee2ab7`).
