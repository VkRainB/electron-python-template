/**
 * Python 后端服务 IPC 调用封装。
 * 主进程对应模块:electron/main/ipc/modules/python.module.js
 * 响应壳:{ ok: true, data } | { ok: false, error: { code, message, details? } }
 */
const ipc = window.electron.ipcRenderer

export const getBackendUrl = () => ipc.invoke('python:get-backend-url')
export const getStatus = () => ipc.invoke('python:get-status')
export const healthCheck = () => ipc.invoke('python:health-check')
export const restart = () => ipc.invoke('python:restart')
export const isDaemonMode = () => ipc.invoke('python:is-daemon-mode')

/**
 * @param {() => void} cb
 * @returns {() => void} unsubscribe
 */
export function onReady(cb) {
  const wrapped = () => cb()
  ipc.on('python-ready', wrapped)
  return () => ipc.removeListener('python-ready', wrapped)
}

/**
 * @param {(status: any) => void} cb
 * @returns {() => void} unsubscribe
 */
export function onStatusChanged(cb) {
  const wrapped = (_e, status) => cb(status)
  ipc.on('python-status-changed', wrapped)
  return () => ipc.removeListener('python-status-changed', wrapped)
}
