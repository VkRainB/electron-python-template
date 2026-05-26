/**
 * 系统/应用元信息 IPC 调用封装。
 * 主进程对应模块:electron/main/ipc/modules/system.module.js
 */
const ipc = window.electron.ipcRenderer

export const getAppInfo = () => ipc.invoke('system:get-app-info')
