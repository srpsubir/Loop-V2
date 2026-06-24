# Loop — Session Context

_Last updated: 2026-06-24_

## Active Linear tickets

| Ticket | Title | Status |
|--------|-------|--------|
| MAV-47 | Apple Developer ID + notarization | In Progress — blocked on $99 Apple enrolment |
| MAV-103 | Remove Claude API (no WA content off device) | **Done this session** |
| MAV-75 | Baileys resilience + connector architecture | Backlog — updated with full connector plan |
| MAV-150 | Positioning — loneliness/life transitions | Backlog — created this session |
| MAV-151 | Stay Close — onboarding selection + nudge | Backlog — created this session. MP signed off. |
| MAV-78 | On-device story inference (Ollama/SLM) | Backlog — blocked by MAV-103 (now done) |
| MAV-98 | Echoes card | Waiting for dev implementation |
| MAV-91 | Referral mechanic | Waiting for dev implementation |

## Completed this session

- **MAV-103 shipped**: `generateBrief` → `generateStory` (template-based, fully local). `claude.ts` deleted. No message content leaves the device.
- **Full Brief → Story rename**: `types.ts` (`Brief` → `Story`, `brief` → `story`, `briefOpenedAt` → `storyOpenedAt`), `scanner.ts`, `ipc.ts`, `preload/index.ts`, `env.d.ts`, `StoryScreen.tsx`, `GardenScreen.tsx`, `ChapterScreen.tsx`, `ChapterDetailScreen.tsx`, test files. `BriefScreen.tsx` deleted.
- **MAV-105** marked Done in Linear.
- **MAV-74** (Gmail) + **MAV-76** (Telegram) cancelled — rationale written into descriptions.
- **MAV-150/151** created in Linear.
- **Workflow update**: CD removed (too expensive). New flow: Mobbin (via MCP) → Magic Patterns (MP has Mobbin integration, include queries in prompt) → sign-off → Claude Code.
- **MP workflow**: `get_editor_id_from_url` → `get_design_status` → `read_artifact_files`. Always need URL first.
- **Stay Close selection flow**: MP design at magicpatterns.com/c/5z5xspe9dykdnikmekypwu — signed off.
- **Nudge screen**: "Stay Close - Direction A" in cd-exports — signed off.

## Uncommitted local changes (need commit)

All MAV-103 + rename changes are LOCAL, not committed. Key changed files:
- `src/main/scanner.ts` — generateStory (template), no Claude
- `src/main/ipc.ts` — story:open handler, no claude:ask
- `src/main/store.ts` — saveContact() auto-sets intervalDays:30 for Close tier (from earlier session, still uncommitted)
- `src/preload/index.ts` — story bridge
- `src/renderer/src/env.d.ts` — Story type, story bridge
- `src/renderer/src/screens/StoryScreen.tsx` — story field references
- `src/renderer/src/screens/GardenScreen.tsx` — onOpenStory, story field
- `src/renderer/src/screens/ChapterScreen.tsx` — onOpenStory
- `src/renderer/src/screens/ChapterDetailScreen.tsx` — story field
- `src/shared/types.ts` — Story interface, story field, storyOpenedAt
- `src/test/WhatsAppConnect.test.tsx` — story mock
- `src/test/electron/wdio/ui-navigation.test.ts` — storyOpenedAt
- `src/main/claude.ts` — DELETED
- `src/renderer/src/screens/BriefScreen.tsx` — DELETED

## Pending decisions

1. **MAV-78 approach** — SLM 1.5B (Qwen2.5) recommended. One-time ~900MB download, on-device, CAN use message content (privacy safe). Templates are alpha-only stopgap.
2. **Commit** — all MAV-103 + rename changes ready to commit, not done yet this session.

## Parked

- MAV-97: Freemium gate
- MAV-100: MailerLite — until beta
- Navi tickets (MAV-111+) — separate product, ignore in Loop sessions

## Open design topics (need MP sessions)

1. Nostalgia/quiet-day register
2. Warm/Close tier UX
3. Dead thread/second loop
4. "On your mind" CTA
