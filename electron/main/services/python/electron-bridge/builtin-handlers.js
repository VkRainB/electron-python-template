import { createRequire } from 'node:module'
import fs from 'node:fs/promises'

import { Logger } from '../../../logger/logger.js'

const _nodeRequire = createRequire(import.meta.url)
let _electronMod = null
try {
  _electronMod = _nodeRequire('electron')
  if (_electronMod && typeof _electronMod !== 'object') _electronMod = null
} catch {
  _electronMod = null
}

const logger = Logger.getInstance()

function _need(name) {
  if (!_electronMod || !_electronMod[name]) {
    throw new Error(`electron.${name} not available in current environment`)
  }
  return _electronMod[name]
}

export function registerBuiltinHandlers(bridge) {
  bridge.register('show_notification', async ({ title, body = '' }) => {
    const Notification = _need('Notification')
    if (!Notification.isSupported()) throw new Error('Notification not supported')
    new Notification({ title, body }).show()
    return { shown: true }
  })

  bridge.register('open_url', async ({ url }) => {
    if (!url) throw new Error('url required')
    const shell = _need('shell')
    await shell.openExternal(url)
    return { opened: true }
  })

  bridge.register('read_file', async ({ path, encoding = 'utf-8' }) => {
    if (!path) throw new Error('path required')
    return await fs.readFile(path, encoding)
  })

  bridge.register('write_file', async ({ path, content, encoding = 'utf-8' }) => {
    if (!path) throw new Error('path required')
    await fs.writeFile(path, content, encoding)
    return { written: true }
  })

  bridge.register('show_open_dialog', async (params) => {
    const dialog = _need('dialog')
    return await dialog.showOpenDialog(params || {})
  })

  bridge.register('show_save_dialog', async (params) => {
    const dialog = _need('dialog')
    return await dialog.showSaveDialog(params || {})
  })

  bridge.register('window.minimize', async () => {
    const BrowserWindow = _need('BrowserWindow')
    BrowserWindow.getFocusedWindow()?.minimize()
    return { ok: true }
  })

  bridge.register('window.maximize', async () => {
    const BrowserWindow = _need('BrowserWindow')
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { ok: false, reason: 'no focused window' }
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return { ok: true }
  })

  bridge.register('window.close', async () => {
    const BrowserWindow = _need('BrowserWindow')
    BrowserWindow.getFocusedWindow()?.close()
    return { ok: true }
  })

  bridge.register('log', async ({ message, level = 'info' }) => {
    const fn = logger[level] || logger.info
    fn.call(logger, `[from-python] ${message}`)
    return { ok: true }
  })

  bridge.register('ping', async () => ({ pong: true, ts: Date.now() }))

  logger.info(
    `[BridgeManager] builtin handlers registered: ${bridge.stats.handlers.length} (electron=${!!_electronMod})`
  )
}
