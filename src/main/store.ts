import { promises as fs } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { AppState, Contact } from '../shared/types'

export const LOOP_DIR = join(homedir(), 'Documents', 'Loop')
export const STATE_FILE = join(LOOP_DIR, 'state.json')
export const CONTACTS_DIR = join(LOOP_DIR, 'contacts')

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
}

export async function ensureLoopDir(): Promise<void> {
  await fs.mkdir(LOOP_DIR, { recursive: true })
  await fs.mkdir(CONTACTS_DIR, { recursive: true })
}

export async function readState(): Promise<AppState> {
  await ensureLoopDir()
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppState>
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    await writeState(DEFAULT_STATE)
    return { ...DEFAULT_STATE }
  }
}

export async function writeState(state: AppState): Promise<void> {
  await ensureLoopDir()
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
}

export async function patchState(patch: Partial<AppState>): Promise<AppState> {
  const current = await readState()
  const next = { ...current, ...patch }
  await writeState(next)
  return next
}

export async function listContacts(): Promise<Contact[]> {
  await ensureLoopDir()
  try {
    const files = await fs.readdir(CONTACTS_DIR)
    const contacts = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const raw = await fs.readFile(join(CONTACTS_DIR, f), 'utf-8')
          return JSON.parse(raw) as Contact
        })
    )
    return contacts
  } catch {
    return []
  }
}

export async function saveContact(contact: Contact): Promise<Contact> {
  await ensureLoopDir()
  const toSave = contact.tier === 'close' && !contact.intervalDays
    ? { ...contact, intervalDays: 30 }
    : contact
  await fs.writeFile(
    join(CONTACTS_DIR, `${toSave.id}.json`),
    JSON.stringify(toSave, null, 2),
    'utf-8'
  )
  return toSave
}

export async function deleteContact(id: string): Promise<void> {
  await fs.unlink(join(CONTACTS_DIR, `${id}.json`))
}
