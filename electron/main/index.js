import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { Logger } from './logger/logger.js'
import { PythonService } from './services/python/python-service.js'
import { getBridgeManager } from './services/python/electron-bridge/index.js'
import { createTray, destroyTray } from './services/os/tray.js'
import { setupIpc } from './ipc/index.js'
import { getEventBus } from './ipc/events/event-bus.js'
import { getContainer } from './ipc/core/container.js'

const logger = Logger.getInstance()
const eventBus = getEventBus(logger)

let mainWindow = null
const pythonService = new PythonService()
let bridge = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 同步到 DI 容器,handler 通过 deps:['mainWindow'] 即可拿到
  // 重建场景(activate 事件)也走这里,容器引用自动刷新
  getContainer().register('mainWindow', mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function bootstrap() {
  logger.info('[main] === Electron starting ===')

  pythonService.onReady(() => {
    logger.info('[main] python ready -> broadcast python-ready')
    eventBus.emit('python-ready')
  })

  try {
    await pythonService.start()
  } catch (e) {
    logger.error(`[main] pythonService.start failed: ${e.message}`)
  }

  bridge = getBridgeManager(pythonService.getBackendBaseUrl())
  bridge.transport.on('connected', () => {
    logger.info('[main] bridge connected -> broadcast bridge-connected')
    eventBus.emit('bridge-connected')
  })
  bridge.transport.on('disconnected', () => {
    logger.info('[main] bridge disconnected -> broadcast bridge-disconnected')
    eventBus.emit('bridge-disconnected')
  })
  bridge.connect()

  // 先创建窗口,这样容器里 'mainWindow' 已就绪;setupIpc 再注册 handlers
  createWindow()
  createTray(mainWindow)
  setupIpc({ pythonService })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  // 关闭 CSP:移除所有 Content-Security-Policy 响应头(防止 vite dev / 上游注入)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    for (const key of Object.keys(headers)) {
      if (/^content-security-policy/i.test(key)) delete headers[key]
    }
    callback({ responseHeaders: headers })
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  bootstrap()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

let isQuittingHandled = false

app.on('before-quit', async (event) => {
  if (isQuittingHandled) return
  event.preventDefault()
  isQuittingHandled = true

  logger.info('[main] before-quit: 开始清理')
  destroyTray()
  try {
    try {
      bridge?.disconnect()
    } catch {
      /* ignore */
    }
    await pythonService.stop()
    logger.info('[main] before-quit: 清理完成')
  } catch (e) {
    logger.error(`[main] before-quit 清理失败:${e.message}`)
  } finally {
    app.quit()
  }
})
