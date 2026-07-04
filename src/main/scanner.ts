import { BrowserWindow, ipcMain } from 'electron'
import { listContacts, readState, patchState } from './store'
import WhatsAppManager from './whatsapp'
import { track } from './analytics'
import type { Contact, ContactState, Occasion, Story, Chapter, OnThisDayMemory } from '../shared/types'
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

// ─── Dead thread detection ────────────────────────────────────────────────────

const DEAD_THREAD_PHRASES = [
  "let's catch up", "lets catch up", "we should catch up",
  "we should meet", "let's meet", "lets meet",
  "let's get together", "lets get together",
  "let's do this", "lets do this",
  "let's plan", "lets plan",
  "i'll call you", "i'll ring you", "call you soon",
  "speak soon", "talk soon",
]

// messages must be sorted newest-first (Baileys default)
export function detectDeadThread(messages: WAMessage[]): Occasion | null {
  const SILENCE_DAYS = 14
  const now = Date.now()

  const phraseIdx = messages.findIndex((msg) => {
    if (!msg.text) return false
    const lower = msg.text.toLowerCase()
    return DEAD_THREAD_PHRASES.some((p) => lower.includes(p))
  })

  if (phraseIdx < 0) return null
  // Newer messages exist after the commitment phrase — conversation continued
  if (phraseIdx > 0) return null

  const phraseMs = messages[phraseIdx].timestamp * 1000
  if ((now - phraseMs) / 86400000 < SILENCE_DAYS) return null

  return {
    type: 'dead-thread',
    date: new Date(phraseMs).toISOString(),
    label: 'Commitment made, never followed through',
  }
}

// ─── Reach-out detection ──────────────────────────────────────────────────────

export function detectReachOut(
  prevState: ContactState | null,
  messages: WAMessage[]
): string | null {
  if (!prevState?.storyOpenedAt) return null
  const openedAtSeconds = new Date(prevState.storyOpenedAt).getTime() / 1000
  const outgoing = messages.find(
    (m) => m.fromMe && isRealMessage(m) && m.timestamp > openedAtSeconds
  )
  return outgoing ? new Date(outgoing.timestamp * 1000).toISOString() : null
}

// Returns true if a reply was received after the most recent reach-out
export function detectReconnection(
  prevState: ContactState | null,
  messages: WAMessage[]
): boolean {
  if (!prevState?.lastReachOutAt || prevState?.reconnectedAt) return false
  const reachOutSec = new Date(prevState.lastReachOutAt).getTime() / 1000
  const replied = messages.find((m) => !m.fromMe && m.timestamp > reachOutSec)
  return !!replied
}

// Computes new reachOutCount and suppressNudge after a reach-out tap
export function computeReachOutUpdate(prevCount: number): {
  reachOutCount: number
  suppressNudge: boolean
} {
  const reachOutCount = prevCount + 1
  return { reachOutCount, suppressNudge: reachOutCount >= 2 }
}

// ─── Brief generation (template-based, fully local) ──────────────────────────

const STORY_STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','is','it',
  'was','are','be','been','has','have','had','he','she','they','we','you','i','me',
  'my','your','his','her','our','its','this','that','what','how','so','just','yes',
  'no','ok','okay','hi','hey','haha','hahaha','lol','yeah','yep','nope','oh','ah',
  'gonna','gotta','wanna','let','get','got','know','think','like','good','great',
  'need','want','will','can','do','did','not','up','out','go','going','one','also',
  'too','very','really','back','time','day','days','week','now','then','there','here',
])

