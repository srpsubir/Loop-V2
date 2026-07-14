import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// Manual, deliberate-only verification harness — NOT part of `npm run
// test:ipc` or `test:all`'s spec glob (see wdio.conf.ts's specs pattern;
// this file lives outside it). Run explicitly with `npm run verify:rescan`.
//
// Why this exists: commit 0814d92 fixed fetchRealGroupMembers() in
// src/main/whatsapp.ts to stop accepting truncated groupMetadata()
// responses as fully successful. That fix can only be confirmed against the
// real, already-linked WhatsApp account — but clicking "Try again" in the
// UI every time a fix in this path needs re-checking doesn't scale. This
// harness launches the real built app (same LOOP_DIR the packaged app
// always uses — the --loop-e2e-test flag only suppresses opening a system
// browser for "Open WhatsApp", it does NOT sandbox LOOP_DIR or the WA
// session) and calls chapters:detect() through the same preload-exposed API
// the "Try again" button itself calls — no new IPC surface, no GUI clicks.
//
// SAFETY: do NOT run this while another Loop instance (npm run dev, or the
// packaged .app) is open. Two processes touching the same Baileys session
// directory at once is the exact corruption mode MAV-252 fixed. This is a
// read-path check only — it never sends a message or mutates WA state.

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

describe('Manual: live group rescan verification', () => {
  it('reconnects to the real WhatsApp account and re-fetches group metadata', async () => {
    const before = readCache()
    const beforeLow = lowMemberGroups(before)
    console.log(`\nBefore rescan: ${beforeLow.length} groups with <=2 members`)
    for (const g of beforeLow) console.log(`  - ${g.name} (${g.members.length})`)

    // Same reconnect the app performs on every normal launch — persisted
    // Baileys auth in whatsapp-auth/, no new QR scan needed.
    await browser.waitUntil(
      async () => {
        const status = await browser.execute(() => (window as any).loop.whatsapp.status())
        return status.status === 'connected'
      },
      { timeout: 90_000, interval: 3000, timeoutMsg: 'WhatsApp did not reconnect to the real session within 90s' }
    )

    // Exactly the call YourLoopsScreen's "Try again" button makes.
    const result = await browser.executeAsync((done: (v: unknown) => void) => {
      ;(window as any).loop.chapters.detect().then(done).catch((e: Error) => done({ error: e.message }))
    })
    if (result && (result as { error?: string }).error) {
      throw new Error(`chapters:detect() failed: ${(result as { error: string }).error}`)
    }

    const after = readCache()
    const afterLow = lowMemberGroups(after)
    console.log(`\nAfter rescan: ${afterLow.length} groups with <=2 members`)
    for (const g of afterLow) console.log(`  - ${g.name} (${g.members.length})`)

    const stillLowIds = new Set(afterLow.map((g) => g.id))
    const resolved = beforeLow.filter((g) => !stillLowIds.has(g.id))
    console.log(`\nResolved: ${resolved.length}/${beforeLow.length} previously-truncated groups now show >2 members`)
    if (resolved.length > 0) {
      console.log('Resolved groups:')
      for (const g of resolved) console.log(`  - ${g.name}`)
    }
  })
})
