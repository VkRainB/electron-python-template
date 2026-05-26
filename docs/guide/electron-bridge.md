# Bridge 反向通信

主进程通过 WebSocket 连到 Python 的 `/ws/electron`，让 Python 能反向调用 Electron 能力（弹窗、读写本地、操作窗口、推送事件等）。

## 模块组成

```
electron/main/services/electron-bridge/
├── index.js
├── bridge-manager.js        BridgeManager + 单例工厂
├── ws-transport.js          WebSocket 收发与重连
├── builtin-handlers.js      内置 action（dialog、shell 等）
└── types.js                 类型定义
```

入口：

```js
import { getBridgeManager } from './services/electron-bridge/index.js'

const bridge = getBridgeManager(pythonService.getBackendBaseUrl())
bridge.connect()
```

`getBridgeManager` 是单例工厂，首次调用必须传 URL，之后任意位置 `getBridgeManager()` 都拿到同一实例。

## BridgeManager 主要职责

```js
class BridgeManager {
  constructor(pythonBackendUrl) {
    this.transport = new WebSocketBridgeTransport(pythonBackendUrl)
    this.handlers = new Map()
    this.isConnected = false
    this.stats = { totalRequests, totalSuccess, totalErrors, averageDuration, handlers }

    this.transport.on('request', (req) => this.processRequest(req))
    this.transport.on('connected', () => { this.isConnected = true })
    this.transport.on('disconnected', () => { this.isConnected = false })

    registerBuiltinHandlers(this)
  }

  register(action, handler) { /* ... */ }
  unregister(action) { /* ... */ }
  getStats() { /* ... */ }
  async processRequest(req) { /* ... */ }
}
```

`processRequest`：

1. 收到 `{ callback_id, action, params }`
2. 在 `handlers` 找匹配的 action
3. 找不到 → 通过 `transport.sendError(callback_id, msg)` 回错
4. 找到 → 执行，捕获异常，把结果通过 `transport.sendSuccess(callback_id, result)` 回 Python

整个 `processRequest` 是 fire-and-forget，外部 `transport.on('request')` 不等它返回，避免 head-of-line blocking。

## 内置 action

`builtin-handlers.js` 注册了一组开箱即用的 action：

- `show_notification` - 系统通知
- `open_url` - 用系统浏览器打开 URL
- `read_file` - 读取本地文件
- `write_file` - 写入本地文件
- `show_open_dialog` - 打开文件对话框
- `show_save_dialog` - 保存文件对话框
- `window.minimize` - 最小化当前窗口
- `window.maximize` - 最大化/还原当前窗口
- `window.close` - 关闭当前窗口
- `log` - 通过主进程 Logger 输出日志
- `ping` - 连通性测试

这些都是从 Python 一行调用就能弹起的桌面能力。

## 自定义 action

业务层可以在装配 IPC 后注册新 action：

```js
import { getBridgeManager } from '../services/electron-bridge/index.js'

const bridge = getBridgeManager()
bridge.register('app.recentFiles.add', async ({ path }) => {
  appStore.recentFiles.push(path)
  return { ok: true }
})
```

Python 侧用 `await electron_api.call('app.recentFiles.add', { 'path': '...' })` 即可。

## WebSocket 传输层

`ws-transport.js` 负责协议帧封装、心跳、重连：

| 行为 | 默认值 |
| --- | --- |
| 重连退避 | 1 → 2 → 4 → 8 → 15 秒 循环（指数退避，上限 15 秒） |
| 心跳间隔 | 10 秒（客户端主动发 `ping`） |
| 协议帧 | JSON，必含 `type`（`request` / `response` / `event` / `ping` / `pong` / `hello`） |

## 与渲染端的关系

主进程做中转，是为了：

- 复用 IPC 中间件管道（日志、计时、错误边界）
- 把权限审批交给主进程（如确认对话框）再透传给渲染端
- 让 Python 不需要关心当前有几个窗口

渲染端订阅事件：

```js
import { onConnected, onDisconnected } from '@/api/ipc/bridge'

onConnected(() => statusStore.bridge = 'connected')
onDisconnected(() => statusStore.bridge = 'disconnected')
```

底层是 `ipc.send('bridge:on-connected', { ... })` 由主进程广播给所有窗口。

## 统计与可观测

```js
const stats = bridge.getStats()
// {
//   totalRequests: 87,
//   totalSuccess: 85,
//   totalErrors: 2,
//   averageDuration: 14,    // ms
//   handlers: ['dialog.showOpenDialog', 'shell.openExternal', ...]
// }
```

可以通过 IPC `bridge:status` 暴露给前端调试面板。
