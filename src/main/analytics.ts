import * as Sentry from '@sentry/electron/main'
import { PostHog } from 'posthog-node'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

const SENTRY_DSN =
  'https://42f9e737bb98e9fddd286a9f6b41c59c@o4511537563762688.ingest.de.sentry.io/4511537568022608'

const POSTHOG_KEY = 'phc_n0dOeeasCvJXlDAgBv92MbttC4sa1fH3v2UYRaUm5zD'
const POSTHOG_HOST = 'https://eu.i.posthog.com'

let posthog: PostHog | null = null
let deviceId: string | null = null

function getDeviceId(): string {
  const idPath = join(app.getPath('userData'), 'device-id')
  if (existsSync(idPath)) return readFileSync(idPath, 'utf8').trim()
  const id = randomUUID()
  writeFileSync(idPath, id)
  return id
}

export function initAnalytics(): void {
  Sentry.init({
    dsn: SENTRY_DSN,
    release: app.getVersion(),
    beforeSend(event) {
      if (event.breadcrumbs?.values) {
        event.breadcrumbs.values = event.breadcrumbs.values.map((b) => ({
          type: b.type,
          level: b.level,
          category: b.category,
          message: b.message,
          timestamp: b.timestamp,
          // strip data payloads to prevent accidental PII leakage
        }))
      }
      return event
    },
  })

  deviceId = getDeviceId()

  posthog = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    flushAt: 5,
    flushInterval: 10_000,
  })
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!posthog || !deviceId) return
  posthog.capture({ distinctId: deviceId, event, properties })
}

export function captureException(err: unknown): void {
  Sentry.captureException(err)
}

export async function shutdownAnalytics(): Promise<void> {
  await posthog?.shutdown()
}
