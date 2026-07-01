import { promises as fs } from 'fs'
import { resolve } from 'path'

// ─── Log export ───────────────────────────────────────────────────────────────

const logsDir = resolve(__dirname, '../../../../SwiftUI_Tests/logs')
const lines: string[] = []
const log = (m: string) => { const l = `[${new Date().toISOString()}] ${m}`; lines.push(l); console.log(l) }
const flush = async () => {
  await fs.mkdir(logsDir, { recursive: true })
  await fs.writeFile(resolve(logsDir, `atom_states_${Date.now()}.log`), lines.join('\n'))
}

// ─── Test data ────────────────────────────────────────────────────────────────

const CH_ID   = 'test-atoms-ch1'
const C_ID    = 'test-atoms-c1'
const CH_NAME = 'Atom Test Chapter'
const C_NAME  = 'Atom Testperson'

const BASE_CHAPTER = { id: CH_ID, name: CH_NAME, active: true }
const BASE_CONTACT = {
  id: C_ID,
  name: C_NAME,
  whatsappId: '447700900001@s.whatsapp.net',
  tier: 'close' as const,
  chapterIds: [CH_ID],
  intervalDays: 30,
}

async function patchContactState(state: Record<string, unknown>) {
  await browser.execute(async (cId, s) => {
    await window.loop.state.patch({
      contacts: { [cId]: s },
    } as never)
  }, C_ID, state)
  await browser.execute(() => { window.location.reload() })
  await browser.pause(2500)
}

// ─── MAV-96: Atom visual state tests ─────────────────────────────────────────

describe('Atom visual states (MAV-96)', () => {
  after(flush)

  before(async () => {
    log('Seeding base state for atom-state tests')
    await browser.execute(async (chId, cId, chName, cName) => {
      await window.loop.contacts.save({
        id: cId,
        name: cName,
        whatsappId: '447700900001@s.whatsapp.net',
        tier: 'close' as const,
        chapterIds: [chId],
        intervalDays: 30,
      })
      await window.loop.state.patch({
        onboardingComplete: true,
        chapters: [{ id: chId, name: chName, active: true }],
        onThisDayMemory: null,
      } as never)
    }, CH_ID, C_ID, CH_NAME, C_NAME)

    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)
    log('Base state seeded')
  })

  // ── 1. active ──────────────────────────────────────────────────────────────

  it('shows active atom state when contact is healthy', async () => {
    await patchContactState({
      lastContactDate: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago — within 30-day interval
      lastScanAt: new Date().toISOString(),
      nextOccasion: null,
    })

    const atom = await browser.$('[data-atom-state="active"]')
    await atom.waitForExist({ timeout: 5000 })
    log('active atom state confirmed')
  })

  // ── 2. fading ─────────────────────────────────────────────────────────────

  it('shows fading atom state when contact has gone quiet', async () => {
    await patchContactState({
      lastContactDate: new Date(Date.now() - 120 * 86400000).toISOString(), // 120 days — well past 90-day fading threshold
      lastScanAt: new Date().toISOString(),
      nextOccasion: null,
    })

    const atom = await browser.$('[data-atom-state="fading"]')
    await atom.waitForExist({ timeout: 5000 })
    log('fading atom state confirmed')
  })

  // ── 3. dead-thread ────────────────────────────────────────────────────────

  it('shows dead-thread atom state when nextOccasion is dead-thread', async () => {
    await patchContactState({
      lastContactDate: new Date(Date.now() - 18 * 86400000).toISOString(),
      lastScanAt: new Date().toISOString(),
      nextOccasion: {
        type: 'dead-thread',
        date: new Date(Date.now() - 15 * 86400000).toISOString(),
        label: 'Let me know how that goes',
      },
    })

    const atom = await browser.$('[data-atom-state="dead-thread"]')
    await atom.waitForExist({ timeout: 5000 })
    log('dead-thread atom state confirmed')
  })

  // ── 4. birthday-live ──────────────────────────────────────────────────────

  it('shows birthday-live atom state when birthday is within 7 days and contact is active', async () => {
    const bdIso = new Date(Date.now() + 3 * 86400000).toISOString() // 3 days from now
    await patchContactState({
      lastContactDate: new Date(Date.now() - 5 * 86400000).toISOString(), // healthy — not fading
      lastScanAt: new Date().toISOString(),
      nextOccasion: {
        type: 'birthday',
        date: bdIso,
        label: 'Birthday in 3 days',
      },
    })

    const atom = await browser.$('[data-atom-state="birthday-live"]')
    await atom.waitForExist({ timeout: 5000 })
    log('birthday-live atom state confirmed')
  })

  // ── 5. birthday-fading ────────────────────────────────────────────────────

  it('shows birthday-fading atom state when birthday is within 7 days and contact is fading', async () => {
    const bdIso = new Date(Date.now() + 2 * 86400000).toISOString() // 2 days from now
    await patchContactState({
      lastContactDate: new Date(Date.now() - 100 * 86400000).toISOString(), // > 90 days → fading
      lastScanAt: new Date().toISOString(),
      nextOccasion: {
        type: 'birthday',
        date: bdIso,
        label: 'Birthday in 2 days',
      },
    })

    const atom = await browser.$('[data-atom-state="birthday-fading"]')
    await atom.waitForExist({ timeout: 5000 })
    log('birthday-fading atom state confirmed')
  })

  // ── 6. Opening Moment card ────────────────────────────────────────────────

  it('shows Opening Moment card when onThisDayMemory is set and contact is active', async () => {
    await browser.execute(async (cId) => {
      await window.loop.state.patch({
        contacts: {
          [cId]: {
            lastContactDate: new Date(Date.now() - 5 * 86400000).toISOString(),
            lastScanAt: new Date().toISOString(),
            nextOccasion: null,
          },
        },
        onThisDayMemory: {
          contactId: cId,
          contactName: 'Atom Testperson',
          snippet: 'A moment worth remembering.',
          yearsAgo: 2,
          date: new Date(Date.now() - 2 * 365 * 86400000).toISOString(),
        },
      } as never)
    }, C_ID)
    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    const card = await browser.$('*=years ago today')
    await card.waitForExist({ timeout: 5000 })
    log('Opening Moment card visible')
  })

  // ── 7. Settings icon tappable ─────────────────────────────────────────────

  it('tapping Settings icon navigates to Settings screen', async () => {
    // Reset to a clean active state first
    await browser.execute(async (cId) => {
      await window.loop.state.patch({
        contacts: {
          [cId]: {
            lastContactDate: new Date(Date.now() - 5 * 86400000).toISOString(),
            lastScanAt: new Date().toISOString(),
            nextOccasion: null,
          },
        },
        onThisDayMemory: null,
      } as never)
    }, C_ID)
    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    // Find the settings button via aria-label
    const settingsBtn = await browser.$('[aria-label="Settings"]')
    await settingsBtn.waitForExist({ timeout: 5000 })
    await settingsBtn.click()
    await browser.pause(800)

    // Settings screen renders "Settings" heading
    const heading = await browser.$('*=Settings')
    await heading.waitForExist({ timeout: 4000 })
    const displayed = await heading.isDisplayed()
    expect(displayed).toBe(true)
    log('Settings icon tap → Settings screen confirmed')
  })
})
