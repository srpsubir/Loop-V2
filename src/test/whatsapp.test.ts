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
})
