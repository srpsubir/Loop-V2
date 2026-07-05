import { contextBridge, ipcRenderer } from 'electron'
import type { AppState, Contact, Story, ChapterCandidate, InviteCode } from '../shared/types'

const loopAPI = {
  state: {
    get: (): Promise<AppState> => ipcRenderer.invoke('state:get'),
    patch: (patch: Partial<AppState>): Promise<AppState> =>
      ipcRenderer.invoke('state:patch', patch),
    onChange: (cb: () => void) => {
      ipcRenderer.on('state:changed', cb)
      return () => ipcRenderer.off('state:changed', cb)
    },
  },

  contacts: {
    list: (): Promise<Contact[]> => ipcRenderer.invoke('contacts:list'),
    save: (contact: Contact): Promise<Contact> => ipcRenderer.invoke('contacts:save', contact),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('contacts:delete', id),
  },

  whatsapp: {
    start: (): Promise<string> => ipcRenderer.invoke('whatsapp:start'),
    status: (): Promise<{ status: string; qr: string | null }> =>
      ipcRenderer.invoke('whatsapp:status'),
    disconnect: (): Promise<void> => ipcRenderer.invoke('whatsapp:disconnect'),
    listGroups: (): Promise<{ id: string; name: string; members: string[] }[]> =>
      ipcRenderer.invoke('whatsapp:listGroups'),
    onQR: (cb: (qr: string) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, qr: string) => cb(qr)
      ipcRenderer.on('whatsapp:qr', handler)
      return () => ipcRenderer.off('whatsapp:qr', handler)
    },
    onConnected: (cb: () => void) => {
      ipcRenderer.on('whatsapp:connected', cb)
      return () => ipcRenderer.off('whatsapp:connected', cb)
    },
    onDisconnected: (cb: (loggedOut: boolean) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { loggedOut: boolean }) =>
        cb(data?.loggedOut ?? false)
      ipcRenderer.on('whatsapp:disconnected', handler)
      return () => ipcRenderer.off('whatsapp:disconnected', handler)
    },
    onConnectionFailed: (cb: (reason?: string) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { statusCode?: number; reason?: string }) =>
        cb(data?.reason)
      ipcRenderer.on('whatsapp:connection-failed', handler)
      return () => ipcRenderer.off('whatsapp:connection-failed', handler)
    },
    onReconnecting: (cb: (data: { attempt: number; max: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { attempt: number; max: number }) => cb(data)
      ipcRenderer.on('whatsapp:reconnecting', handler)
      return () => ipcRenderer.off('whatsapp:reconnecting', handler)
    },
    onLoggedOut: (cb: () => void) => {
      ipcRenderer.on('whatsapp:logged-out', cb)
      return () => ipcRenderer.off('whatsapp:logged-out', cb)
    },
    onProtocolError: (cb: (data: { reason?: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { reason?: string }) => cb(data)
      ipcRenderer.on('whatsapp:protocol-error', handler)
      return () => ipcRenderer.off('whatsapp:protocol-error', handler)
    },
    retry: (): Promise<void> => ipcRenderer.invoke('whatsapp:retry'),
  },

  scan: {
    run: (): Promise<void> => ipcRenderer.invoke('scan:run'),
    onProgress: (cb: (name: string, current: number, total: number) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, name: string, n: number, total: number) =>
        cb(name, n, total)
      ipcRenderer.on('scan:progress', handler)
      return () => ipcRenderer.off('scan:progress', handler)
    },
    onComplete: (cb: () => void) => {
      ipcRenderer.on('scan:complete', cb)
      return () => ipcRenderer.off('scan:complete', cb)
    },
  },

  story: {
    open: (contactId: string): Promise<Story | null> =>
      ipcRenderer.invoke('story:open', contactId),
  },

  nudge: {
    snooze: (contactId: string, days: number): Promise<void> =>
      ipcRenderer.invoke('nudge:snooze', { contactId, days }),
  },

  shell: {
    openWhatsApp: (whatsappId: string, contactId?: string): Promise<void> =>
      ipcRenderer.invoke('shell:openWhatsApp', whatsappId, contactId),
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('shell:openExternal', url),
  },

  invite: {
    generate: (): Promise<InviteCode[]> => ipcRenderer.invoke('invite:generate'),
    redeem: (code: string): Promise<boolean> => ipcRenderer.invoke('invite:redeem', code),
  },

  photos: {
    pickHero: (): Promise<string | null> => ipcRenderer.invoke('photos:pickHero'),
    pickChapter: (): Promise<string | null> => ipcRenderer.invoke('photos:pickChapter'),
  },

  chapters: {
    detect: (): Promise<ChapterCandidate[]> => ipcRenderer.invoke('chapters:detect'),
    confirm: (jids: string[]): Promise<void> => ipcRenderer.invoke('chapters:confirm', jids),
    setName: (chapterId: string, name: string): Promise<void> =>
      ipcRenderer.invoke('chapters:setName', chapterId, name),
  },

  onReconnection: (cb: (contactId: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, contactId: string) => cb(contactId)
    ipcRenderer.on('reconnection:detected', handler)
    return () => ipcRenderer.off('reconnection:detected', handler)
  },

  update: {
    onChecking: (cb: () => void) => {
      ipcRenderer.on('update:checking', cb)
      return () => ipcRenderer.off('update:checking', cb)
    },
    onAvailable: (cb: (data: { version: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { version: string }) => cb(data)
      ipcRenderer.on('update:available', handler)
      return () => ipcRenderer.off('update:available', handler)
    },
    onNotAvailable: (cb: () => void) => {
      ipcRenderer.on('update:not-available', cb)
      return () => ipcRenderer.off('update:not-available', cb)
    },
    onDownloading: (cb: (data: { percent: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { percent: number }) => cb(data)
      ipcRenderer.on('update:downloading', handler)
      return () => ipcRenderer.off('update:downloading', handler)
    },
    onReady: (cb: (data: { version: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { version: string }) => cb(data)
      ipcRenderer.on('update:ready', handler)
      return () => ipcRenderer.off('update:ready', handler)
    },
    onError: (cb: (data: { message: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { message: string }) => cb(data)
      ipcRenderer.on('update:error', handler)
      return () => ipcRenderer.off('update:error', handler)
    },
    installNow: (): Promise<void> => ipcRenderer.invoke('update:install-now'),
  },

  analytics: {
    track: (event: string, properties?: Record<string, unknown>): void => {
      ipcRenderer.invoke('analytics:track', event, properties)
    },
  },

  data: {
    getDir: (): Promise<string> => ipcRenderer.invoke('data:getDir'),
    // MAV-178: pass confirmed flag so the main-process guard lets the call through
    deleteAll: (): Promise<void> => ipcRenderer.invoke('data:deleteAll', { confirmed: true }),
  },

  // MAV-216: Google Sign-In stub — real OAuth wired in MAV-208 backend milestone
  account: {
    signInWithGoogle: (): Promise<{ email: string; googleId: string } | null> =>
      ipcRenderer.invoke('account:signInWithGoogle'),
  },

  // MAV-217: telemetry opt-out
  telemetry: {
    setEnabled: (enabled: boolean): Promise<void> =>
      ipcRenderer.invoke('telemetry:setEnabled', enabled),
  },

}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('loop', loopAPI)
  } catch (e) {
    console.error(e)
  }
} else {
  // @ts-ignore
  window.loop = loopAPI
}
