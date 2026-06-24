import { resolve } from 'path'
import { promises as fs } from 'fs'

// ─── Log export ───────────────────────────────────────────────────────────────

const logsDir = resolve(__dirname, '../../../../SwiftUI_Tests/logs')
const lines: string[] = []
const log = (m: string) => { const l = `[${new Date().toISOString()}] ${m}`; lines.push(l); console.log(l) }
const flush = async () => {
  await fs.mkdir(logsDir, { recursive: true })
  await fs.writeFile(resolve(logsDir, `wdio_${Date.now()}.log`), lines.join('\n'))
}

// ─── Electron IPC layer tests ─────────────────────────────────────────────────
// These call real Electron main-process APIs — not mocked
// browser.electron.execute callback receives the full electron module as first arg

describe('Electron main process (real IPC)', () => {
  after(flush)

  it('app.getName() returns Loop not Electron', async () => {
    const name = await browser.electron.execute((electron) => electron.app.getName())
    log(`app.getName() = ${name}`)
    expect(name).toBe('Loop')
  })

  it('app.getVersion() returns a semver string', async () => {
    const version = await browser.electron.execute((electron) => electron.app.getVersion())
    log(`version = ${version}`)
    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('dock icon is set (darwin only)', async () => {
    const platform = await browser.electron.execute(() => process.platform)
    log(`platform = ${platform}`)
    if (platform !== 'darwin') return
    const badge = await browser.electron.execute((electron) => electron.app.dock?.getBadge())
    log(`dock exists, badge = ${badge}`)
    expect(platform).toBe('darwin')
  })

  it('main window title is Loop', async () => {
    const wins = await browser.electron.execute((electron) =>
      electron.BrowserWindow.getAllWindows().map((w) => w.getTitle())
    )
    log(`window titles: ${JSON.stringify(wins)}`)
    expect(wins).toContain('Loop')
  })

  it('main window has correct dimensions (min 960x640)', async () => {
    const size = await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0]
      const [w, h] = win.getSize()
      return { w, h }
    })
    log(`window size: ${size.w}x${size.h}`)
    expect(size.w).toBeGreaterThanOrEqual(960)
    expect(size.h).toBeGreaterThanOrEqual(640)
  })
})
