import { dialog, ipcMain } from 'electron'
import { join } from 'path'
import { homedir } from 'os'

export async function pickHeroPhoto(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Choose a photo for this person',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic'] }],
    defaultPath: join(homedir(), 'Pictures'),
  })
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

export async function pickChapterPhoto(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Choose a cover photo for this chapter',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic'] }],
    defaultPath: join(homedir(), 'Pictures'),
  })
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

export function registerPhotosHandlers(): void {
  ipcMain.handle('photos:pickHero', async () => pickHeroPhoto())
  ipcMain.handle('photos:pickChapter', async () => pickChapterPhoto())
}
