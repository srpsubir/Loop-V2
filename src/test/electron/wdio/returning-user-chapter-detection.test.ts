import { promises as fs } from 'fs'
import { resolve } from 'path'

// ─── Log export ───────────────────────────────────────────────────────────────

const logsDir = resolve(__dirname, '../../../../SwiftUI_Tests/logs')
const lines: string[] = []
const log = (m: string) => { const l = `[${new Date().toISOString()}] ${m}`; lines.push(l); console.log(l) }
const flush = async () => {
  await fs.mkdir(logsDir, { recursive: true })
  await fs.writeFile(resolve(logsDir, `wdio_${Date.now()}.log`), lines.join('\n'))
}

const FAKE_CANDIDATE = {
  waJid: '9876543210@g.us',
  name: 'Berlin Crew',
  memberCount: 4,
  memberJids: ['491700000001@s.whatsapp.net', '491700000002@s.whatsapp.net'],
  lastMessageAt: Math.floor(Date.now() / 1000) - 86400,
  score: 78,
  active: false,
  inferredStartYear: 2021,
  inferredEndYear: null,
}

// ─── Returning-user chapter detection (bug regression) ────────────────────────
// Verifies the fix for: onboardingComplete:true → chapters never detected forever
// Root cause: ChapterInferenceScreen was the only caller of chapters.detect(), and
// App.tsx init routed returning users straight to your-loops, never rendering it.
// Fix: global whatsapp.onConnected listener in App.tsx routes to chapter-inference
// when onboardingComplete && !chapterDetectionComplete && chapters.length === 0.

describe('Returning user chapter detection (MAV-bug-2026-06-29)', () => {
  after(flush)

  before(async () => {
    log('Setting up returning-user state: onboardingComplete but no chapters detected')
    await browser.execute(async () => {
      await window.loop.state.patch({
        onboardingComplete: true,
        whatsappConnected: false,
        chapterDetectionComplete: false,
        chapters: [],
        detectedChapters: [],
        pendingChapters: [],
      } as never)
    })

    // Reload → init runs → should go to your-loops (WA not yet connected)
    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    // Override detect() before WA connect event fires
    await browser.execute((fc) => {
      window.loop.chapters.detect = async () => [fc as never]
    }, FAKE_CANDIDATE)

    log('State set, detect() mocked')
  })

  it('returning user with WA already connected routes to Chapter Inference on init', async () => {
    // Patch whatsappConnected: true before reload to simulate the common case:
    // WA session persists from last run, state.whatsappConnected is already true,
    // the connected event fires before our listener mounts.
    await browser.execute(async () => {
      await window.loop.state.patch({ whatsappConnected: true } as never)
    })
    await browser.execute((fc) => {
      window.loop.chapters.detect = async () => [fc as never]
    }, FAKE_CANDIDATE)

    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    // Re-apply the mock after reload (page context resets on reload)
    await browser.execute((fc) => {
      window.loop.chapters.detect = async () => [fc as never]
    }, FAKE_CANDIDATE)

    const step = await browser.$('*=Step 2 of 5')
    await step.waitForExist({ timeout: 6000 })
    expect(await step.isDisplayed()).toBe(true)
    log('Chapter Inference reached on init when WA already connected — primary bug path PASS')
  })

  it('Chapter Inference shows the fake chapter candidate', async () => {
    const card = await browser.$('*=Berlin Crew')
    await card.waitForExist({ timeout: 5000 })
    expect(await card.isDisplayed()).toBe(true)
    log('Fake chapter card visible on Chapter Inference screen')
  })

  it('when whatsapp:connected fires on a fresh session, app also navigates to Chapter Inference', async () => {
    // Reset to WA not yet connected, then simulate reconnect event
    await browser.execute(async () => {
      await window.loop.state.patch({ whatsappConnected: false } as never)
    })
    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    await browser.execute((fc) => {
      window.loop.chapters.detect = async () => [fc as never]
    }, FAKE_CANDIDATE)

    // Confirm we're on Your Loops (WA not connected)
    const loops = await browser.$('*=Your Loops')
    await loops.waitForExist({ timeout: 5000 })
    log('On Your Loops while WA disconnected — correct')

    // Simulate WA auto-reconnect
    await browser.electron.execute((electron) => {
      const wins = (electron as typeof Electron.CrossProcessExports).BrowserWindow.getAllWindows()
      if (wins[0]) wins[0].webContents.send('whatsapp:connected')
    })
    await browser.pause(2000)

    const step = await browser.$('*=Step 2 of 5')
    await step.waitForExist({ timeout: 5000 })
    expect(await step.isDisplayed()).toBe(true)
    log('Chapter Inference reached after WA reconnect event — PASS')
  })

  it('Chapter Inference shows the fake chapter candidate', async () => {
    const card = await browser.$('*=Berlin Crew')
    await card.waitForExist({ timeout: 5000 })
    expect(await card.isDisplayed()).toBe(true)
    log('Fake chapter card visible on Chapter Inference screen')
  })
})
