# Loop — Session Context
_Updated: 2026-07-07_

---

## START HERE — What's next

| Priority | Item | Notes |
|---|---|---|
| 1 | **DMG milestone** | Gate: features + 100% coverage + all green. Command: `npm run dist` |
| 2 | **MAV-208 Freemium / billing** | Parked pre-DMG. `licenseStatus` field already in state |

---

## Current state (2026-07-07)

**Branch:** main — in sync with remote  
**Tests:** 144/144 vitest ✅ | TypeScript clean ✅ | CI green ✅  
**Latest commits:**
```
fix: mock framer-motion in jsdom tests to unblock screen transitions
feat: skeleton loading states + spring screen transitions  
feat: about screen, version IPC, contrast system (Option E)
feat: chapter moments grid, D-II section pills + white NudgeCard, LP redesign
```

---

## Colour system (locked 2026-07-07)

| Token | Value | Usage |
|---|---|---|
| Ink | `#1A100C` | App background |
| Card surface | `#2C1C14` | Elevated cards (nudge card, modals) |
| Ground | `#F4E7E2` | Primary text |
| Terra Person | `#D4804A` | Avatar rings — person marker |
| Terra Action | `#C8724A` | CTA buttons, active nav border |
| Surface | `#EDD9D2` | Search bar, toolbar |

**Rule:** `#D4804A` = people. `#C8724A` = actions. Never swap. Max 2 Terra uses per screen.

---

## Architecture (locked — do not re-open)

- **Vision:** Dual-layer relationship companion. People layer (stay close, relationship intelligence) + Chapter layer (identity, memory). Co-equal. Neither subordinates the other.
- **Data:** All WhatsApp-derived data stays on device. Local-first, non-negotiable.
- **Account:** Stores ONLY email + googleId + licenseStatus. Nothing else ever.
- **IPC handlers:** All live in `src/main/ipc.ts` — one place only.
- **State:** Lives in `~/Documents/Loop/state.json` — only mutated via `store.ts`.
- **Telemetry:** Sentry (crash) + PostHog (usage). Opt-out in Settings. Default `telemetryEnabled: true` in private beta.
- **`loop-file://`:** Restricted to `~/Documents/Loop` + `~/Pictures`.
- **ChapterInferenceScreen:** Only caller of `chapters.detect()`. Keep separate from Scanner.

---

## Screen names (settled — do not change)

| Screen | Name |
|---|---|
| MAV-201 contact detail | "Their world" |
| Main feed | "Your Loop" |

---

## What shipped this session (2026-07-07)

- **About screen** — founder letter, dark D-II palette, Loop mark, version number, Privacy Policy link. Triggered from macOS app menu "About Loop".
- **Version IPC** — `version:get` wired main → preload → renderer types.
- **Security fixes** — `[DIAG]` block removed, `state:patch` field allowlist, `chapters:confirm` string[] guard, dead invite IPC handlers removed.
- **Contrast system** — Option E locked. Dark nudge card (#2C1C14), avatar rings #D4804A, CTAs #C8724A, sidebar active left-border only.
- **6 contrast fixes** — NudgeCard body 70% Ground, "Remind me later" 55% Ground, solid Terra avatar rings, sidebar active state, chapter card gradient overlay, search bar placeholder.
- **Skeleton loading** — `SkeletonPulse.tsx` created. Replaces "Loading…" in YourLoopsScreen, ChapterDetailScreen, ChapterCrewPickerScreen.
- **Spring transitions** — framer-motion installed. All nav screen changes: fade+slide spring (stiffness 260, damping 20, mass 0.8).
- **framer-motion test mock** — `setup.ts` stubs framer-motion as passthrough in jsdom.

---

## What shipped previously

- MAV-228 — In-app WhatsApp message composer
- MAV-216 — Real Google OAuth sign-in (PKCE + loopback)
- MAV-217 — Privacy-safe analytics (Sentry + PostHog)
- MAV-209/210/211/212/213/205/206/207/214/215 — relationship intelligence, nudge system, chapter crew, story copy, contact picker
- MAV-201 — "Their world" / OnYourMindSection — **already implemented, confirmed in code**

---

## Known limitations (not bugs)

- Dock tooltip shows "Electron" in dev — will show "Loop" in DMG build. Do not chase.
- Two Loop icons in Dock in dev — same reason.

---

## Open bugs

- **#6** Generic crash screen — `crash.log` + Sentry captures root cause. Not yet fixed.

---

## Test commands

```bash
npm run test          # vitest unit tests (fast, always runnable)
npm run test:e2e      # Playwright — requires npm run build first
npm run test:ipc      # wdio IPC suite — requires npm run build first
npm run test:all      # all three layers
npm run dist          # build + sign + notarize DMG (requires .env)
```

---

## .env (gitignored — values in 1Password, never commit)

File lives at `/Users/subirpaul/Loop/.env`. Keys needed:
- `SENTRY_DSN`
- `POSTHOG_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
