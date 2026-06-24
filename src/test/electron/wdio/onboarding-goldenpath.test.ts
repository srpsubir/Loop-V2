import { promises as fs } from 'fs'
import { resolve } from 'path'

// ─── Log export ───────────────────────────────────────────────────────────────

const logsDir = resolve(__dirname, '../../../../SwiftUI_Tests/logs')
const lines: string[] = []
const log = (m: string) => { const l = `[${new Date().toISOString()}] ${m}`; lines.push(l); console.log(l) }
const flush = async () => {
  await fs.mkdir(logsDir, { recursive: true })
  await fs.writeFile(resolve(logsDir, `onboarding_${Date.now()}.log`), lines.join('\n'))
}

// ─── Fake chapter candidate ────────────────────────────────────────────────────

const FAKE_CANDIDATE = {
  waJid: '1234567890@g.us',
  name: 'Edinburgh Uni Friends',
  memberCount: 3,
  memberJids: ['447700900001@s.whatsapp.net', '447700900002@s.whatsapp.net'],
  lastMessageAt: Math.floor(Date.now() / 1000) - 86400,
  score: 82,
  active: false,
  inferredStartYear: 2016,
  inferredEndYear: 2020,
}

// ─── MAV-94: Onboarding golden path ──────────────────────────────────────────

