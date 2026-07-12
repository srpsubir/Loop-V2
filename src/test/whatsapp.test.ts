import { describe, it, expect, vi, beforeEach } from 'vitest'

const readdirMock = vi.fn()
const unlinkMock = vi.fn()

vi.mock('fs', () => {
  const promises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: readdirMock,
    unlink: unlinkMock,
  }
  return { default: { promises }, promises }
})

describe('WhatsAppManager', () => {
  beforeEach(() => {
    vi.resetModules()
    readdirMock.mockReset()
    unlinkMock.mockReset()
  })

  it('disconnect() clears all auth files so next start() always generates a fresh QR', async () => {
    readdirMock.mockResolvedValue(['creds.json', 'app-state-sync-key.json'])
    unlinkMock.mockResolvedValue(undefined)

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await wa.disconnect()

    expect(readdirMock).toHaveBeenCalled()
    expect(unlinkMock).toHaveBeenCalledTimes(2)
  })

  it('disconnect() still clears auth even if auth dir is empty', async () => {
    readdirMock.mockResolvedValue([])
    unlinkMock.mockResolvedValue(undefined)

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await wa.disconnect()

    expect(unlinkMock).not.toHaveBeenCalled()
  })

  it('disconnect() does not throw if auth dir does not exist', async () => {
    readdirMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await expect(wa.disconnect()).resolves.not.toThrow()
  })

  // MAV-255: a fabricated/externally-injected contact with no real WhatsApp
  // conversation must never reach a real send — this is the guard that failed
  // in the incident that prompted this ticket.
  describe('sendMessage() refuses unverified contacts (MAV-255)', () => {
    it('throws if there is no existing chat for the JID, even with a live socket', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      const socketSendMessage = vi.fn().mockResolvedValue(undefined)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).socket = { sendMessage: socketSendMessage }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).chatStore = new Map() // no known chats — simulates fabricated contact data

      await expect(wa.sendMessage('447700900001@s.whatsapp.net', 'hi')).rejects.toThrow(
        /no existing whatsapp conversation/i
      )
      expect(socketSendMessage).not.toHaveBeenCalled()
    })

    it('sends when the JID has a real, known chat', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      const socketSendMessage = vi.fn().mockResolvedValue(undefined)
      const jid = '447700900003@s.whatsapp.net'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).socket = { sendMessage: socketSendMessage }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).chatStore = new Map([[jid, { id: jid }]])

      await wa.sendMessage(jid, 'hi')
      expect(socketSendMessage).toHaveBeenCalledWith(jid, { text: 'hi' })
    })

    it('hasChatWith() reflects chatStore membership directly', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      const jid = '447700900004@s.whatsapp.net'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).chatStore = new Map([[jid, { id: jid }]])

      expect(wa.hasChatWith(jid)).toBe(true)
      expect(wa.hasChatWith('447700900099@s.whatsapp.net')).toBe(false)
    })
  })
})
