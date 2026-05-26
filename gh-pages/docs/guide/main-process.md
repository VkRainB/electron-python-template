# 主进程入口

入口文件位于 `electron/main/index.js`，结构如下：

```js
import { app, shell, BrowserWindow, session } from 'electron'
import { Logger } from './logger/logger.js'
import { PythonService } from './services/python-service.js'
import { getBridgeManager } from './services/electron-bridge/index.js'
import { setupIpc } from './ipc/index.js'
import { getEventBus } from './ipc/events/event-bus.js'
import { getContainer } from './ipc/core/container.js'
```

## 全局状态

```js
const logger = Logger.getInstance()
const eventBus = getEventBus(logger)

let mainWindow = null
const pythonService = new PythonService()
let bridge = null
```

- `Logger` 是单例，主进程任何文件都通过 `getInstance()` 共享同一实例
- `pythonService` 在模块加载时立即实例化，但不启动；启动放在 `bootstrap` 里
- `bridge` 延迟创建，依赖 `pythonService.getBackendBaseUrl()` 返回真实端口

## 创建窗口

```js
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

  getContainer().register('mainWindow', mainWindow)

  mainWindow.on('ready-to-show', () => mainWindow.show())

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
```

注意点：

- `show: false` 配合 `ready-to-show` 避免白屏一闪
- 外链 `setWindowOpenHandler` 一律转到系统浏览器
- 开发态读 `ELECTRON_RENDERER_URL`（Vite Dev Server URL），生产态加载打包后的 `index.html`

## bootstrap 五步

```js
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

  createWindow()
  setupIpc({ pythonService })
}
```

顺序敏感：

1. 必须先把 Python 起来，否则 BridgeManager 拿不到正确 URL
2. 必须先 `createWindow` 把 `mainWindow` 注册到容器，再 `setupIpc`，否则 handler 解析 `deps: ['mainWindow']` 时拿不到
3. Bridge 在窗口可见前就开始连，缩短「窗口已亮 / 数据未到」的等待

## app 事件

```js
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

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
```

注意 CSP 剥离：开发态 Vite 会注入 `Content-Security-Policy: default-src 'self'`，会阻断 preload 暴露的部分接口。主进程统一剥掉所有 CSP 响应头，避免在每个页面单独处理。

## 退出收尾

```js
let isQuittingHandled = false

app.on('before-quit', async (event) => {
  if (isQuittingHandled) return
  event.preventDefault()
  isQuittingHandled = true

  logger.info('[main] before-quit: 开始清理')
  try {
    try { bridge?.disconnect() } catch { /* ignore */ }
    await pythonService.stop()
    logger.info('[main] before-quit: 清理完成')
  } catch (e) {
    logger.error(`[main] before-quit 清理失败:${e.message}`)
  } finally {
    app.quit()
  }
})
```

`isQuittingHandled` 防止重入：在 `await` 期间 Electron 可能再次触发 `before-quit`。第一次进入时 `preventDefault`，跑完清理再 `app.quit()`。