describe('Onboarding golden path (MAV-94)', () => {
  after(flush)

  before(async () => {
    log('Resetting state for onboarding golden path')
    await browser.execute(async () => {
      await window.loop.state.patch({
        onboardingComplete: false,
        whatsappConnected: false,
        emailCaptured: false,
        chapters: [],
        detectedChapters: [],
        pendingChapters: [],
        contacts: {},
        onThisDayMemory: null,
      } as never)
    })
    // Reload to land on Welcome screen
    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)
    // Override detect() with fake candidate AFTER reload so it's in place when chapter inference mounts
    await browser.execute((fc) => {
      window.loop.chapters.detect = async () => [fc as never]
    }, FAKE_CANDIDATE)
    log('State reset, detect() overridden')
  })

  // ── Welcome screen ────────────────────────────────────────────────────────

  it('Welcome renders tagline', async () => {
    const tagline = await browser.$('*=Every chapter of your life')
    await tagline.waitForExist({ timeout: 5000 })
    const displayed = await tagline.isDisplayed()
    expect(displayed).toBe(true)
    log('Welcome tagline confirmed')
  })

  it('Connect WhatsApp CTA button is present on Welcome screen', async () => {
    const cta = await browser.$('button*=Connect WhatsApp')
    await cta.waitForExist({ timeout: 4000 })
    expect(await cta.isDisplayed()).toBe(true)
    log('Connect WhatsApp CTA found')
  })

  it('tapping Connect WhatsApp navigates to Connect screen', async () => {
    const cta = await browser.$('button*=Connect WhatsApp')
    await cta.click()
    await browser.pause(800)
    // Connect screen heading
    const heading = await browser.$('*=Connect WhatsApp')
    await heading.waitForExist({ timeout: 5000 })
    log('WhatsApp Connect screen visible')
  })

  it('privacy copy is visible on Connect screen', async () => {
    const privacy = await browser.$('*=Everything stays on your Mac')
    await privacy.waitForExist({ timeout: 4000 })
    expect(await privacy.isDisplayed()).toBe(true)
    log('Privacy copy confirmed on Connect screen')
  })

  it('simulating whatsapp:connected navigates to Chapter Inference', async () => {
    // Send the connected IPC event from the main process
    await browser.electron.execute((electron) => {
      const wins = (electron as typeof Electron.CrossProcessExports).BrowserWindow.getAllWindows()
      if (wins[0]) wins[0].webContents.send('whatsapp:connected')
    })
    // Wait for the 800ms delay in WhatsApp connect screen + navigation
    await browser.pause(2000)
    const step = await browser.$('*=Step 2 of 5')
    await step.waitForExist({ timeout: 5000 })
    log('Chapter Inference "Step 2 of 5" confirmed')
  })

  it('Chapter Inference shows fake chapter card', async () => {
    const card = await browser.$('*=Edinburgh Uni Friends')
    await card.waitForExist({ timeout: 5000 })
    log('Fake chapter card visible')
  })

  it('confirming fake chapter navigates to Crew Detection (Step 3 of 5)', async () => {
    // Toggle the chapter card to select it
    const card = await browser.$('*=Edinburgh Uni Friends')
    await card.click()
    await browser.pause(300)

    // Click "These are my chapters (1)"
    const confirmBtn = await browser.$('button*=These are my chapters')
    await confirmBtn.waitForExist({ timeout: 4000 })
    await confirmBtn.click()
    await browser.pause(1200)

    // Crew Detection step 0 should now be visible
    const step3 = await browser.$('*=Step 3 of 5')
    await step3.waitForExist({ timeout: 6000 })
    log('Crew Detection "Step 3 of 5" confirmed')
  })

  it('Crew Detection shows Your people are already in your groups headline', async () => {
    const headline = await browser.$('*=Your people are already')
    await headline.waitForExist({ timeout: 4000 })
    expect(await headline.isDisplayed()).toBe(true)
    log('Crew Detection step 0 headline confirmed')
  })

  it('Crew Detection step 0 has Skip for now CTA', async () => {
    const skip = await browser.$('button*=Skip for now')
    await skip.waitForExist({ timeout: 4000 })
    expect(await skip.isDisplayed()).toBe(true)
    log('Crew Detection "Skip for now" confirmed')
  })

  it('scanning groups advances to group assignment step', async () => {
    const scanBtn = await browser.$('button*=Scan my groups')
    await scanBtn.click()
    await browser.pause(1500)

    // Step 1 should show group assignment UI — mock groups are used
    const groupSection = await browser.$('*=Which chapters do these belong to')
    await groupSection.waitForExist({ timeout: 5000 })
    log('Crew Detection step 1 (group assignment) visible')
  })

  it('assigns first group to a chapter and advances to crew grid', async () => {
    // Click the first "Assign chapter" pill to open the dropdown
    const pills = await browser.$$('button*=Assign chapter')
    expect(pills.length).toBeGreaterThan(0)
    await pills[0].click()
    await browser.pause(400)

    // Click the first chapter option in the dropdown (MOCK_CHAPTERS: "Edinburgh years")
    const chapterOption = await browser.$('button*=Edinburgh years')
    await chapterOption.waitForExist({ timeout: 3000 })
    await chapterOption.click()
    await browser.pause(300)

    // "Add 1 group →" button should now be enabled
    const addBtn = await browser.$('button*=Add 1 group')
    await addBtn.waitForExist({ timeout: 3000 })
    await addBtn.click()
    await browser.pause(1200)

    // Step 2: crew member grid
    const crewHeading = await browser.$('*=Your crew')
    await crewHeading.waitForExist({ timeout: 5000 })
    log('Crew member grid (step 2) visible')
  })

  it('completing crew detection navigates to Email Capture', async () => {
    // Step 2 CTA: "Add N people to Your Loop →" — all members selected by default
    const addPeopleBtn = await browser.$('button*=to Your Loop')
    await addPeopleBtn.waitForExist({ timeout: 4000 })
    await addPeopleBtn.click()
    await browser.pause(2000)

    // Should land on email capture (no unnamed chapters → goEmailCapture)
    const heading = await browser.$('*=One last thing')
    await heading.waitForExist({ timeout: 6000 })
    log('Email Capture screen visible after crew detection complete')
  })

  it('Email Capture shows Step 5 of 5 and Skip for now', async () => {
    const step5 = await browser.$('*=Step 5 of 5')
    await step5.waitForExist({ timeout: 4000 })
    expect(await step5.isDisplayed()).toBe(true)

    const skipBtn = await browser.$('button*=Skip for now')
    await skipBtn.waitForExist({ timeout: 4000 })
    expect(await skipBtn.isDisplayed()).toBe(true)
    log('Email Capture step indicator and Skip confirmed')
  })

  it('skipping email capture lands on Your Loops', async () => {
    const skipBtn = await browser.$('button*=Skip for now')
    await skipBtn.click()
    await browser.pause(1200)

    // Your Loops heading is always rendered
    const loops = await browser.$('*=Your Loops')
    await loops.waitForExist({ timeout: 5000 })
    expect(await loops.isDisplayed()).toBe(true)
    log('Your Loops screen reached after completing onboarding')
  })
})
