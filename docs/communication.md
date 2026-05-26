# 通信设计

本文档说明 new-template 中 Electron 渲染层、主进程、Python 后端三者之间的通信架构。完整的调用链与错误模型一并覆盖。

---

## 1. 概览

应用由三个进程组成：

```
┌─────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│   渲染进程 (Vue 3)   │      │  主进程 (Electron)   │      │  Python 后端 (FastAPI)│
│  src/renderer/...   │      │   src/main/...       │      │   python_backend/... │
└─────────┬───────────┘      └───────────┬──────────┘      └──────────┬───────────┘
          │                              │                            │
          │  ① IPC (contextBridge)       │                            │
          │  控制面：状态查询/连接控制    │                            │
          │ ◄─────────────────────────► │                            │
          │                              │                            │
          │  ② HTTP POST /api/bridge     │                            │
          │  业务面：同步 presenter 调用 │                            │
          │ ────────────────────────────────────────────────────────► │
          │ ◄──────────────────────────────────────────────────────── │
          │                              │                            │
          │                              │   ③ WebSocket /ws/electron │
          │                              │   反向面：Python 调 Electron│
          │                              │ ◄─────────────────────────►│
```

三个通道分工明确，互不重叠：

| 通道 | 方向 | 协议 | 用途 |
|---|---|---|---|
| ① IPC | Renderer ↔ Main | contextBridge + ipcRenderer.invoke | 状态查询、连接控制、事件订阅 |
| ② HTTP | Renderer → Python | `POST /api/bridge` | 同步业务调用（presenter dispatch） |
| ③ WebSocket | Python ↔ Main | `ws://127.0.0.1:47821/ws/electron` | Python 主动调 Electron 能力（通知/读文件/窗口） |

---

## 2. 通道 ① 渲染层 ↔ 主进程（IPC）

### 2.1 白名单 contextBridge

`src/preload/index.js` 通过 contextBridge 仅暴露受控 API：

```
INVOKE_ALLOWED = {
  bridge:ensure-connection
  bridge:get-status
  bridge:disconnect
  bridge:get-stats
  python:get-backend-url
  python:get-status
  python:health-check
  python:restart
  python:is-daemon-mode
}

RECEIVE_ALLOWED = {
  python-ready
  python-status-changed
  bridge-connected
  bridge-disconnected
}
```

调用未列入白名单的 channel 立即 reject，杜绝任意 IPC 滥用。

### 2.2 渲染层 API 命名空间

```js
window.api.python.getBackendUrl()        // 返回 'http://127.0.0.1:47821'
window.api.python.getStatus()            // { isRunning, healthCheckSuccess, ... }
window.api.python.healthCheck()          // { success: true, latencyMs }
window.api.python.restart()              // { success: true }
window.api.python.onReady(cb)            // 订阅 python-ready 事件，返回 off 函数

window.api.bridge.ensureConnection()     // { connected: true }
window.api.bridge.getStatus()            // { connected: bool }
window.api.bridge.getStats()             // { totalRequests, totalSuccess, ... }
window.api.bridge.onConnected(cb)
window.api.bridge.onDisconnected(cb)
```

### 2.3 IPC handler 实现

主进程把 PythonService、BridgeManager 的能力代理出去：

| 文件 | 注册的 channel |
|---|---|
| `src/main/ipc/handlers/bridge-handlers.js` | `bridge:*` |
| `src/main/ipc/handlers/python-service-handlers.js` | `python:*` |
| `src/main/ipc/index.js` | 统一入口 `registerAllIpcHandlers({ pythonService })` |

主进程在 `app.whenReady()` 中调用一次 `registerAllIpcHandlers`，并在 PythonService / BridgeManager 触发事件时通过 `webContents.send()` 广播到所有窗口。

---

## 3. 通道 ② 渲染层 → Python（HTTP）

### 3.1 端点契约

```
POST http://127.0.0.1:47821/api/bridge
Content-Type: application/json

{
  "presenter": "echoPresenter",
  "method":    "echo",
  "args":      ["hi"]
}
```

成功响应：
```json
{ "status": "success", "data": "hi" }
```

