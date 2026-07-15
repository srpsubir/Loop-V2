# IPC Audit — Loop

Audited: 2026-07-05
Files read: `src/main/ipc.ts`, `src/main/scanner.ts`, `src/main/photos.ts`, `src/main/updater.ts`, `src/preload/index.ts`, all files under `src/renderer/src/screens/` and `src/renderer/src/components/`.

---

## Legend

- **Handler**: `ipcMain.handle(channel)` registered in main process
- **Preload**: channel exposed via `contextBridge` in `src/preload/index.ts`
- **Renderer call**: `window.loop.<method>()` called somewhere in renderer source
- **Push event**: main-to-renderer `webContents.send(channel)` with a corresponding `ipcRenderer.on` listener in preload

---

## Wired correctly (handler + preload + renderer call all present)

### Invoke channels

| Channel | Handler file | Renderer caller(s) |
|---|---|---|
| `state:get` | ipc.ts | App.tsx, PeopleScreen, SettingsScreen, StoryScreen, YourLoopsScreen, ChapterDetailScreen, ChapterCrewPickerScreen, OnboardingRevealScreen, StayCloseScreen, ConnectionStateContext |
| `state:patch` | ipc.ts | App.tsx, EmailCaptureScreen, OnboardingBeat3Screen, StayCloseScreen, StoryScreen, YourLoopsScreen, ChapterDetailScreen, ChapterCrewPickerScreen |
| `contacts:list` | ipc.ts | TitlebarSearch, StoryScreen, PeopleScreen, SettingsScreen, ChapterDetailScreen, ChapterCrewPickerScreen, OnboardingRevealScreen, StayCloseScreen |
| `contacts:save` | ipc.ts | SettingsScreen, CrewDetectionScreen, StayCloseScreen, StoryScreen |
| `contacts:delete` | ipc.ts | SettingsScreen, ChapterDetailScreen |
| `whatsapp:start` | ipc.ts | App.tsx, ConnectionStatusBadge |
| `whatsapp:status` | ipc.ts | App.tsx, ConnectionStateContext |
| `whatsapp:disconnect` | ipc.ts | App.tsx, SettingsScreen, ConnectionStateContext |
| `whatsapp:listGroups` | ipc.ts | CrewDetectionScreen |
| `whatsapp:retry` | ipc.ts | ConnectionStateContext, ConnectionStatusBadge |
| `chapters:detect` | ipc.ts | ChapterInferenceScreen |
| `chapters:confirm` | ipc.ts | ChapterInferenceScreen |
| `chapters:setName` | ipc.ts | App.tsx, ChapterDetailScreen |
| `story:open` | ipc.ts | StoryScreen |
| `shell:openWhatsApp` | ipc.ts | StoryScreen, YourLoopsScreen, OnYourMindSection |
| `shell:openExternal` | ipc.ts | YourLoopsScreen |
| `invite:generate` | ipc.ts | SettingsScreen |
| `invite:redeem` | ipc.ts | App.tsx |
| `photos:pickHero` | photos.ts | StoryScreen |
| `photos:pickChapter` | photos.ts | ChapterDetailScreen |
| `data:getDir` | ipc.ts | SettingsScreen |
| `data:deleteAll` | ipc.ts | SettingsScreen |
| `update:install-now` | updater.ts | UpdateBanner, ConnectionStatusBadge |

### Push events (main → renderer)

| Channel | Emitter | Preload listener | Renderer subscriber |
|---|---|---|---|
| `state:changed` | ipc.ts | `state.onChange` | App.tsx, SettingsScreen |
| `whatsapp:qr` | ipc.ts | `whatsapp.onQR` | App.tsx |
| `whatsapp:connected` | ipc.ts | `whatsapp.onConnected` | App.tsx, ConnectionStateContext |
| `whatsapp:disconnected` | ipc.ts | `whatsapp.onDisconnected` | App.tsx, ConnectionStateContext |
| `whatsapp:connection-failed` | ipc.ts | `whatsapp.onConnectionFailed` | ConnectionStateContext |
| `whatsapp:reconnecting` | ipc.ts | `whatsapp.onReconnecting` | ConnectionStateContext |
| `whatsapp:logged-out` | ipc.ts | `whatsapp.onLoggedOut` | ConnectionStateContext |
| `whatsapp:protocol-error` | ipc.ts | `whatsapp.onProtocolError` | ConnectionStateContext |
| `reconnection:detected` | scanner.ts | `onReconnection` | YourLoopsScreen |
| `scan:progress` | scanner.ts | `scan.onProgress` | (no renderer subscriber — see dead section) |
| `scan:complete` | scanner.ts | `scan.onComplete` | (no renderer subscriber — see dead section) |
| `update:available` | updater.ts | `update.onAvailable` | UpdateBanner |
| `update:downloading` | updater.ts | `update.onDownloading` | UpdateBanner |
| `update:ready` | updater.ts | `update.onReady` | UpdateBanner |
| `update:error` | updater.ts | `update.onError` | UpdateBanner |

