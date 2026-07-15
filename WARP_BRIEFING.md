# Warp Briefing — Loop

_Generated 2026-06-30. Handoff doc for moving active development from this agent environment into Warp._

## 1. What Loop is

Electron + React desktop app. Connects to WhatsApp (via Baileys), clusters your contacts into "chapters" (periods of life — not WhatsApp groups), and surfaces nudges to reconnect with fading relationships. Pre-beta, targeting a signed/notarized DMG distribution via Lemon Squeezy.

## 2. Where it lives

- **Local working copy:** `/Users/subirpaul/Loop`
- **GitHub repo:** `https://github.com/srpsubir/Loop-V2.git` (origin)
- **Branch:** `main` — currently up to date with `origin/main` (no unpushed commits)
- **Local state file (not in git):** `~/Documents/Loop/state.json` — app data, contacts, chapters. Never edit it outside `src/main/store.ts` logic; manual edits are sometimes used for dev/design-review seeding (see §6).

Point Warp at the local folder directly — it's a normal git working tree, nothing exotic about the clone.

## 3. Read these two files first, in order

1. **`/Users/subirpaul/Loop/CLAUDE.md`** — hard rules: test requirements before calling anything done, architecture constraints (single IPC handler location, single chapter-detection entry point, state.json mutation rules), and a running list of previously-fixed bugs *not* to reintroduce.
2. **`/Users/subirpaul/Loop/Context.md`** — running session log: settled architecture decisions, current phase status, seed data layout, dev runtime rules (kill-before-launch, state reset scripts). Note: this file says "ahead of origin/main by 12 commits, not yet pushed" — that's stale; the repo has since been pushed and is current with origin/main as of this briefing. Treat Context.md as directionally useful but verify branch state yourself (`git status`, `git log`) rather than trusting the prose.

## 4. Uncommitted work in the working tree right now

This is mid-flight and not yet committed — Warp should pick this up rather than treat the tree as clean.

**Modified (staged for nothing, just dirty):**
- `src/main/ipc.ts`, `src/main/whatsapp.ts`, `src/preload/index.ts`, `src/renderer/src/App.tsx`, `src/renderer/src/screens/YourLoopsScreen.tsx`, `src/shared/types.ts`
- `src/test/WhatsAppConnect.test.tsx`, `src/test/whatsapp-connection.test.ts`

**Untracked (new files):**
- `src/renderer/src/ConnectionStateContext.tsx` — new React context, ~3.5KB
- `src/renderer/src/components/ConnectionStatusBadge.tsx` — new component, ~4.9KB
- `DESIGN_REVIEW.md` — 25KB, design notes
- `SwiftUI_Tests/` — separate Swift UI test target (`LoopUITests.swift`, logs)
- `eval/` — promptfoo eval scripts/configs for something LLM-related (`build-eval-data.js`, `fetch-groups.mjs`, `promptfooconfig*.yaml`, result JSON)
- `coverage/`, `results-real.json`, `resources/icon.png.bak` — build/test artifacts, probably safe to ignore or gitignore
- `.claude/` — this agent's local config, not relevant to Warp

The shape of the diff (IPC + whatsapp.ts + new ConnectionStateContext/ConnectionStatusBadge + expanded whatsapp-connection.test.ts) strongly suggests **MAV-171** (WA connection failure-path test suite, listed as a remaining pre-consumer item in Context.md) is in active progress — a connection-state UI layer is being wired up alongside the test suite. Confirm with the user before assuming intent; don't guess and commit.

**Action for Warp:** Run `git status` / `git diff` on arrival to see current state (this may have moved since this doc was generated), and ask the user whether to continue, commit, or discard before doing anything destructive.

## 5. Build, run, test

```bash
npm install            # if node_modules isn't already present
npm run dev             # electron-vite dev — fast iteration
npm run build            # electron-vite build
npm run preview          # run built app
npm run dist             # full DMG build via electron-builder (gated — see CLAUDE.md / below)

npm run test             # vitest unit tests — fast, no build needed
npm run test:e2e         # Playwright + osascript + nutjs — requires build first
npm run test:ipc          # wdio IPC suite — requires build first
npm run test:all          # all three layers, in sequence
npx tsc --noEmit          # typecheck
```

**Hard rule from CLAUDE.md:** run `npm run test:all` before any feature commit (four layers: Vitest, Playwright, osascript, wdio-electron-service). If `npm run test` is red, fix it before anything else — "a torn net catches nothing."

**Dev runtime rule:** never run `npm run preview` without killing existing Electron instances first (multiple instances cause duplicate dock icons and split WA connections):
```bash
ps aux | grep "node_modules/electron" | grep -v grep | awk '{print $2}' | xargs kill 2>/dev/null
sleep 2 && npm run preview &>/tmp/loop-preview.log &
```

**DMG milestone is gated:** only build it once features are shipped + 100% test coverage + everything green. Don't run `npm run dist` casually.

Node version in use locally: `v22.23.1` (`node -v`).

## 6. Architecture constraints (do not violate)

- Chapter = period of life, not a WhatsApp group
- Bipartite projection → Louvain clustering → TF-IDF naming
- Single WA fetch: `buildContactClusters()` returns `{ clusters, groups }`
- `ChapterInferenceScreen` is the only caller of `chapters.detect()`
- `Scanner.run()` scans contacts only — does NOT trigger chapter detection; keep these flows separate
- State lives in `~/Documents/Loop/state.json`, mutated only via `src/main/store.ts`
- IPC handlers live only in `src/main/ipc.ts`

Known-fixed bugs with regression coverage are listed in CLAUDE.md — read before touching navigation routing (`App.tsx`), chapter detection, or WhatsApp connection lifecycle code, since each has a specific prior failure mode and a named test guarding it.

## 7. Product/process conventions Warp should inherit

- No em dashes in any user-facing copy — hard rule.
- All design/scope/architecture decisions need explicit user sign-off before being treated as final — no unilateral calls.
- Front-end screens require a Mobbin → Magic Patterns sign-off pass before any code is written (this is a Claude-Code-specific workflow tied to MCP tools that may not carry over to Warp as-is — flag this to the user if Warp can't replicate it, rather than skipping the design-first step silently).
- At the start of a resumed session, this environment rewrites `Context.md` with a fresh state snapshot. If Warp doesn't have an equivalent habit, consider manually updating `Context.md` (or asking the user how they want session continuity tracked) so the two environments don't drift into inconsistent narratives about repo state.

## 8. Known limitations / non-issues

- Dock tooltip shows "Electron" instead of "Loop" in dev builds — not a bug, fixed by the DMG bundle identity patch in `predev`. Don't chase it.
- Baileys (WhatsApp Web protocol library) is Loop's single biggest structural risk — no engineering action needed pre-beta, but worth monitoring its GitHub for breaking changes upstream.

## 9. Open work / tickets referenced in history

Ticket prefix is `MAV-` (tracked in Linear, not in this repo). Recent/relevant:
- **MAV-171** — WA connection failure-path test suite — likely what the current uncommitted diff is building toward (see §4)
- **MAV-172** — circuit breaker + backoff — DONE
- **MAV-173** — CI workflow — DONE
- **MAV-47** — Apple Developer ID + notarization — DONE, DMG buildable
- **MAV-75** — flagged in memory as "V2-urgent," related to Baileys risk monitoring — verify current status in Linear, not reflected in this repo's history

Don't trust ticket numbers/status above as current truth — cross-check Linear before acting on them.
