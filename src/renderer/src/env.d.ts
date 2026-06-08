/// <reference types="vite/client" />

import type { AppState, Contact, Brief } from '@shared/types'

interface LoopAPI {
  state: {
    get: () => Promise<AppState>
    patch: (patch: Partial<AppState>) => Promise<AppState>
    onChange: (cb: () => void) => () => void
  }
  contacts: {
    list: () => Promise<Contact[]>
    save: (contact: Contact) => Promise<Contact>
    delete: (id: string) => Promise<void>
  }
  whatsapp: {
    start: () => Promise<string>
    status: () => Promise<{ status: string; qr: string | null }>
    disconnect: () => Promise<void>
    listGroups: () => Promise<{ id: string; name: string; members: string[] }[]>
    onQR: (cb: (qr: string) => void) => () => void
    onConnected: (cb: () => void) => () => void
  }
  scan: {
    run: () => Promise<void>
    onProgress: (cb: (name: string, current: number, total: number) => void) => () => void
    onComplete: (cb: () => void) => () => void
  }
  claude: {
    ask: (system: string, user: string) => Promise<string>
  }
  brief: {
    open: (contactId: string) => Promise<Brief | null>
  }
  shell: {
    openWhatsApp: (whatsappId: string) => Promise<void>
  }
  photos: {
    pickHero: () => Promise<string | null>
    pickChapter: () => Promise<string | null>
  }
  calendar: {
    addEvent: (payload: {
      contactName: string
      occasionType?: string | null
      occasionDate?: string | null
      reasonToReachOut: string
      contextLine?: string
    }) => Promise<void>
  }
}

declare global {
  interface Window {
    loop: LoopAPI
  }
}
