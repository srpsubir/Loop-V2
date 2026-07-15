/**
 * Standalone script: reads group JIDs from wa-cache.json, connects via Baileys,
 * calls groupMetadata per JID to get real names, writes groups-discovered.json.
 * Run once with: node eval/fetch-groups.mjs
 */
import { join } from 'path'
import { homedir } from 'os'
import { writeFileSync, readFileSync } from 'fs'

const AUTH_DIR = join(homedir(), 'Documents', 'Loop', 'whatsapp-auth')
const CACHE_FILE = join(homedir(), 'Documents', 'Loop', 'wa-cache.json')
const OUT_FILE = join(homedir(), 'Documents', 'Loop', 'groups-discovered.json')

// Load group JIDs from wa-cache
const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
const chats = cache.chats ?? {}
const groupJids = Object.keys(chats).filter(jid => jid.endsWith('@g.us'))
console.log(`Found ${groupJids.length} group JIDs in wa-cache.json`)

const baileys = await import('@whiskeysockets/baileys')
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore } = baileys
const pino = (await import('pino')).default
const logger = pino({ level: 'silent' })

const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
  version,
  auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
  browser: ['Loop', 'Desktop', '3.0.0'],
  logger,
  syncFullHistory: false,
  markOnlineOnConnect: false,
})

sock.ev.on('creds.update', saveCreds)
console.log('Connecting to WhatsApp...')

await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Connection timed out')), 30000)
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') { clearTimeout(timeout); resolve() }
    if (connection === 'close') {
      clearTimeout(timeout)
      reject(new Error(`Closed: ${lastDisconnect?.error?.output?.statusCode}`))
    }
  })
})

console.log('Connected. Fetching group metadata...')

const results = []
const messages = cache.messages ?? {}

for (let i = 0; i < groupJids.length; i++) {
  const jid = groupJids[i]
  try {
    const meta = await sock.groupMetadata(jid)
    const name = meta?.subject
    if (!name || name === jid) continue
    const members = (meta?.participants ?? []).map(p => p.id)
    // derive lastMessageAt from cached messages if available
    const threadMsgs = messages[jid] ?? []
    const lastMessageAt = threadMsgs.length
      ? Math.max(...threadMsgs.map(m => m.timestamp ?? 0))
      : Number(chats[jid]?.conversationTimestamp ?? 0)
    const active = lastMessageAt > (Date.now() / 1000) - 60 * 60 * 24 * 180
    results.push({ id: jid, name, members, lastMessageAt, active })
    process.stdout.write(`\r  [${i+1}/${groupJids.length}] ${results.length} named — latest: ${name.slice(0,40)}      `)
  } catch { /* skip — rate limit or invalid group */ }
}

console.log(`\nDone. ${results.length}/${groupJids.length} groups resolved.`)
writeFileSync(OUT_FILE, JSON.stringify(results, null, 2))
console.log(`Written to ${OUT_FILE}`)

await sock.end()
process.exit(0)
