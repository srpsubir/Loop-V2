import { BrowserWindow, ipcMain } from 'electron'
import { listContacts, readState, patchState } from './store'
import ClaudeClient from './claude'
import WhatsAppManager from './whatsapp'
import { track } from './analytics'
import type { Contact, ContactState, Occasion, Brief, Chapter, OnThisDayMemory } from '../shared/types'
import type { WAMessage } from './whatsapp'

// ─── Message filters ──────────────────────────────────────────────────────────

export function isRealMessage(msg: WAMessage): boolean {
  if (!msg.text) return false
  const text = msg.text.trim()
  if (text.length <= 2) return false
  // Strip variation selectors, ZWJ, and keycap combiners before emoji check
  const stripped = text.replace(/[\u{FE0F}\u{20E3}\u{200D}]/gu, '')
  if (/^\p{Emoji}+$/u.test(stripped)) return false
  if (['[Voice Note]', '[Sticker]', '[Image]', '[Video]'].includes(text)) return false
  return true
}

// ─── Occasion computation ─────────────────────────────────────────────────────

export function computeNextOccasion(
  contact: Contact,
  lastContactDate: string | null
): Occasion | null {
  const today = new Date()
  const candidates: Array<{ urgency: number; occasion: Occasion }> = []

  // Birthday
  if (contact.birthday) {
    const { month, day } = contact.birthday
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    let bd = new Date(today.getFullYear(), month - 1, day)
    if (bd < todayMidnight) bd = new Date(today.getFullYear() + 1, month - 1, day)
    const daysUntil = Math.round((bd.getTime() - todayMidnight.getTime()) / 86400000)
    if (daysUntil <= 30) {
      candidates.push({
        urgency: 1000 - daysUntil,
        occasion: {
          type: 'birthday',
          date: bd.toISOString(),
          label:
            daysUntil === 0
              ? 'Birthday today!'
              : daysUntil === 1
                ? 'Birthday tomorrow'
                : `Birthday in ${daysUntil} days`,
        },
      })
    }
  }

  // Interval overdue (close tier)
  if (contact.tier === 'close' && contact.intervalDays && lastContactDate) {
    const last = new Date(lastContactDate)
    const daysSince = Math.floor((today.getTime() - last.getTime()) / 86400000)
    if (daysSince >= contact.intervalDays) {
      candidates.push({
        urgency: daysSince - contact.intervalDays,
        occasion: {
          type: 'interval',
          date: today.toISOString(),
          label:
            daysSince === 1
              ? 'You spoke yesterday — keep the momentum'
              : daysSince < 7
                ? `${daysSince} days since you last spoke`
                : daysSince < 30
                  ? `${Math.floor(daysSince / 7)} weeks since you last spoke`
                  : `${Math.floor(daysSince / 30)} months since you last spoke`,
        },
      })
    }
  }

  candidates.sort((a, b) => b.urgency - a.urgency)
  return candidates[0]?.occasion ?? null
}

// ─── Reach-out detection ──────────────────────────────────────────────────────

function detectReachOut(
  prevState: ContactState | null,
  messages: WAMessage[]
): string | null {
  if (!prevState?.briefOpenedAt) return null
  const openedAtSeconds = new Date(prevState.briefOpenedAt).getTime() / 1000
  const outgoing = messages.find(
    (m) => m.fromMe && isRealMessage(m) && m.timestamp > openedAtSeconds
  )
  return outgoing ? new Date(outgoing.timestamp * 1000).toISOString() : null
}

// ─── Brief generation ─────────────────────────────────────────────────────────

async function generateBrief(
  contact: Contact,
  messages: WAMessage[],
  chapters: Chapter[]
): Promise<Brief> {
  const chapterNames = chapters
    .filter((ch) => contact.chapterIds.includes(ch.id))
    .map((ch) => `${ch.name}${ch.location ? ` (${ch.location})` : ''}`)
    .join(', ')

  const recentMessages = messages
    .filter(isRealMessage)
    .slice(0, 10)
    .map((m) => `${m.fromMe ? 'You' : contact.name.split(' ')[0]}: ${(m.text ?? '').slice(0, 200)}`)
    .join('\n')

  const system = `You are Loop — a warm personal memory assistant. You write like a thoughtful friend, not an app. Be specific and human.`

  const user = `${contact.name} is someone the user cares about. Life chapters shared: ${chapterNames || 'unknown'}.

Recent messages (newest first):
${recentMessages || '(no recent messages available)'}

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "contextLines": ["sentence 1", "sentence 2"],
  "reasonToReachOut": "one sentence"
}

contextLines: 2 warm sentences about this relationship. Use specific details from messages if available. Otherwise write something human and warm about staying close.
reasonToReachOut: why NOW is a good time — reference time elapsed or something from the conversation.`

  try {
    const raw = await ClaudeClient.getInstance().ask(system, user)
    const cleaned = raw.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleaned) as { contextLines: string[]; reasonToReachOut: string }
    return {
      generatedAt: new Date().toISOString(),
      contextLines: Array.isArray(parsed.contextLines) ? parsed.contextLines : [],
      reasonToReachOut: typeof parsed.reasonToReachOut === 'string' ? parsed.reasonToReachOut : '',
    }
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      contextLines: [`${contact.name} is someone worth staying close to.`],
      reasonToReachOut: 'A good time to check in.',
    }
  }
}

