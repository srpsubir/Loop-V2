import { EventEmitter } from 'events'
import { join } from 'path'
import { promises as fs } from 'fs'
import { homedir } from 'os'

const AUTH_DIR = join(homedir(), 'Documents', 'Loop', 'whatsapp-auth')

export type WAConnectionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'connected'

export interface WAMessage {
  id: string
  fromMe: boolean
  timestamp: number  // unix seconds
  text: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class WhatsAppManager extends EventEmitter {
  private static instance: WhatsAppManager
  private socket: unknown = null
  private status: WAConnectionStatus = 'disconnected'
  private currentQR: string | null = null
  private saveCreds: (() => Promise<void>) | null = null

  static getInstance(): WhatsAppManager {
    if (!WhatsAppManager.instance) WhatsAppManager.instance = new WhatsAppManager()
    return WhatsAppManager.instance
  }

  getStatus(): WAConnectionStatus { return this.status }
  getCurrentQR(): string | null { return this.currentQR }
  isConnected(): boolean { return this.status === 'connected' }

  private setStatus(s: WAConnectionStatus): void {
    this.status = s
    this.emit('status', s)
  }

  async start(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') return
    this.setStatus('connecting')

    try {
      await fs.mkdir(AUTH_DIR, { recursive: true })

      const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        makeCacheableSignalKeyStore,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } = await import('@whiskeysockets/baileys') as any

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
      this.saveCreds = saveCreds

      const { version } = await fetchLatestBaileysVersion()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, console),
        },
        printQRInTerminal: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger: (await import('pino') as any).default({ level: 'silent' }),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any

      this.socket = sock

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          this.currentQR = qr
          this.setStatus('qr_pending')
          this.emit('qr', qr)
        }

        if (connection === 'open') {
          this.currentQR = null
          this.setStatus('connected')
          this.emit('connected')
        }

        if (connection === 'close') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut
          this.setStatus('disconnected')
          this.emit('disconnected', { statusCode, loggedOut: !shouldReconnect })

          if (shouldReconnect) {
            setTimeout(() => this.start(), 3000)
          } else {
            await this.clearAuth()
          }
        }
      })

      sock.ev.on('creds.update', async () => {
        await this.saveCreds?.()
      })
    } catch (err) {
      console.error('[WhatsApp] Failed to start:', err)
      this.setStatus('disconnected')
      this.emit('error', err)
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.socket as any).logout()
      } catch { /* ignore */ }
      this.socket = null
    }
    this.setStatus('disconnected')
    this.currentQR = null
  }

  async clearAuth(): Promise<void> {
    try {
      const files = await fs.readdir(AUTH_DIR)
      await Promise.all(files.map((f) => fs.unlink(join(AUTH_DIR, f))))
    } catch { /* ignore */ }
  }

  async getMessages(jid: string, limit = 50): Promise<WAMessage[]> {
    if (!this.socket) return []
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = this.socket as any
      const result = await sock.fetchMessagesFromWA(jid, limit)
      return this.normalizeMessages(result)
    } catch {
      return []
    }
  }

  async listGroups(): Promise<{ id: string; name: string; members: string[] }[]> {
    if (!this.socket) return []
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = this.socket as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allChats: any[] = sock.chats?.all?.() ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groups = allChats.filter((c: any) => c.id?.endsWith('@g.us'))

      const results = []
      for (const group of groups.slice(0, 100)) {
        let members: string[] = []
        try {
          const meta = await sock.groupMetadata(group.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          members = (meta?.participants ?? []).map((p: any) => p.id as string)
        } catch { /* skip */ }
        if (group.name && group.name !== group.id) {
          results.push({ id: group.id, name: group.name, members })
        }
      }
      return results
    } catch {
      return []
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeMessages(raw: any[]): WAMessage[] {
    if (!Array.isArray(raw)) return []
    return raw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => ({
        id: m.key?.id ?? '',
        fromMe: m.key?.fromMe ?? false,
        timestamp: m.messageTimestamp ?? 0,
        text: m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? null,
      }))
      .filter((m) => m.text !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
  }
}

export default WhatsAppManager
