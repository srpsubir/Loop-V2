import { contextBridge, ipcRenderer } from 'electron'
import type { AppState, Contact, Brief } from '../shared/types'

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

  claude: {
    ask: (system: string, user: string): Promise<string> =>
      ipcRenderer.invoke('claude:ask', system, user),
  },

  brief: {
    open: (contactId: string): Promise<Brief | null> =>
      ipcRenderer.invoke('brief:open', contactId),
  },

  shell: {
    openWhatsApp: (whatsappId: string): Promise<void> =>
      ipcRenderer.invoke('shell:openWhatsApp', whatsappId),
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
