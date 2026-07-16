/// <reference types="vite/client" />

import type { AppState, Contact, Story } from '@shared/types'

interface LoopAPI {
  state: {
    get: () => Promise<AppState>
    patch: (patch: Partial<AppState>) => Promise<AppState>
    // Test/dev-only — rejected by the main process outside dev/test builds.
    testPatch: (patch: Partial<AppState>) => Promise<AppState>
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
    onConnectionFailed: (cb: (reason?: string) => void) => () => void
    onReconnecting: (cb: (data: { attempt: number; max: number }) => void) => () => void
    onLoggedOut: (cb: () => void) => () => void
    onProtocolError: (cb: (data: { reason?: string }) => void) => () => void
    retry: () => Promise<void>
    sendMessage: (jid: string, text: string, contactId?: string) => Promise<{ ok: boolean; error?: string }>
  }
  story: {
    open: (contactId: string) => Promise<Story | null>
  }
  nudge: {
    snooze: (contactId: string, days: number) => Promise<void>
  }
  shell: {
    openWhatsApp: (whatsappId: string, contactId?: string) => Promise<void>
    openExternal: (url: string) => Promise<void>
  }
  photos: {
    pickHero: () => Promise<string | null>
    pickChapter: () => Promise<string | null>
  }
  onReconnection: (cb: (contactId: string) => void) => () => void
  chapters: {
    detect: () => Promise<import('@shared/types').ChapterCandidate[]>
    confirm: (jids: string[]) => Promise<void>
    setName: (chapterId: string, name: string) => Promise<void>
    dismissCandidate: (waJid: string) => Promise<void>
  }
  update: {
    onChecking: (cb: () => void) => () => void
    onAvailable: (cb: (data: { version: string }) => void) => () => void
    onNotAvailable: (cb: () => void) => () => void
    onDownloading: (cb: (data: { percent: number }) => void) => () => void
    onReady: (cb: (data: { version: string }) => void) => () => void
    onError: (cb: (data: { message: string }) => void) => () => void
    installNow: () => Promise<void>
  }
  data: {
    getDir: () => Promise<string>
    deleteAll: () => Promise<void>
  }
  account: {
    signInWithGoogle: () => Promise<{ email: string; googleId: string } | null>
  }
  telemetry: {
    setEnabled: (enabled: boolean) => Promise<void>
  }
  version: {
    get: () => Promise<string>
  }
}

declare global {
  interface Window {
    loop: LoopAPI
  }
}
