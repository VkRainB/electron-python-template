import { createRequire } from 'node:module'

const _nodeRequire = createRequire(import.meta.url)
const { BrowserWindow } = _nodeRequire('electron')

/**
 * 事件总线:统一广播主进程事件到所有渲染窗口。
 */
export class EventBus {
  /** @param {any} logger */
  constructor(logger) {
    this.logger = logger
  }

  /**
   * @param {string} channel
   * @param {any} [payload]
   */
  emit(channel, payload) {
    for (const w of BrowserWindow.getAllWindows()) {
      try {
        w.webContents.send(channel, payload)
      } catch (e) {
        this.logger.warn(`[EventBus] broadcast ${channel} failed: ${e.message}`)
      }
    }
  }
}

let _instance = null
/** @param {any} logger */
export function getEventBus(logger) {
  if (!_instance) _instance = new EventBus(logger)
  return _instance
}
