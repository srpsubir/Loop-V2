export const app = { getVersion: () => '0.1.0', getPath: () => '/tmp' }
export const ipcMain = { handle: () => {}, on: () => {} }
export const ipcRenderer = { invoke: () => Promise.resolve(), on: () => {}, off: () => {} }
export const BrowserWindow = class {}
export const shell = { openExternal: () => {} }
export const net = { request: () => ({ on: () => {}, end: () => {} }) }
export default { app, ipcMain, ipcRenderer, BrowserWindow, shell, net }
