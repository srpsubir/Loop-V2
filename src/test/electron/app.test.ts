// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { _electron as electron } from 'playwright-core'
import { resolve, join } from 'path'
import { promises as fs } from 'fs'
import { homedir } from 'os'
import type { ElectronApplication, Page } from 'playwright-core'

// ─── Log export ───────────────────────────────────────────────────────────────

const logsDir = resolve(__dirname, '../../../SwiftUI_Tests/logs')
const logLines: string[] = []

function log(msg: string) {
  const l = `[${new Date().toISOString()}] ${msg}`
  logLines.push(l)
  console.log(l)
}

async function flushLog() {
  await fs.mkdir(logsDir, { recursive: true })
  await fs.writeFile(resolve(logsDir, `playwright_${Date.now()}.log`), logLines.join('\n'))
}

// ─── State file management ────────────────────────────────────────────────────

// MAV-252: mirrors LOOP_DIR in src/main/store.ts (app.getPath('userData') + 'LoopData').
// Computed directly here since this script runs outside a live Electron process
// and can't call app.getPath() itself; 'loop' matches package.json's "name" field,
// which Electron uses as the default app name (and thus userData folder) pre-setName().
const STATE_FILE = join(homedir(), 'Library', 'Application Support', 'loop', 'LoopData', 'state.json')
let savedState: string | null = null

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Loop Electron app (real)', () => {
  let app: ElectronApplication
  let win: Page

  beforeAll(async () => {
    // Reset to fresh state so app always starts on WelcomeScreen
    try { savedState = await fs.readFile(STATE_FILE, 'utf-8') } catch {}
    // MAV-252: LoopData dir may not exist yet at a fresh Application Support
    // location (first run there) — ensureLoopDir() in store.ts isn't reachable
    // from this standalone script, so create it directly.
    await fs.mkdir(join(STATE_FILE, '..'), { recursive: true })
    await fs.writeFile(STATE_FILE, JSON.stringify({ onboardingComplete: false, whatsappConnected: false, privacyAcceptedAt: new Date().toISOString() }, null, 2))

    log('Launching Loop via Playwright')
    app = await electron.launch({
      args: [resolve(__dirname, '../../../out/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test', LOOP_TEST: '1' },
      timeout: 20_000,
    })
    win = await app.firstWindow()
    await win.waitForLoadState('domcontentloaded')
    // Module scripts load async; wait for React to mount before asserting
    await win.waitForSelector('button', { state: 'attached', timeout: 15_000 })
    log(`Window loaded — title: ${await win.title()}`)
  }, 30_000)

  afterAll(async () => {
    await app?.close()
    // Restore original state
    if (savedState) await fs.writeFile(STATE_FILE, savedState)
    await flushLog()
    log('App closed')
  })

  // ── App identity ─────────────────────────────────────────────────────────

  it('window title is Loop not Electron', async () => {
    const title = await win.title()
    log(`title: ${title}`)
    expect(title).toBe('Loop')
  })

  it('app name reported by Electron main process is Loop', async () => {
    const name = await app.evaluate(({ app }) => app.getName())
    log(`app.getName(): ${name}`)
    expect(name).toBe('Loop')
  })

  // ── Onboarding Beat 1 (felt-moment screen) ───────────────────────────────
  // App starts on OnboardingFeltMomentScreen when onboardingComplete=false

  it('felt moment screen shows opening headline', async () => {
    const visible = await win.getByText("There's someone you keep meaning to call.").isVisible()
    log(`felt moment headline visible: ${visible}`)
    expect(visible).toBe(true)
  })

  it('felt moment screen has a continue button', async () => {
    const btn = win.getByRole('button').first()
    const visible = await btn.isVisible()
    log(`continue button visible: ${visible}`)
    expect(visible).toBe(true)
  })

  // ── Navigation ────────────────────────────────────────────────────────────

  it('clicking continue on felt moment navigates to next onboarding screen', async () => {
    await win.getByRole('button').first().click()
    // Beat 2: OnboardingNormaliseScreen — wait for any button to appear
    await win.waitForSelector('button', { state: 'attached', timeout: 8_000 })
    const title = await win.title()
    log(`title after navigation: ${title}`)
    expect(title).toBe('Loop')
  }, 15_000)

  // ── MAV-253: native chrome safe zone ─────────────────────────────────────
  // Regression coverage for the traffic-light/wordmark collision bug. Jumps
  // straight to the post-onboarding shell (where the sidebar wordmark first
  // renders) via the dev-only state:testPatch bypass rather than walking the
  // full onboarding flow again.

  it('sidebar wordmark does not overlap the native traffic-light safe zone', async () => {
    await win.evaluate(async () => {
      // @ts-expect-error — window.loop is injected by preload, not typed in this test's tsconfig
      await window.loop.state.testPatch({ onboardingComplete: true, whatsappConnected: true })
    })
    await win.reload()
    await win.waitForSelector('[data-testid="app-wordmark"]', { state: 'attached', timeout: 10_000 })

    const box = await win.locator('[data-testid="app-wordmark"]').boundingBox()
    log(`wordmark boundingBox: ${JSON.stringify(box)}`)
    expect(box).not.toBeNull()

    // Mirrors src/shared/layout.ts — kept as literals here since this test
    // runs as plain Node/Playwright, outside the app's own module graph.
    const safeZone = { x: 20, y: 20, width: 78, height: 28 }
    const overlapsX = box!.x < safeZone.x + safeZone.width
    const overlapsY = box!.y < safeZone.y + safeZone.height
    log(`overlaps traffic-light safe zone: ${overlapsX && overlapsY}`)
    expect(overlapsX && overlapsY).toBe(false)
  }, 15_000)
})
