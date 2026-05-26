import type { ElectronAPI, IpcRenderer } from '@electron-toolkit/preload'

export {}
declare global {
  const ipc: IpcRenderer
  interface Window {
    readonly electron: ElectronAPI
    ipc: IpcRenderer
  }
}
