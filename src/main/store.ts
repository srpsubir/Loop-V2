import { promises as fs } from 'fs'
import { join } from 'path'
import * as path from 'path'
import { homedir } from 'os'
import { app } from 'electron'
import type { AppState, Contact } from '../shared/types'

// MAV-252: previously ~/Documents/Loop — moved off iCloud-synced Documents,
// which silently hangs/empties reads when Desktop & Documents sync is unhealthy.
export const LOOP_DIR = join(app.getPath('userData'), 'LoopData')
export const STATE_FILE = join(LOOP_DIR, 'state.json')
export const CONTACTS_DIR = join(LOOP_DIR, 'contacts')

// Pre-MAV-252 location — read only by migrateLegacyLoopDir().
const LEGACY_LOOP_DIR = join(homedir(), 'Documents', 'Loop')

const IO_TIMEOUT_MS = 5000
const MIGRATION_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[store] ${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

// MAV-252: one-time move of legacy ~/Documents/Loop data into the new
// non-synced location. Bounded to MIGRATION_TIMEOUT_MS total so a stuck
// iCloud sync (the exact failure mode this migration exists to escape)
// can never hang app startup — on timeout we abandon remaining entries
// and continue with whatever was migrated (possibly nothing).
export async function migrateLegacyLoopDir(): Promise<void> {
  try {
    await fs.access(STATE_FILE)
    return // already migrated (or already a fresh install with real state)
  } catch { /* fall through to migration attempt */ }

  const doMigration = async () => {
    let legacyEntries: string[]
    try {
      legacyEntries = await fs.readdir(LEGACY_LOOP_DIR)
    } catch {
      return // nothing to migrate
    }
    await fs.mkdir(LOOP_DIR, { recursive: true })
    for (const entry of legacyEntries) {
      try {
        await fs.rename(join(LEGACY_LOOP_DIR, entry), join(LOOP_DIR, entry))
      } catch (err) {
        console.warn(`[store] Failed to migrate legacy item "${entry}" — skipping`, err)
      }
    }
  }

  try {
    await withTimeout(doMigration(), MIGRATION_TIMEOUT_MS, 'legacy data migration')
    console.log('[store] Legacy data migration attempt complete from', LEGACY_LOOP_DIR)
  } catch (err) {
    console.warn('[store] Legacy data migration incomplete (timed out) — continuing with fresh/partial state.', err)
  }
}

const DEFAULT_STATE: AppState = {
  onboardingComplete: false,
  whatsappConnected: false,
  lastScanAt: null,
  scanCooldownHours: 4,
  scanDay: 6,
  notificationsEnabled: true,
  chapters: [],
  detectedChapters: [],
  pendingChapters: [],
  chapterDetectionComplete: false,
  onThisDayMemory: null,
  contacts: {},
  dismissedChapterCandidates: {},
}

export async function ensureLoopDir(): Promise<void> {
  await fs.mkdir(LOOP_DIR, { recursive: true })
  await fs.mkdir(CONTACTS_DIR, { recursive: true })
}

const BACKUP_FILE = STATE_FILE + '.backup'

export async function readState(): Promise<AppState> {
  await ensureLoopDir()
  try {
    const raw = await withTimeout(fs.readFile(STATE_FILE, 'utf-8'), IO_TIMEOUT_MS, 'readState')
    const parsed = JSON.parse(raw) as Partial<AppState>
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    // Primary file missing, corrupt, or read timed out — try backup before resetting
    try {
      const backup = await withTimeout(fs.readFile(BACKUP_FILE, 'utf-8'), IO_TIMEOUT_MS, 'readState backup')
      const parsed = JSON.parse(backup) as Partial<AppState>
      console.warn('[store] state.json corrupt, restored from backup')
      const restored = { ...DEFAULT_STATE, ...parsed }
      await writeState(restored)
      return restored
    } catch {
      console.warn('[store] No valid backup, writing DEFAULT_STATE')
      await writeState(DEFAULT_STATE)
      return { ...DEFAULT_STATE }
    }
  }
}

export async function writeState(state: AppState): Promise<void> {
  await ensureLoopDir()
  // Write to backup before overwriting primary so we can recover from mid-write corruption
  try {
    await withTimeout(fs.copyFile(STATE_FILE, BACKUP_FILE), IO_TIMEOUT_MS, 'writeState backup')
  } catch { /* backup doesn't exist yet, or timed out — fine, not fatal */ }
  await withTimeout(fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8'), IO_TIMEOUT_MS, 'writeState')
}

// Serialise all patchState calls to prevent read-modify-write race conditions
// (scanner and renderer can both call patchState concurrently)
let _patchQueue: Promise<AppState> = Promise.resolve({} as AppState)

export function patchState(patch: Partial<AppState>): Promise<AppState> {
  _patchQueue = _patchQueue.then(async () => {
    const current = await readState()
    const next = { ...current, ...patch }
    await writeState(next)
    return next
  }).catch(async () => {
    const current = await readState()
    const next = { ...current, ...patch }
    await writeState(next)
    return next
  })
  return _patchQueue
}

export async function listContacts(): Promise<Contact[]> {
  await ensureLoopDir()
  try {
    const files = await withTimeout(fs.readdir(CONTACTS_DIR), IO_TIMEOUT_MS, 'listContacts readdir')
    const contacts = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const raw = await withTimeout(fs.readFile(join(CONTACTS_DIR, f), 'utf-8'), IO_TIMEOUT_MS, `listContacts read ${f}`)
          return JSON.parse(raw) as Contact
        })
    )
    return contacts
  } catch {
    return []
  }
}

function safeContactId(id: string): string {
  const safe = path.basename(id).replace(/[^a-z0-9_-]/gi, '')
  if (!safe) throw new Error(`invalid contact id: ${id}`)
  return safe
}

export async function saveContact(contact: Contact): Promise<Contact> {
  await ensureLoopDir()
  const toSave = contact.tier === 'close' && !contact.intervalDays
    ? { ...contact, intervalDays: 30 }
    : contact
  await withTimeout(
    fs.writeFile(
      join(CONTACTS_DIR, `${safeContactId(toSave.id)}.json`),
      JSON.stringify(toSave, null, 2),
      'utf-8'
    ),
    IO_TIMEOUT_MS,
    'saveContact'
  )
  return toSave
}

export async function deleteContact(id: string): Promise<void> {
  await fs.unlink(join(CONTACTS_DIR, `${safeContactId(id)}.json`))
}
