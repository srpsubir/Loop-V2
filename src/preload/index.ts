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

  shell: {
    openWhatsApp: (whatsappId: string): Promise<void> =>
      ipcRenderer.invoke('shell:openWhatsApp', whatsappId),
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

  calendar: {
    addEvent: (payload: {
      contactName: string
      occasionType?: string | null
      occasionDate?: string | null
      reasonToReachOut: string
      contextLine?: string
    }): Promise<void> => ipcRenderer.invoke('calendar:addEvent', payload),
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

  analytics: {
    track: (event: string, properties?: Record<string, unknown>): void => {
      ipcRenderer.invoke('analytics:track', event, properties)
    },
  },

  data: {
    getDir: (): Promise<string> => ipcRenderer.invoke('data:getDir'),
    deleteAll: (): Promise<void> => ipcRenderer.invoke('data:deleteAll'),
  },

  model: {
    status: (): Promise<{ exists: boolean; ready: boolean; downloading: boolean }> =>
      ipcRenderer.invoke('model:status'),
    download: (): Promise<void> => ipcRenderer.invoke('model:download'),
    onProgress: (cb: (downloaded: number, total: number) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, p: { downloaded: number; total: number }) =>
        cb(p.downloaded, p.total)
      ipcRenderer.on('model:download-progress', handler)
      return () => ipcRenderer.off('model:download-progress', handler)
    },
    onReady: (cb: () => void) => {
      ipcRenderer.on('model:ready', cb)
      return () => ipcRenderer.off('model:ready', cb)
    },
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