失败响应（404 NOT_FOUND / 500 INTERNAL）：
```json
{ "status": "error", "code": "NOT_FOUND", "message": "presenter 'xxx' not found" }
```

### 3.2 Python 端动态分发

`python_backend/app/bridge_api.py` 维护 presenter 注册表：

```
registry = {
  'echoPresenter': EchoPresenter(),
  # 业务 presenter 用 bridge.register(name, instance) 添加
}
```

收到请求后：
1. `registry[presenter]` 找实例 → 未命中抛 `LookupError` → HTTP 404
2. `getattr(instance, method)` 找方法 → 未命中抛 `LookupError` → HTTP 404
3. 同步方法直接执行；async 方法用 `await` 等待结果
4. 抛任意异常 → HTTP 500 + traceback

### 3.3 渲染层封装

`src/renderer/src/services/bridge-client.js` 提供 `PythonBridgeClient`：

```js
import { pythonBridgeClient } from './services/bridge-client.js'

const result = await pythonBridgeClient.call(
  'echoPresenter',
  'echo',
  ['hello'],
  { timeout: 10000 }
)
```

错误类型按发生层级区分：
- `BridgeTimeoutError` — fetch AbortController 触发
- `BridgeHttpError` — HTTP 非 2xx 且无 JSON body
- `BridgeApiError(code, message)` — HTTP 2xx 但 body.status === 'error'

baseUrl 通过 `window.api.python.getBackendUrl()` 动态获取，断线后自动清空并下次重新获取（监听 `bridge-disconnected` 事件）。

---

## 4. 通道 ③ Python → Electron（WebSocket）

### 4.1 报文协议

| type | 方向 | 含义 |
|---|---|---|
| `hello` / `hello_ack` | Electron→Python / Python→Electron | 握手 |
| `ping` / `pong` | 双向 | 心跳（10 s 一次） |
| `electron_request` | Python→Electron | 请求 Electron 执行 action |
| `response` | Electron→Python | 响应（携带 callback_id） |

`electron_request` 报文示例：
```json
{
  "type": "electron_request",
  "callback_id": "uuid-xxx",
  "action": "show_notification",
  "params": { "title": "hi", "body": "from python" },
  "timeout": 30
}
```

带 `callback_id` 表示需要响应；不带则是 fire-and-forget。

### 4.2 Python 端：CallbackManager + ElectronClient

`python_backend/app/electron_bridge/`：
- `ws_manager.py` — 单连接 WSManager，管理 socket、心跳、消息分发
- `callback_manager.py` — 分配 UUID + 维护 Future 表 + 超时自动清理
- `electron_client.py` — 上层 `call(action, params, timeout)` 与 `notify(action, params)`

业务侧使用 `app.electron_api.electron_api`：
```python
from app.electron_api import electron_api
await electron_api.show_notification(title='hi', body='from python')
await electron_api.read_file(path='/some/path')
```

WS 断开时 CallbackManager 调 `cancel_all(reason)`，让所有 pending Future 抛 `ConnectionError`，避免业务侧泄漏。

### 4.3 Electron 端：BridgeManager + builtin handlers

`src/main/services/electron-bridge/`：
- `ws-transport.js` — WebSocketBridgeTransport，继承 EventEmitter
  - 连接 / 心跳 / 指数退避重连（1s → 2s → 4s → 8s → 15s 上限）
- `bridge-manager.js` — BridgeManager 单例（`getBridgeManager()`）
  - handler 注册表（Map）
  - 收到 `electron_request` → 查 handler → 执行 → `sendSuccess`/`sendError`
  - 统计：totalRequests / totalSuccess / totalErrors / averageDuration
- `builtin-handlers.js` — 注册 11 个内置 handler：
  - `show_notification` / `open_url` / `read_file` / `write_file`
  - `show_open_dialog` / `show_save_dialog`
  - `window.minimize` / `window.maximize` / `window.close`
  - `log` / `ping`

未注册的 action 返回 `success: false, error: 'unknown action: xxx'`。

业务可在主进程任意位置 `bridge.register('myAction', async (params) => ...)`。

---

## 5. 守护进程机制

### 5.1 目标

- 多个 Electron 实例共享同一个 Python 进程
- 第二次启动时间从 ~5 s 降到 ~1 s