// ─── On This Day ─────────────────────────────────────────────────────────────

function isAnniversaryWindow(msgDate: Date, today: Date): boolean {
  // Compare month/day position independent of year, within ±7 days
  const sameYear = new Date(msgDate.getFullYear(), today.getMonth(), today.getDate())
  return Math.abs(msgDate.getTime() - sameYear.getTime()) / 86400000 <= 7
}

async function generateOnThisDaySnippet(
  contact: Contact,
  msg: WAMessage,
  yearsAgo: number
): Promise<string> {
  const firstName = contact.name.split(' ')[0]
  const text = (msg.text ?? '').slice(0, 300)
  const system = 'You are Loop — a warm personal memory assistant. Be brief and human.'
  const user = `${yearsAgo} year${yearsAgo === 1 ? '' : 's'} ago today, ${firstName} sent: "${text}"

Write ONE warm sentence (under 20 words) evoking this moment. No output quotes. Past tense.`
  try {
    const raw = await ClaudeClient.getInstance().ask(system, user)
    return raw.trim().replace(/^["']|["']$/g, '').slice(0, 120)
  } catch {
    return `A moment from ${yearsAgo} year${yearsAgo === 1 ? '' : 's'} ago today.`
  }
}

// ─── Scanner singleton ────────────────────────────────────────────────────────

class Scanner {
  private static instance: Scanner
  private running = false
  private getWindow: (() => BrowserWindow | null) | null = null

  static getInstance(): Scanner {
    if (!Scanner.instance) Scanner.instance = new Scanner()
    return Scanner.instance
  }

  init(getWindow: () => BrowserWindow | null): void {
    this.getWindow = getWindow
  }

  private send(channel: string, ...args: unknown[]): void {
    this.getWindow?.()?.webContents.send(channel, ...args)
  }

  async run(): Promise<void> {
    if (this.running) {
      console.log('[Scanner] Already running, skipping.')
      return
    }
    this.running = true

    try {
      const [contacts, state] = await Promise.all([listContacts(), readState()])
      const wa = WhatsAppManager.getInstance()
      const now = new Date().toISOString()
      const today = new Date()
      const updatedContacts = { ...state.contacts }
      let onThisDayMemory: OnThisDayMemory | null = null

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i]
        this.send('scan:progress', contact.name, i + 1, contacts.length)

        const prevState = state.contacts[contact.id] ?? null

        let messages: WAMessage[] = []
        if (contact.whatsappId && wa.isConnected()) {
          try {
            messages = await wa.getMessages(contact.whatsappId, 30)
          } catch {
            console.warn(`[Scanner] Could not fetch messages for ${contact.name}`)
          }
        }

        const reachOutDate = detectReachOut(prevState, messages)
        const lastReal = messages.find(isRealMessage)
        const lastContactDate =
          reachOutDate ??
          (lastReal ? new Date(lastReal.timestamp * 1000).toISOString() : prevState?.lastContactDate ?? null)

        const nextOccasion = computeNextOccasion(contact, lastContactDate)
        const brief = await generateBrief(contact, messages, state.chapters)

        if (nextOccasion) {
          track('suggestion_shown', { suggestion_type: nextOccasion.type })
        }

        updatedContacts[contact.id] = {
          lastContactDate,
          lastScanAt: now,
          brief,
          nextOccasion,
          briefOpenedAt: reachOutDate ? null : (prevState?.briefOpenedAt ?? null),
        }

        // On This Day: check messages for anniversary match (±7 days, 1-5 years ago)
        if (!onThisDayMemory) {
          for (const msg of messages) {
            if (!isRealMessage(msg)) continue
            const msgDate = new Date(msg.timestamp * 1000)
            const yearsAgo = today.getFullYear() - msgDate.getFullYear()
            if (yearsAgo < 1 || yearsAgo > 5) continue
            if (!isAnniversaryWindow(msgDate, today)) continue
            const snippet = await generateOnThisDaySnippet(contact, msg, yearsAgo)
            onThisDayMemory = {
              contactId: contact.id,
              contactName: contact.name,
              snippet,
              yearsAgo,
              date: msgDate.toISOString(),
            }
            break
          }
        }
      }

      await patchState({ contacts: updatedContacts, lastScanAt: now, onThisDayMemory })
      this.send('scan:complete')
      this.send('state:changed')
      console.log(`[Scanner] Complete — ${contacts.length} contacts scanned`)
    } catch (err) {
      console.error('[Scanner] Error:', err)
    } finally {
      this.running = false
    }
  }

  async maybeRunOnLaunch(): Promise<void> {
    // Wait for WhatsApp to connect before scanning
    await new Promise<void>((resolve) => setTimeout(resolve, 30_000))

    const state = await readState()
    if (!state.onboardingComplete || !state.whatsappConnected) return

    const lastRun = state.lastScanAt ? new Date(state.lastScanAt).getTime() : 0
    const ONE_HOUR_MS = 3_600_000

    if (Date.now() - lastRun > ONE_HOUR_MS) {
      console.log('[Scanner] Triggering launch scan')
      this.run().catch(console.error)
    }
  }
}

export default Scanner

export function registerScanHandlers(getWindow: () => BrowserWindow | null): void {
  const scanner = Scanner.getInstance()
  scanner.init(getWindow)

  ipcMain.handle('scan:run', async () => {
    scanner.run().catch(console.error)
  })
}
