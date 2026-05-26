# Electron 主进程

Electron 端承担三件事：

1. 创建并维护 BrowserWindow，处理应用生命周期
2. 监督 Python 子进程：spawn、健康检查、崩溃重启
3. 作为通信枢纽：渲染端通过 IPC 调用本地能力，Python 通过 WebSocket 反向触发本地能力

## 关键依赖

| 依赖 | 角色 |
| --- | --- |
| `electron` | 桌面框架本体 |
| `electron-vite` | 主进程 / preload / 渲染端的开发与编译 |
| `@electron-toolkit/preload` | 安全的 electronAPI 封装 |
| `@electron-toolkit/utils` | `is.dev`、`electronApp` 等辅助 |
| `electron-updater` | 自动更新（已配置，未启用） |
| `axios` | 内部 HTTP 调用 Python `/health`、`/daemon/status` |
| `ws` | WebSocket 客户端，建立 `/ws/electron` 长连接 |

## 三个进程子模块

```
electron/main/
├── index.js                       入口
├── logger/                        日志单例
├── services/
│   ├── python-service.js          spawn / 健康检查 / 自愈
│   ├── python-daemon-client.js    与 Python /daemon/* HTTP 协作
│   └── electron-bridge/           与 Python 的 WS 反向通道
└── ipc/                           IPC 路由 + 中间件
```

## 启动流程

主进程入口 `electron/main/index.js` 的 `bootstrap()`：

```js
async function bootstrap() {
  logger.info('[main] === Electron starting ===')

  pythonService.onReady(() => {
    logger.info('[main] python ready -> broadcast python-ready')
    eventBus.emit('python-ready')
  })

  try {
    await pythonService.start()                          // 1. 拉起 Python
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
  bridge.connect()                                      // 2. 连 WS

  createWindow()                                        // 3. 开窗
  setupIpc({ pythonService })                           // 4. 装配 IPC
}
```

关键约定：

- `createWindow` 必须先注册到 DI 容器（`container.register('mainWindow', mainWindow)`），随后 `setupIpc` 的 handler 才能拿到窗口引用
- `activate` 事件下重建窗口也会再次写入容器，引用自动刷新
- `before-quit` 拦截：先 `bridge.disconnect()`、再 `pythonService.stop()`，最后 `app.quit()`

## 主进程内部的事件总线

```
electron/main/ipc/events/event-bus.js
```

`Logger.getInstance()` 与 `getEventBus(logger)` 都是单例。常见事件：

| 事件 | 触发 | 订阅者 |
| --- | --- | --- |
| `python-ready` | `PythonService` 通过 `/health` 探活成功 | IPC handler 通知前端 |
| `bridge-connected` | WS 连上 Python | 前端徽标变绿 |
| `bridge-disconnected` | WS 断开 | 前端徽标变红 |

## 安全模型

```js
mainWindow = new BrowserWindow({
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false
  }
})
```

- `contextIsolation` 默认开（preload 通过 `contextBridge.exposeInMainWorld` 暴露能力）
- `sandbox: false` 是因为 preload 需要 `ipcRenderer` 与 Node 模块
- 主进程主动剥离上游响应的 `Content-Security-Policy` 头，避免 Vite Dev Server 注入的 CSP 阻断 IPC 通信

详见后续章节：

- [主进程入口](/guide/main-process)
- [IPC 系统](/guide/ipc)
- [Python 服务管理](/guide/python-service)
- [Bridge 反向通信](/guide/electron-bridge)
