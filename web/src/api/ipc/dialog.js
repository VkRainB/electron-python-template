/**
 * Electron 原生 dialog 调用封装。
 * 主进程对应模块:electron/main/ipc/modules/dialog.module.js
 */
const ipc = window.electron.ipcRenderer

/**
 * @param {{ title?: string, defaultPath?: string }} [options]
 */
export const selectDirectory = (options) => ipc.invoke('dialog:select-directory', options)
