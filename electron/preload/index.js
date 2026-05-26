import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('ipc', ipcRenderer)
  } catch (e) {
    console.error('[preload] expose failed', e)
  }
} else {
  window.electron = electronAPI
  window.ipc = ipcRenderer
}
