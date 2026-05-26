/**
 * Bridge(主进程 WS 连接)IPC 调用封装。
 * 主进程对应模块:electron/main/ipc/modules/bridge.module.js
 */
const ipc = window.electron.ipcRenderer

export const ensureConnection = () => ipc.invoke('bridge:ensure-connection')
export const getStatus = () => ipc.invoke('bridge:get-status')
export const disconnect = () => ipc.invoke('bridge:disconnect')
export const getStats = () => ipc.invoke('bridge:get-stats')

/**
 * @param {() => void} cb
 * @returns {() => void} unsubscribe
 */
export function onConnected(cb) {
  const wrapped = () => cb()
  ipc.on('bridge-connected', wrapped)
  return () => ipc.removeListener('bridge-connected', wrapped)
}

/**
 * @param {() => void} cb
 * @returns {() => void} unsubscribe
 */
export function onDisconnected(cb) {
  const wrapped = () => cb()
  ipc.on('bridge-disconnected', wrapped)
  return () => ipc.removeListener('bridge-disconnected', wrapped)
}