---

## Dead handlers (defined but never called from renderer)

### 1. `nudge:snooze` — handler in ipc.ts, absent from preload, never called

Registered in `src/main/ipc.ts` (MAV-205). Accepts `{ contactId, days }` and writes `snoozedUntil` to contact state. The preload exposes no `nudge` namespace at all, so the renderer cannot call it. The renderer currently implements snooze by calling `state:patch` directly in `YourLoopsScreen.tsx` (line 423). The dedicated handler is entirely unreachable.

**Fix**: Either expose it in the preload and wire up `YourLoopsScreen`, or remove the handler.

### 2. `scan:run` — handler in scanner.ts, preload exposes it, renderer never invokes it

`registerScanHandlers` registers `scan:run` in `src/main/scanner.ts` (line 557). The preload exposes `scan.run()` (preload line 67). No renderer file ever calls `window.loop.scan.run()`. The scanner is only triggered automatically on `whatsapp:connected`; there is no manual re-scan path from the UI.

Similarly, `scan:progress` and `scan:complete` push events are wired in the preload but no renderer component subscribes to them.

**Fix**: Either add a manual scan trigger in the UI (e.g. SettingsScreen), or remove the preload bridge and direct push-event listeners if a silent background scan is the intended design.

### 3. `analytics:track` — handler in ipc.ts, preload exposes it, renderer never calls it

`ipcMain.handle('analytics:track', ...)` registered in ipc.ts (line 365). Preload exposes `analytics.track()` (preload line 158–160). No renderer file ever calls `window.loop.analytics.track(...)`. All analytics in the renderer appear to be handled in-process (PostHog is likely called in the main process only).

**Fix**: Either wire up renderer-side analytics calls through this bridge, or remove the preload exposure to avoid confusion.

### 4. `update:checking` / `update:not-available` push events — emitted by updater.ts, preload wires them, renderer never subscribes

`updater.ts` emits `update:checking` and `update:not-available`. The preload exposes `update.onChecking` and `update.onNotAvailable`. `UpdateBanner.tsx` never subscribes to either. The banner only reacts to `available`, `downloading`, `ready`, and `error`.

**Fix**: Low priority — these are informational events. Either use them in `UpdateBanner` to show a "Checking..." state, or remove the preload listeners.

---

## Missing handlers (called from preload/renderer but not defined in ipc.ts)

### 1. `calendar:addEvent` — preload exposes it, no ipcMain.handle registered anywhere

The preload (line 103–110) exposes `calendar.addEvent(payload)` which calls `ipcRenderer.invoke('calendar:addEvent', payload)`. There is no `ipcMain.handle('calendar:addEvent', ...)` registered in `ipc.ts`, `scanner.ts`, `photos.ts`, or any other main-process file. No renderer file currently calls `window.loop.calendar.addEvent(...)` either, but the preload bridge is live and any call would fail silently (unhandled IPC returns `undefined`).

**Fix**: Implement the handler in `src/main/ipc.ts` (Calendar integration) or remove the preload stub if the feature is cancelled.

### 2. `model:status` — preload exposes it, no ipcMain.handle registered anywhere

The preload (line 170–172) exposes `model.status()` which calls `ipcRenderer.invoke('model:status')`. No handler for this channel exists in any main-process file. No renderer file currently calls `window.loop.model.status()` either.

**Fix**: Implement the handler (on-device model integration) or remove the preload stub.

---

## Partial wiring issues

### `shell:openWhatsApp` — contactId parameter silently dropped (MAV-212 dead path)

The ipc.ts handler signature is:
```ts
ipcMain.handle('shell:openWhatsApp', async (_e, whatsappId: string, contactId?: string) => {
```
The `contactId` parameter is used to record `lastReachOutAt` on the contact (the MAV-212 reach-out gate). However the preload only forwards one argument:
```ts
openWhatsApp: (whatsappId: string): Promise<void> =>
  ipcRenderer.invoke('shell:openWhatsApp', whatsappId),
```
Every renderer call passes only `whatsappId` (StoryScreen line 221, YourLoopsScreen line 409, OnYourMindSection line 142). `contactId` is always `undefined` in the main process — the `lastReachOutAt` write block never executes.

**Fix**: Update the preload to accept and forward `contactId` as an optional second argument, and update the three renderer call sites to pass it.
