/// <reference types="vite/client" />

import type { AppState, Contact, Story, InviteCode } from '@shared/types'

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
    onDisconnected: (cb: (loggedOut: boolean) => void) => () => void
  }
  scan: {
    run: () => Promise<void>
    onProgress: (cb: (name: string, current: number, total: number) => void) => () => void
    onComplete: (cb: () => void) => () => void
  }
  story: {
    open: (contactId: string) => Promise<Story | null>
  }
  shell: {
    openWhatsApp: (whatsappId: string) => Promise<void>
    openExternal: (url: string) => Promise<void>
  }
  invite: {
    generate: () => Promise<InviteCode[]>
    redeem: (code: string) => Promise<boolean>
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
  onReconnection: (cb: (contactId: string) => void) => () => void
  chapters: {
    detect: () => Promise<import('@shared/types').ChapterCandidate[]>
    confirm: (jids: string[]) => Promise<void>
    setName: (chapterId: string, name: string) => Promise<void>
  }
  analytics: {
    track: (event: string, properties?: Record<string, unknown>) => void
  }
  data: {
    getDir: () => Promise<string>
    deleteAll: () => Promise<void>
  }
  model: {
    status: () => Promise<{ exists: boolean; ready: boolean; downloading: boolean }>
  }
}

declare global {
  interface Window {
    loop: LoopAPI
  }
}