function extractTopics(messages: WAMessage[]): string[] {
  const freq = new Map<string, number>()
  for (const msg of messages) {
    if (!isRealMessage(msg)) continue
    const words = (msg.text ?? '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STORY_STOP_WORDS.has(w))
    for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .filter(([, count]) => count >= 2)
    .map(([w]) => w)
}

export function generateStory(
  contact: Contact,
  messages: WAMessage[],
  chapters: Chapter[],
  nextOccasion: Occasion | null
): Story {
  const firstName = contact.name.split(' ')[0]

  const chapterName = chapters
    .filter((ch) => contact.chapterIds?.includes(ch.id) ?? false)
    .map((ch) => ch.name)[0] ?? null

  const topics = extractTopics(messages)

  let line1: string
  if (chapterName && topics.length > 0) {
    line1 = `${firstName} was part of your ${chapterName} chapter. You two talked a lot about ${topics[0]}.`
  } else if (chapterName) {
    line1 = `${firstName} was part of your ${chapterName} chapter.`
  } else if (topics.length > 0) {
    line1 = `You and ${firstName} talked a lot about ${topics[0]}.`
  } else {
    line1 = `${firstName} is someone you've stayed close to.`
  }

  const lastReal = messages.find(isRealMessage)
  let line2: string
  if (lastReal) {
    const days = Math.floor((Date.now() - lastReal.timestamp * 1000) / 86400000)
    if (days === 0)      line2 = 'You were in touch today.'
    else if (days === 1) line2 = 'You spoke yesterday.'
    else if (days < 7)   line2 = `You last spoke ${days} days ago.`
    else if (days < 30)  line2 = `It's been ${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} — longer than usual for you two.`
    else if (days < 365) line2 = `It's been ${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'}. Worth a message.`
    else                 line2 = `It's been over a year. ${firstName} would probably love to hear from you.`
  } else {
    line2 = "You haven't spoken in a while. Worth a message."
  }

  return {
    generatedAt: new Date().toISOString(),
    contextLines: [line1, line2],
    reasonToReachOut: nextOccasion?.label ?? `Worth reaching out to ${firstName}.`,
  }
}

// ─── On This Day ─────────────────────────────────────────────────────────────

function isAnniversaryWindow(msgDate: Date, today: Date): boolean {
  // Compare month/day position independent of year, within ±7 days
  const sameYear = new Date(msgDate.getFullYear(), today.getMonth(), today.getDate())
  return Math.abs(msgDate.getTime() - sameYear.getTime()) / 86400000 <= 7
}

function generateOnThisDaySnippet(
  contact: Contact,
  _msg: WAMessage,
  yearsAgo: number
): string {
  const firstName = contact.name.split(' ')[0]
  return `${firstName} sent you this ${yearsAgo} year${yearsAgo === 1 ? '' : 's'} ago today.`
}

// ─── Story resolver: SLM when ready, template fallback ───────────────────────

export async function resolveStory(
  contact: Contact,
  messages: WAMessage[],
  chapters: Chapter[],
  nextOccasion: Occasion | null,
  existingStory: Story | null,
  needsRefresh: boolean
): Promise<Story> {
  if (!needsRefresh && existingStory) return existingStory

  return generateStory(contact, messages, chapters, nextOccasion)
}

// ─── C1: ISO week helper ──────────────────────────────────────────────────────

function isoWeek(ts: number): string {
  const d = new Date(ts)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

// ─── Nudge eligibility ────────────────────────────────────────────────────────

export function isNudgeEligible(contact: Contact, cs: ContactState): boolean {
  if (contact.tier !== 'close' || !contact.whatsappId) return false
  // Hard suppression gates
  if (cs.autosuppressed) return false
  // Snooze gate
  if (cs.snoozedUntil && new Date(cs.snoozedUntil) > new Date()) return false
  // Recent reach-out gate (MAV-212): skip if reached out within 7 days
  if (cs.lastReachOutAt) {
    const daysSinceReachOut = (Date.now() - new Date(cs.lastReachOutAt).getTime()) / 86400000
    if (daysSinceReachOut < 7) return false
  }
  // Escalating dismiss cooldown (MAV-210): 0-2 dismissals → 7 days, 3-4 → 30 days, 5+ → suppressed
  const dismissCount = cs.nudgeDismissCount ?? 0
  if (dismissCount >= 5) return false
  if (cs.nudgeDismissedAt) {
    const daysSinceDismiss = (Date.now() - new Date(cs.nudgeDismissedAt).getTime()) / 86400000
    const cooldownDays = dismissCount >= 3 ? 30 : 7
    if (daysSinceDismiss < cooldownDays) return false
  }
  return true
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
      const minMsgTsByChapter = new Map<string, number>()

      // Compute tie strength from chat recency (uses chatStore, no WA fetches)
      const tieStrengthMap = wa.isConnected() ? await wa.buildTieStrengthMap() : new Map()

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i]
        this.send('scan:progress', contact.name, i + 1, contacts.length)

        const prevState = state.contacts[contact.id] ?? null

        let messages: WAMessage[] = []
        if (contact.whatsappId && wa.isConnected()) {
          try {
            messages = await wa.getMessages(contact.whatsappId, 50)
          } catch {
            console.warn(`[Scanner] Could not fetch messages for ${contact.name}`)
          }
        }

        // Reconnection detection: did they reply after our last reach-out?
        const justReconnected = detectReconnection(prevState, messages)
        if (justReconnected) {
          this.send('reconnection:detected', contact.id)
        }

        const reachOutDate = detectReachOut(prevState, messages)
        const lastReal = messages.find(isRealMessage)
        const lastContactDate =
          reachOutDate ??
          (lastReal ? new Date(lastReal.timestamp * 1000).toISOString() : prevState?.lastContactDate ?? null)

        const baseOccasion = computeNextOccasion(contact, lastContactDate)
        // Dead thread only fires when there's no active birthday signal within 7 days
        const birthdayWithin7 = baseOccasion?.type === 'birthday' &&
          (new Date(baseOccasion.date).getTime() - Date.now()) / 86400000 <= 7
        const deadThread = birthdayWithin7 ? null : detectDeadThread(messages)
        const nextOccasion: Occasion | null = deadThread ?? baseOccasion

        // Only regenerate story if there are new messages since the last one
        const existingStory = prevState?.story ?? null
        const newestMsgAt = messages.find(isRealMessage)?.timestamp ?? 0
        const storyAge = existingStory?.generatedAt
          ? (Date.now() - new Date(existingStory.generatedAt).getTime()) / 3_600_000
          : Infinity
        const hasNewMessages = newestMsgAt > 0 &&
          (!existingStory || newestMsgAt * 1000 > new Date(existingStory.generatedAt).getTime())
        const story = await resolveStory(
          contact, messages, state.chapters, nextOccasion,
          existingStory, hasNewMessages || storyAge > 168
        )

        if (nextOccasion) {
          track('suggestion_shown', { suggestion_type: nextOccasion.type })
        }

        const tieEntry = contact.whatsappId ? tieStrengthMap.get(contact.whatsappId) : undefined
        const messageStrength: 'high' | 'medium' | 'low' | undefined =
          tieEntry ? tieEntry.strength : (prevState?.messageStrength ?? undefined)

        // ─── C1: Accumulate per-message signals ──────────────────────────────
        let sentCount = 0
        let receivedCount = 0
        const weekSet = new Set<string>()
        let earliestTs = Infinity
        let latestTs = -Infinity

        for (const msg of messages) {
          if (msg.fromMe) sentCount++; else receivedCount++
          const ts = msg.timestamp * 1000
          weekSet.add(isoWeek(ts))
          if (ts < earliestTs) earliestTs = ts
          if (ts > latestTs) latestTs = ts
        }

        // reciprocityScore: neutral 0.5 if fewer than 10 messages
        const totalMsgs = sentCount + receivedCount
        const reciprocityScore =
          totalMsgs >= 10
            ? Math.min(sentCount, receivedCount) / Math.max(sentCount, receivedCount, 1)
            : 0.5

        // frequencyScore: mapped from messageStrength
        const frequencyScore =
          messageStrength === 'high' ? 1.0
          : messageStrength === 'medium' ? 0.6
          : 0.3

        // temporalScore: distinct ISO weeks / span in weeks (0.0 if <2 messages)
        let temporalScore = 0.0
        if (messages.length >= 2 && isFinite(earliestTs) && isFinite(latestTs)) {
          const spanWeeks = Math.max(1, (latestTs - earliestTs) / (7 * 24 * 3600 * 1000))
          temporalScore = Math.min(1, weekSet.size / spanWeeks)
        }

        // multiChannelBonus: 1 if in a chapter AND not low message strength
        const multiChannelBonus =
          (contact.chapterIds.length > 0 && messageStrength !== 'low') ? 1 : 0

        // composite C1 score
        const relationshipStrength =
          reciprocityScore  * 0.35 +
          frequencyScore    * 0.35 +
          temporalScore     * 0.10 +
          multiChannelBonus * 0.20

        updatedContacts[contact.id] = {
          lastContactDate,
          lastScanAt: now,
          story,
          nextOccasion,
          storyOpenedAt: reachOutDate ? null : (prevState?.storyOpenedAt ?? null),
          reachOutCount:      justReconnected ? 0 : (prevState?.reachOutCount ?? 0),
          lastReachOutAt:     justReconnected ? null : (prevState?.lastReachOutAt ?? null),
          reconnectedAt:      justReconnected ? now : (prevState?.reconnectedAt ?? null),
          suppressNudge:      justReconnected ? false : (prevState?.suppressNudge ?? false),
          nudgeDismissedAt:   prevState?.nudgeDismissedAt ?? null,
          nudgeDismissCount:  prevState?.nudgeDismissCount ?? 0,
          autosuppressed:     prevState?.autosuppressed ?? false,
          snoozedUntil:       prevState?.snoozedUntil,
          messageStrength,
          reciprocityRatio: reciprocityScore,
          temporalConsistency: temporalScore,
          relationshipStrength,
        }

        // Track earliest message per chapter for Echo anniversary detection
        for (const msg of messages) {
          for (const chId of contact.chapterIds ?? []) {
            const prev = minMsgTsByChapter.get(chId) ?? Infinity
            if (msg.timestamp < prev) minMsgTsByChapter.set(chId, msg.timestamp)
          }
        }

        // On This Day: check messages for anniversary match (±7 days, 1-5 years ago)
        if (!onThisDayMemory) {
          for (const msg of messages) {
            if (!isRealMessage(msg)) continue
            const msgDate = new Date(msg.timestamp * 1000)
            const yearsAgo = today.getFullYear() - msgDate.getFullYear()
            if (yearsAgo < 1 || yearsAgo > 5) continue
            if (!isAnniversaryWindow(msgDate, today)) continue
            const snippet = generateOnThisDaySnippet(contact, msg, yearsAgo)
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

      // Echo anniversary detection: fire when chapter has a first-message anniversary today
      const updatedChapters = state.chapters.map((chapter) => {
        const firstMsgTs = minMsgTsByChapter.get(chapter.id)
        if (!firstMsgTs) return chapter
        const first = new Date(firstMsgTs * 1000)
        const sameDay = first.getMonth() === today.getMonth() && first.getDate() === today.getDate()
        const years = today.getFullYear() - first.getFullYear()
        if (!sameDay || years < 1) return chapter
        const alreadySeen = chapter.echoAnniversary?.seenAt?.startsWith(String(today.getFullYear()))
        if (alreadySeen) return chapter
        return { ...chapter, echoAnniversary: { years, triggeredAt: today.toISOString() } }
      })

      await patchState({ chapters: updatedChapters, contacts: updatedContacts, lastScanAt: now, onThisDayMemory })
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
