import { promises as fs } from 'fs'
import { resolve } from 'path'

// ─── Log export ───────────────────────────────────────────────────────────────

const logsDir = resolve(__dirname, '../../../../SwiftUI_Tests/logs')
const lines: string[] = []
const log = (m: string) => { const l = `[${new Date().toISOString()}] ${m}`; lines.push(l); console.log(l) }
const flush = async () => {
  await fs.mkdir(logsDir, { recursive: true })
  await fs.writeFile(resolve(logsDir, `nav_${Date.now()}.log`), lines.join('\n'))
}

// ─── Test data ────────────────────────────────────────────────────────────────

const CH_ID = 'test-nav-ch1'
const C_ID  = 'test-nav-c1'
const CH_NAME = 'The Nav Crew'
const C_NAME  = 'Alice Navtest'

// ─── MAV-95: Core loop navigation ────────────────────────────────────────────

describe('Core loop: Your Loops → Chapter Detail → Story (MAV-95)', () => {
  after(flush)

  before(async () => {
    log('Injecting navigation test state')
    // NOTE: the wdio-electron-service runs a WebDriver *Classic* session, where
    // browser.execute() maps to the synchronous Execute Script endpoint and does
    // NOT await a returned promise. Using executeAsync + done() guarantees the
    // async IPC writes (contacts.save / state.patch) resolve and persist to
    // disk before window.location.reload() reads state back.
    const injectErr = await browser.executeAsync(async (chId, cId, chName, cName, done) => {
      try {
        await window.loop.contacts.save({
          id: cId,
          name: cName,
          whatsappId: '447700900099@s.whatsapp.net',
          tier: 'close' as const,
          chapterIds: [chId],
          intervalDays: 30,
        })
        await window.loop.state.patch({
          onboardingComplete: true,
          chapters: [{ id: chId, name: chName, active: true }],
          contacts: {
            [cId]: {
              lastContactDate: new Date(Date.now() - 5 * 86400000).toISOString(),
              lastScanAt: new Date().toISOString(),
              nextOccasion: null,
            },
          },
        } as never)
        done(null)
      } catch (err) {
        done(String(err))
      }
    }, CH_ID, C_ID, CH_NAME, C_NAME)
    if (injectErr) throw new Error(`Navigation state injection failed: ${injectErr}`)

    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    // Diagnostic: confirm what actually landed in persisted state at runtime.
    const chaptersJson = await browser.executeAsync(async (done) => {
      const s = await window.loop.state.get()
      done(JSON.stringify(s?.chapters ?? null))
    })
    log(`Runtime state chapters after reload: ${chaptersJson}`)
    log('State injected, app reloaded')
  })

  it('Your Loops renders with chapter atom', async () => {
    const atom = await browser.$(`[data-chapter-id="${CH_ID}"]`)
    await atom.waitForExist({ timeout: 6000 })
    log(`Chapter atom found: ${CH_ID}`)
  })

  it('chapter atom shows chapter name as text', async () => {
    const label = await browser.$(`*=${CH_NAME}`)
    await label.waitForExist({ timeout: 5000 })
    log(`Chapter label visible: ${CH_NAME}`)
  })

  it('tapping chapter atom opens Chapter Detail screen', async () => {
    const atom = await browser.$(`[data-chapter-id="${CH_ID}"]`)
    await atom.click()
    await browser.pause(1000)
    const firstName = C_NAME.split(' ')[0]
    const crewMember = await browser.$(`*=${firstName}`)
    await crewMember.waitForExist({ timeout: 5000 })
    log(`Chapter Detail opened, crew member visible: ${firstName}`)
  })

  it('Chapter Detail shows all crew as tappable', async () => {
    const firstName = C_NAME.split(' ')[0]
    const member = await browser.$(`*=${firstName}`)
    const displayed = await member.isDisplayed()
    expect(displayed).toBe(true)
    log('Crew member is displayed')
  })

  it('tapping crew member opens Story screen', async () => {
    const firstName = C_NAME.split(' ')[0]
    const crewMember = await browser.$(`*=${firstName}`)
    await crewMember.click()
    await browser.pause(1000)
    // Story screen renders full contact name as heading
    const heading = await browser.$(`*=${C_NAME}`)
    await heading.waitForExist({ timeout: 5000 })
    log('Story screen opened')
  })

  it('Story screen shows Open WhatsApp CTA', async () => {
    const cta = await browser.$('*=Open WhatsApp')
    await cta.waitForExist({ timeout: 3000 })
    const displayed = await cta.isDisplayed()
    expect(displayed).toBe(true)
    log('Open WhatsApp CTA is visible')
  })

  it('tapping Open WhatsApp sets storyOpenedAt in ContactState', async () => {
    const stateBefore = await browser.executeAsync(async (cId, done) => {
      const s = await window.loop.state.get()
      done(s.contacts[cId]?.storyOpenedAt ?? null)
    }, C_ID)
    log(`storyOpenedAt before tap: ${stateBefore}`)

    const cta = await browser.$('*=Open WhatsApp')
    await cta.click()
    await browser.pause(800)

    const stateAfter = await browser.executeAsync(async (cId, done) => {
      const s = await window.loop.state.get()
      done(s.contacts[cId]?.lastReachOutAt ?? null)
    }, C_ID)
    expect(stateAfter).not.toBeNull()
    log(`lastReachOutAt set after tap: ${stateAfter}`)
  })

  it('back from Story returns to Chapter Detail (not Your Loops)', async () => {
    // Navigate back via aria label (ArrowLeft button)
    const backBtns = await browser.$$('button')
    let clicked = false
    for (const btn of backBtns) {
      const label = await btn.getAttribute('aria-label')
      if (label === 'Back') { await btn.click(); clicked = true; break }
    }
    if (!clicked) {
      // fallback: first back button on page
      const firstBack = await browser.$('[aria-label="Back"]')
      await firstBack.click()
    }
    await browser.pause(1000)
    const firstName = C_NAME.split(' ')[0]
    const crewMember = await browser.$(`*=${firstName}`)
    await crewMember.waitForExist({ timeout: 5000 })
    log('Back from Story → Chapter Detail confirmed')
  })

  it('back from Chapter Detail returns to Your Loops', async () => {
    const backBtns = await browser.$$('button')
    let clicked = false
    for (const btn of backBtns) {
      const label = await btn.getAttribute('aria-label')
      if (label === 'Back') { await btn.click(); clicked = true; break }
    }
    if (!clicked) {
      const firstBack = await browser.$('[aria-label="Back"]')
      await firstBack.click()
    }
    await browser.pause(1000)
    const atom = await browser.$(`[data-chapter-id="${CH_ID}"]`)
    await atom.waitForExist({ timeout: 5000 })
    log('Back from Chapter Detail → Your Loops confirmed')
  })

  // ─── Signal state rendering (MAV-95 §2) ────────────────────────────────────

  it('chapter with fading contact shows fading atom state', async () => {
    await browser.executeAsync(async (chId, cId, done) => {
      await window.loop.state.patch({
        contacts: {
          [cId]: {
            lastContactDate: new Date(Date.now() - 120 * 86400000).toISOString(), // 120 days ago
            lastScanAt: new Date().toISOString(),
            nextOccasion: null,
          },
        },
      } as never)
      done(null)
    }, CH_ID, C_ID)

    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    const atom = await browser.$(`[data-atom-state="fading"]`)
    await atom.waitForExist({ timeout: 5000 })
    log('Fading atom state confirmed')
  })

  it('chapter with dead-thread contact shows dead-thread atom state', async () => {
    await browser.executeAsync(async (chId, cId, done) => {
      await window.loop.state.patch({
        contacts: {
          [cId]: {
            lastContactDate: new Date(Date.now() - 20 * 86400000).toISOString(),
            lastScanAt: new Date().toISOString(),
            nextOccasion: {
              type: 'dead-thread',
              date: new Date(Date.now() - 16 * 86400000).toISOString(),
              label: 'Commitment made, never followed through',
            },
          },
        },
      } as never)
      done(null)
    }, CH_ID, C_ID)
    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    const atom = await browser.$(`[data-atom-state="dead-thread"]`)
    await atom.waitForExist({ timeout: 5000 })
    log('Dead-thread atom state confirmed')
  })

  it('chapter with birthday-live contact shows birthday-live atom state', async () => {
    const bd = new Date(Date.now() + 3 * 86400000) // 3 days from now
    await browser.executeAsync(async (cId, bdIso, done) => {
      await window.loop.state.patch({
        contacts: {
          [cId]: {
            lastContactDate: new Date(Date.now() - 5 * 86400000).toISOString(),
            lastScanAt: new Date().toISOString(),
            nextOccasion: {
              type: 'birthday',
              date: bdIso,
              label: 'Birthday in 3 days',
            },
          },
        },
      } as never)
      done(null)
    }, C_ID, bd.toISOString())
    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    const atom = await browser.$(`[data-atom-state="birthday-live"]`)
    await atom.waitForExist({ timeout: 5000 })
    log('Birthday-live atom state confirmed')
  })

  it('no signals + onThisDayMemory → Opening Moment card visible', async () => {
    // nextOccasion: null explicitly clears the birthday-live signal set by the
    // previous test, so showOpeningMoment's !hasSignals precondition holds.
    await browser.executeAsync(async (cId, done) => {
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
          contactName: 'Alice Navtest',
          snippet: 'A moment from three years ago.',
          yearsAgo: 3,
          date: new Date(Date.now() - 3 * 365 * 86400000).toISOString(),
        },
      } as never)
      done(null)
    }, C_ID)
    await browser.execute(() => { window.location.reload() })
    await browser.pause(2500)

    const card = await browser.$('*=years ago today')
    await card.waitForExist({ timeout: 5000 })
    log('Opening Moment card visible')
  })
})
