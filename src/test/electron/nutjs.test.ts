// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import { resolve } from 'path'
import { promises as fs } from 'fs'
import type { ChildProcess } from 'child_process'

// ─── Log export ───────────────────────────────────────────────────────────────

const logsDir = resolve(__dirname, '../../../SwiftUI_Tests/logs')
const lines: string[] = []
const log = (m: string) => { const l = `[${new Date().toISOString()}] ${m}`; lines.push(l); console.log(l) }

let electronProc: ChildProcess

beforeAll(async () => {
  const electronBin = resolve(__dirname, '../../../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
  const mainEntry = resolve(__dirname, '../../../out/main/index.js')
  electronProc = spawn(electronBin, [mainEntry], { detached: false, stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 4000))
  log('Electron launched for nut.js tests')
}, 20_000)

afterAll(async () => {
  electronProc?.kill()
  await fs.mkdir(logsDir, { recursive: true })
  await fs.writeFile(resolve(logsDir, `nutjs_${Date.now()}.log`), lines.join('\n'))
})

// ─── Screen / window layer tests ─────────────────────────────────────────────

describe('Screen layer (nut.js)', () => {
  it('a window titled Loop exists on screen', async () => {
    const { getWindows } = await import('@nut-tree-fork/nut-js')
    const windows = await getWindows()
    const titles: string[] = []
    for (const w of windows) {
      try { titles.push(await w.getTitle()) } catch { /* skip */ }
    }
    log(`open windows: ${JSON.stringify(titles)}`)
    expect(titles.some((t) => t === 'Loop')).toBe(true)
  }, 15_000)

  it('Loop window has non-zero dimensions', async () => {
    const { getWindows } = await import('@nut-tree-fork/nut-js')
    const windows = await getWindows()
    for (const w of windows) {
      try {
        const title = await w.getTitle()
        if (title !== 'Loop') continue
        const region = await w.getRegion()
        log(`Loop window region: ${JSON.stringify(region)}`)
        expect(region.width).toBeGreaterThan(0)
        expect(region.height).toBeGreaterThan(0)
        return
      } catch { /* skip */ }
    }
    throw new Error('Loop window not found')
  }, 15_000)
})