### 5.2 元数据文件

| 文件 | 内容 |
|---|---|
| Windows: `%LOCALAPPDATA%\app_electron\daemon.pid` | 当前 Python 进程 PID |
| Windows: `%LOCALAPPDATA%\app_electron\daemon.version` | 进程版本号（与 `APP_VERSION` 一致） |
| Windows: `%LOCALAPPDATA%\app_electron\daemon.port` | 实际监听端口 |
| Unix: `~/.app_electron/` | 同上 |

### 5.3 启动流程

```
Electron 主进程启动
  │
  v
PythonService.start()
  │
  ├─ daemonClient.isDaemonRunning()
  │     ├─ 读 daemon.pid → 验证 PID 存活
  │     ├─ 读 daemon.version → 主版本号匹配
  │     └─ HTTP GET /version → 二次确认
  │
  ├─ 命中（复用）: daemonClient.start() → reused: true, ~1s 完成
  │
  └─ 未命中: 
       ├─ spawn Python 子进程（detached, stdio: 'ignore', unref）
       ├─ 轮询 /health 至就绪
       └─ daemonClient.connectSession() 建立逻辑会话
```

`PythonService` 守护模式下 spawn 使用 `detached: true` + `unref()`，让 Python 进程脱离 Electron 父进程，Electron 退出后 Python 仍可驻留。

### 5.4 端口动态回退

如果 47821 被占用：
1. `DaemonManager.resolve_port()` 探测 47822、12656…
2. 实际端口写入 `daemon.port`
3. 下次启动通过该文件读取并连接

---

## 6. 自动恢复与重连

### 6.1 健康检查

`PythonService` 每 30 s `GET /health`，失败累计 → `_attemptRestart()`：
- 单次冷却 60 s（避免风暴）
- 最多 3 次（之后弹 dialog）

### 6.2 守护心跳

守护模式下 PythonService 每 120 s 调 `daemonClient.isDaemonRunning()`，失败触发 `_attemptDaemonRecovery()`：
- 最多 5 次
- 冷却 120 s

### 6.3 WebSocket 重连

`WebSocketBridgeTransport` 监听 `close` 事件：
- 非主动关闭（`disconnect()`）→ 进入指数退避
- 退避序列：1 / 2 / 4 / 8 / 15 / 15 / 15… s
- `open` 后重置计数

```
[ws] close code=1006
  ↓
[ws] reconnect in 1000ms (attempt 1)
  ↓ (Python 还没起)
[ws] connecting / error / close
  ↓
[ws] reconnect in 2000ms (attempt 2)
  ...
[ws] open  (Python 重启完毕)
  ↓
[ws] hello_ack received  (恢复正常)
```

---

## 7. 完整调用链示例

### 7.1 场景 A：渲染层点按钮 → Python 执行

```
[Vue 组件] callEcho()
  │
  v
[bridge-client.js] pythonBridgeClient.call('echoPresenter', 'echo', ['hi'])
  │
  ├─ window.api.python.getBackendUrl()  → IPC invoke → 主进程返回 URL
  │
  v
fetch POST http://127.0.0.1:47821/api/bridge
  │
  v
[Python FastAPI] /api/bridge route
  │
  v
[BridgeApi.async_invoke] registry['echoPresenter'].echo('hi')
  │
  v
返回 'hi'
  │
  v
{status: 'success', data: 'hi'}
  │
  v
[bridge-client.js] return 'hi'
  │
  v
[Vue 组件] echoResult.value = 'hi'
```

### 7.2 场景 B：Python 反向通知 Electron

```
[Python 业务代码] await electron_api.show_notification(title='hi', body='ok')
  │
  v
[ElectronClient.call] 
  ├─ callbacks.create(timeout) → callback_id = uuid, Future
  └─ ws.send({type, callback_id, action, params})
  │
  v  WebSocket
[ws-transport.js] on('message') → JSON.parse → emit('request', msg)
  │
  v
[BridgeManager.processRequest]
  ├─ handlers.get('show_notification') → builtin handler
  ├─ 执行 new Notification({title, body}).show()
  └─ transport.sendSuccess(callback_id, {shown: true})
  │
  v  WebSocket
[WSManager._dispatch] type === 'response' 
  │
  v
[CallbackManager.resolve] futures[cid].set_result({shown: true})
  │
  v
[Python 业务代码] 拿到 {shown: true}
```

