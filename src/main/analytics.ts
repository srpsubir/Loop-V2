// PRIVACY RULES — enforced by discipline, not config:
// 1. Never pass contact names, phone numbers, JIDs, or chapter names as properties
// 2. Never call posthog.identify() — install UUID must stay anonymous
// 3. Never call Sentry.setUser() — no identity in crash reports
import * as Sentry from '@sentry/electron/main'
import { PostHog } from 'posthog-node'
import { randomUUID } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'

const LOOP_DIR = join(homedir(), 'Documents', 'Loop')
const ID_FILE = join(LOOP_DIR, 'install-id')

function getOrCreateInstallId(): string {
  try { return readFileSync(ID_FILE, 'utf-8').trim() } catch {}
  const id = randomUUID()
  mkdirSync(LOOP_DIR, { recursive: true })
  writeFileSync(ID_FILE, id)
  return id
}

let phClient: PostHog | null = null
let installId: string

export function initAnalytics(enabled = true): void {
  installId = getOrCreateInstallId()
  // Shut down any existing client before creating a new one (prevents leaked clients on toggle)
  phClient?.shutdown().catch(() => {})
  phClient = null
  if (!enabled) return

  phClient = new PostHog(
    process.env.POSTHOG_KEY ?? 'phc_n0dOeeasCvJXlDAgBv92MbttC4sa1fH3v2UYRaUm5zD',
    { host: 'https://eu.i.posthog.com' }
  )
}

export function initSentry(enabled = true): void {
  Sentry.init({
    dsn: process.env.SENTRY_DSN ?? '',
    enabled,
    tracesSampleRate: 0,
    autoSessionTracking: false,
    sendDefaultPii: false,
    beforeSend(event) {
      delete event.user   // never send identity
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      // Keep category/type for context, strip data payloads that could contain IPC args
      delete breadcrumb.data
      return breadcrumb
    },
  })
  if (enabled) Sentry.setTag('app_version', app.getVersion())
}

export function track(event: string, properties?: Record<string, unknown>): void {
  phClient?.capture({ distinctId: installId, event, properties })
}

export function captureException(err: unknown): void {
  Sentry.captureException(err)
}

export async function shutdownAnalytics(): Promise<void> {
  await phClient?.shutdown()
}
