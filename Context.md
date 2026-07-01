# Loop — Session Context

_Last updated: 2026-07-01_

## Current branch state

`main` — in sync with `origin/main`. Latest commit: `773272d` — fix(ipc-tests): convert browser.execute(async) to executeAsync to fix classic-mode race.

No uncommitted changes.

---

## What shipped (committed + pushed to origin/main)

| Item | Commit | Status |
|---|---|---|
| Phase 1 stability fixes | multiple | DONE |
| Navigation fix (onboardingComplete) | `c1d9904` | DONE |
| H1/H2/H3 + MAV-172 circuit breaker | `aee2ab7` | DONE |
| MAV-173: CI workflow | `058189c` | DONE |
| MAV-171: WA connection test suite | `8e1e114` | DONE |
| Auto-update (electron-updater) | `c709870` | DONE |
| UX end-to-end flow fixes | `09d87fd` | DONE |
| MAV-75 Warp/Oz build + revert | `3f89401` / `a66ee1c` | REVERTED |
| MAV-75 correct rebuild | `fb5ff84` | DONE |
| MAV-178: data:deleteAll gate | `c4e909f` | DONE |
| MAV-179 + MAV-180: privacy notice + LLM consent | `32f748f` | DONE |
| MAV-184: chapter removal UI | `c228600` | DONE |
| Design quality fixes (contrast, spacing, shadows) | `176faa3` | DONE |
| Option A static orbit dots + PrivacyNoticeScreen spacing | `13cf73d` | DONE |
| JTBD framing + Context.md | `69922d0` | DONE |
| E2E privacyAcceptedAt gate + vitest.e2e.config.ts | `14ebde7` | DONE |
| IPC executeAsync race fix (Warp) | `773272d` | DONE |

---

## What's pending

### MAV-75 — ConnectionStatusBadge (correct spec)
Design locked. Still pending implementation:
- Top slim bar, ~48px, full width, inline not fixed
- Dot only for color: amber (#f59e0b) reconnecting, soft red (#ef4444) others
- Never dismissible
- Auto-retry on window focus after `failed` (5-min gate)
- New files: `ConnectionStateContext.tsx`, `ConnectionStatusBadge.tsx`
- Update: `App.tsx` (wrap provider), `YourLoopsScreen.tsx` (render badge)

### IPC tests (wdio) — one fix remaining
- Race condition (executeAsync) fixed by Warp — confirmed working (state injection now correct, DOM probe shows `bodyIncludesName: true`)
- Remaining failure: `*=text` selector in wdio Classic mode only matches `<a>` elements, not divs. Fix applied: `data-testid="chapter-name"` added to chapter name div in `YourLoopsScreen.tsx`; test updated to use attribute selector. Not yet re-run to confirm green.
- 4 other wdio specs still `.disabled` — to be re-enabled once ui-navigation is fully green.

### SLM / Your Story (MAV-153)
`node-llama-cpp` in `package.json` but zero imports anywhere. No `inference.ts`. `resolveStory()` in `src/main/scanner.ts:211` always falls through to `generateStory()` (pure string template). V2 priority, intentionally unstarted.

### QuietDayCard P0 bug (from DESIGN_REVIEW.md)
`QuietDayCard` renders unconditionally on YourLoopsScreen. When `chapters = []`, it says "Your people are close." — a false statement. Needs a `chapters.length > 0` guard before rendering QuietDayCard.

### DMG
`npm run dist` — gated on all tests green + features shipped.

---

## Features implemented in code (not pending)

These exist in code and are NOT open design topics — they were built:

| Feature | Files |
|---|---|
| Nostalgia / quiet-day (JTBD 1) | `QuietDayCard.tsx`, `OnThisDay.tsx`, `OpeningMomentCard` in YourLoopsScreen |
| Close tier / fading nudge (JTBD 2) | `ContactTierIndicator.tsx`, `StayCloseScreen.tsx`, `NudgeCard.tsx`, 30-day intervalDays in scanner |
| Dead thread detection | `DeadThreadCard.tsx`, `detectDeadThread()` in scanner |
| Story screen (renamed from Brief) | `StoryScreen.tsx` |

Open questions for these features are UX placement/polish decisions in the new atom architecture (see PRODUCT_CONVERSATIONS.md Topics 3, 4, 11, 12).

---

## Test status

| Layer | Command | Status |
|---|---|---|
| Unit (vitest) | `npm run test` | ✅ 144 passing |
| E2E (Playwright) | `npm run test:e2e` | ⚠️ Fix applied (privacyAcceptedAt), not yet re-run |
| IPC (wdio) | `npm run test:ipc` | ⚠️ Fix in progress (data-testid selector), not yet re-run |

**DMG:** `npm run dist` — unblocked once all tests green.

---

## Architecture decisions (settled)

- Chapter = period of life, not a WhatsApp group
- Bipartite projection → Louvain clustering → TF-IDF naming (ALL IMPLEMENTED in whatsapp.ts + chapters.ts)
- Single WA fetch: `buildContactClusters()` returns `{ clusters, groups }`
- Fallback gate: < 3 clusters → `scoreGroups()`
- Fading orbit = chapter-level
- `isFading` on contact = visual opacity 0.55 in ChapterDetail
- `isNudgeEligible`: close tier + whatsappId + fading + !suppressNudge + 7-day cooldown
- State lives in `~/Documents/Loop/state.json` — only via `store.ts`
- IPC handlers in `src/main/ipc.ts` — one place only

---

## Dev runtime rules

**Kill before launch — always one instance:**
```bash
ps aux | grep "node_modules/electron" | grep -v grep | awk '{print $2}' | xargs kill 2>/dev/null
sleep 2 && npm run preview &>/tmp/loop-preview.log &
```

**State.json reset for detection testing:**
```bash
node -e "
const fs=require('fs'),p=require('path').join(process.env.HOME,'Documents/Loop/state.json');
const s=JSON.parse(fs.readFileSync(p,'utf8'));
s.onboardingComplete=true; s.chapterDetectionComplete=false; s.chapters=[];
fs.writeFileSync(p,JSON.stringify(s,null,2)); console.log('reset done');
"
```

---

## Seed data (dev)

4 chapters in state.json:
- Casa Mañana (active): tomas-k, mia-j, nb-niamh
- Yoga Sceptics (fading): dw-david, cw-clara [clara = nudge eligible]
- Zalando Crew (birthday): bn-ben, rh-rahul, sl-sara [sara bday July 2]
- Edinburgh MSc (echo + birthday): kc-kieran, am-ana, pk-priya [kieran bday July 1, echo = 8 years ago]

---

## Monetisation + distribution (settled)

- Lemon Squeezy (merchant of record, license key)
- MailerLite for pre-launch waitlist only
- DMG: `npm run dist` — unblocked
