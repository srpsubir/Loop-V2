import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// Manual, deliberate-only harness — NOT part of `npm run test:ipc` or
// `test:all`'s spec glob (see wdio.conf.ts's specs pattern; this file lives
// outside it). Run explicitly with `npm run verify:rescan`.
//
// KNOWN LIMITATION, found 2026-07-14: this harness CANNOT drive a live
// rescan against the real WhatsApp session. chromedriver/wdio always
// launches Electron with its own isolated --user-data-dir (standard
// WebDriver profile isolation — not something this project's config
// controls), and Electron's app.getPath('userData') respects that flag, so
// LOOP_DIR resolves to a fresh, empty, throwaway profile every run —
// confirmed directly via the app's own data:getDir() IPC handler below. No
// timeout value fixes this; whatsapp:status can never report 'connected'
// because there's no persisted Baileys auth in that profile to reconnect
// with. Deliberately NOT worked around by overriding app.getPath('userData')
// to point at the real profile — that would let a WebDriver-automated
// instance touch the live Baileys session directly, the same
// two-processes-one-session corruption class MAV-252 already fixed once.
// Until someone explicitly decides that tradeoff is worth it, verifying a
// whatsapp.ts fix against real live data still means clicking "Try again"
// in the actual running app once. This harness is left in place as a
// cache-state inspector (useful on its own — no build/launch needed to
// reason about it, just direct file reads) and as a documented dead end so
// nobody re-derives the isolated-profile discovery from scratch.

const CACHE_PATH = join(homedir(), 'Library', 'Application Support', 'loop', 'LoopData', 'groups-cache.json')

interface CachedGroup { id: string; name: string; members: string[] }
interface GroupCacheFile { writtenAt: number; groups: CachedGroup[] }

function readCache(): CachedGroup[] {
  try {
    const parsed = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as GroupCacheFile
    return parsed.groups ?? []
  } catch {
    return []
  }
}

function lowMemberGroups(groups: CachedGroup[]): CachedGroup[] {
  return groups.filter((g) => g.members.length <= 2)
}

describe('Manual: group cache inspection + isolated-profile confirmation', () => {
  it('reports current low-member-count groups and confirms this harness cannot reach the real session', async () => {
    const cache = readCache()
    const low = lowMemberGroups(cache)
    console.log(`\nCurrent real cache: ${low.length}/${cache.length} groups with <=2 members`)
    for (const g of low) console.log(`  - ${g.name} (${g.members.length})`)

    const dir = await browser.execute(() => (window as any).loop.data.getDir())
    const realDir = join(homedir(), 'Library', 'Application Support', 'loop', 'LoopData')
    console.log(`\n[diagnostic] this run's isolated LOOP_DIR: ${dir}`)
    console.log(`[diagnostic] real session lives at:          ${realDir}`)
    if (dir === realDir) {
      throw new Error(
        'LOOP_DIR unexpectedly matches the real profile — the isolated-profile ' +
        'assumption this harness is built on no longer holds, re-investigate ' +
        'before trusting anything else here.'
      )
    }
    console.log('[diagnostic] confirmed isolated (expected) — see file header for why a live rescan needs the real app UI instead.')
  })
})