---

## 8. 关键文件速查

### Electron 主进程

| 文件 | 职责 |
|---|---|
| `src/main/index.js` | 入口；启动 PythonService、BridgeManager、注册 IPC、广播事件 |
| `src/main/services/python-service.js` | spawn / 健康检查 / 自动重启 / stop 多重兜底 |
| `src/main/services/python-daemon-client.js` | 守护进程发现 / killByPid / killByPort / manualCleanup |
| `src/main/services/electron-bridge/ws-transport.js` | WS 连接、心跳、指数退避重连 |
| `src/main/services/electron-bridge/bridge-manager.js` | handler 注册表、请求分发、统计 |
| `src/main/services/electron-bridge/builtin-handlers.js` | 11 个内置 action |
| `src/main/ipc/handlers/*` | IPC channel handler |

### 渲染层

| 文件 | 职责 |
|---|---|
| `src/preload/index.js` | contextBridge 白名单暴露 |
| `src/renderer/src/services/bridge-client.js` | HTTP 业务客户端 + 错误类 |
| `src/renderer/src/App.vue` | Demo 页面 |

### Python 后端

| 文件 | 职责 |
|---|---|
| `python_backend/main.py` | argparse + uvicorn 入口 |
| `python_backend/app/server/server.py` | FastAPI 路由：health/version/bridge/daemon/electron/ws |
| `python_backend/app/bridge_api.py` | presenter 动态分发 |
| `python_backend/app/daemon_manager.py` | PID/version/port 文件 + 端口探测 |
| `python_backend/app/lifecycle_manager.py` | 空闲超时软退出 |
| `python_backend/app/electron_bridge/ws_manager.py` | WS 服务端 + 心跳 + 单连接独占 |
| `python_backend/app/electron_bridge/callback_manager.py` | callback_id ↔ Future |
| `python_backend/app/electron_api/electron_api.py` | 业务侧封装（show_notification 等） |
| `python_backend/app/presenters/echo_presenter.py` | 示例 presenter |

---

## 9. 退出与清理

完整流程见 `process_shutdown_report.html` 思路简化版：

```
app.on('before-quit')
  ├─ event.preventDefault()    ← 阻止默认退出
  ├─ isQuittingHandled 哨兵    ← 防重入
  │
  ├─ bridge.disconnect()       ← 关闭 WS
  │
  ├─ pythonService.stop()
  │    ├─ disconnectSession()              [HTTP /daemon/disconnect]
  │    ├─ POST /shutdown_evol              [触发 Python 自杀]
  │    ├─ 等 1 s
  │    ├─ daemonClient.manualCleanup()     [按 PID kill + 清元数据]
  │    └─ daemonClient.killByPort()        [端口兜底]
  │
  └─ app.quit()                ← 真正退出
```

多重兜底层级（从优雅到强制）：
1. HTTP `/shutdown_evol` → Python 端 SIGTERM 自己
2. 按 PID `taskkill /PID xx /F /T`（Windows）或 `process.kill(pid, 'SIGKILL')`（Unix）
3. 按端口 `netstat -ano` + taskkill（Windows）或 `lsof -ti:PORT | xargs kill -9`（Unix）
4. 删除 daemon.pid / .version / .port 三文件

---

## 10. 设计要点回顾

1. **关注点分离**：业务调用走 HTTP（无状态、易扩展），事件通知走 WS（持久连接、低延迟），状态控制走 IPC（无网络成本）
2. **守护进程按需保留**：默认 stop() 彻底清理；显式 `stop({ preserveDaemon: true })` 可保留供下次复用
3. **白名单 IPC**：preload 仅暴露固定 channel 集合，渲染层无法任意触发主进程
4. **错误模型分层**：超时 / HTTP / API（业务错误码）三种异常类型，渲染层可精细处理
5. **跨平台**：Windows 走 taskkill + netstat；Unix 走 SIGKILL + lsof；同一接口（DaemonClient）封装差异
