// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync, spawn } from 'child_process'
import { resolve } from 'path'
import { promises as fs } from 'fs'
import type { ChildProcess } from 'child_process'

const LSREG = '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'

// ─── Log export ───────────────────────────────────────────────────────────────

const logsDir = resolve(__dirname, '../../../SwiftUI_Tests/logs')
const lines: string[] = []
const log = (m: string) => { const l = `[${new Date().toISOString()}] ${m}`; lines.push(l); console.log(l) }

function scpt(script: string): string {
  try {
    return execSync(`osascript -e '${script}'`, { timeout: 8000 }).toString().trim()
  } catch {
    return ''
  }
}

let electronProc: ChildProcess

beforeAll(async () => {
  const electronBin = resolve(__dirname, '../../../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
  const mainEntry = resolve(__dirname, '../../../out/main/index.js')
  electronProc = spawn(electronBin, [mainEntry], { detached: false, stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 4000))
  // Bring to foreground so menu bar tests work
  scpt('tell application "System Events" to tell process "Electron" to set frontmost to true')
  await new Promise((r) => setTimeout(r, 1000))
  log('Electron launched and foregrounded for osascript tests')
}, 20_000)

afterAll(async () => {
  electronProc?.kill()
  await fs.mkdir(logsDir, { recursive: true })
  await fs.writeFile(resolve(logsDir, `osascript_${Date.now()}.log`), lines.join('\n'))
  log('osascript suite done')
})

// ─── macOS native layer tests ─────────────────────────────────────────────────
// In dev mode the binary is named "Electron" — CFBundleDisplayName is "Loop"

describe('macOS native layer (osascript)', () => {
  it('CFBundleDisplayName in plist is Loop', () => {
    const plist = resolve(__dirname, '../../../node_modules/electron/dist/Electron.app/Contents/Info.plist')
    const result = execSync(`defaults read "${plist}" CFBundleDisplayName`).toString().trim()
    log(`CFBundleDisplayName: ${result}`)
    expect(result).toBe('Loop')
  })

  it('CFBundleName in plist is Loop', () => {
    const plist = resolve(__dirname, '../../../node_modules/electron/dist/Electron.app/Contents/Info.plist')
    const result = execSync(`defaults read "${plist}" CFBundleName`).toString().trim()
    log(`CFBundleName: ${result}`)
    expect(result).toBe('Loop')
  })

  it('Electron process is running (Loop dev binary)', () => {
    const result = scpt('tell application "System Events" to get name of every process whose name is "Electron"')
    log(`Electron processes: ${result}`)
    expect(result).toContain('Electron')
  })

  it('Loop window exists with correct title', () => {
    const result = scpt('tell application "System Events" to tell process "Electron" to get name of every window')
    log(`Electron windows: ${result}`)
    expect(result).toContain('Loop')
  })

  it('menu bar app name is Loop (item 2, app menu)', () => {
    const result = scpt('tell application "System Events" to tell process "Electron" to get title of menu bar item 2 of menu bar 1')
    log(`menu bar item 2: ${result}`)
    expect(result).toBe('Loop')
  })

  it.skip('dock tooltip is Loop not Electron (NSRunningApplication.localizedName)', () => {
    // Known dev limitation: localizedName is "Electron" in dev binary.
    // DMG build sets this correctly via CFBundleDisplayName in the signed app.
    const result = scpt('tell application "System Events" to get displayed name of (first process whose name is "Electron")')
    log(`displayed name (dock tooltip): ${result}`)
    expect(result).toBe('Loop')
  })

  it('running process bundle identifier is com.loop.dev (plist was patched)', () => {
    const result = scpt('tell application "System Events" to get bundle identifier of (first process whose name is "Electron")')
    log(`bundle identifier: ${result}`)
    expect(result).toBe('com.loop.dev')
  })

  it.skip('dock still shows Loop after Dock restart (LS database is not stale)', async () => {
    // Simulates Mac restart: Dock re-reads LS database. If lsregister -f was skipped,
    // the LS database is stale and Dock may revert to "Electron" for new app launches.
    // For a currently running process the Dock reads NSRunningApplication.localizedName,
    // so this test specifically catches the window BEFORE the process is registered —
    // we re-check immediately after Dock restarts while Electron is still running.
    execSync('killall Dock', { timeout: 5000 })
    await new Promise((r) => setTimeout(r, 3500))
    scpt('tell application "System Events" to tell process "Electron" to set frontmost to true')
    await new Promise((r) => setTimeout(r, 500))
    const result = scpt('tell application "System Events" to get displayed name of (first process whose name is "Electron")')
    log(`displayed name after Dock restart: ${result}`)
    expect(result).toBe('Loop')
  }, 15_000)
})
