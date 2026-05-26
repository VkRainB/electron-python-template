# 通信通道

三端共有 **三条通道**，方向、协议、用途互不重叠。

## 通道总表

| 通道 | 方向 | 协议 | 端点 / API | 主要用途 |
| --- | --- | --- | --- | --- |
| ① Renderer ↔ Main | 双向 | Electron IPC | `window.ipc` / `window.electron` | 状态查询、连接控制、事件订阅 |
| ② Renderer → Python | 单向请求 | HTTP | `POST /api/bridge` | 同步业务调用 |
| ③ Python → Renderer | 单向请求 | WebSocket | `/ws/electron` → 主进程 BridgeManager | Python 主动唤起前端能力 |

## 通道一：IPC（Renderer ↔ Main）

渲染端通过 preload 暴露的两个对象访问：

```js
window.electron   // @electron-toolkit/preload 提供的工具集
window.ipc        // 原始 ipcRenderer，用于自定义通道
```

业务调用都在 `web/src/api/ipc/` 下做了一层封装：

```js
// web/src/api/ipc/python.js
export function getBackendUrl() {
  return window.ipc.invoke('python:get-backend-url')
}
```

主进程侧由 IPC Router 装配：

```js
// electron/main/ipc/index.js
router
  .use(errorBoundary())
  .use(logging())
  .use(timing())
  .use(metrics())
  .use(validate())

router.registerAll(allModules)
```

模块通过 `import.meta.glob` 自动发现，每个 handler 声明依赖（`deps: ['python']`），由容器注入。

## 通道二：HTTP /api/bridge

渲染端调用 Python 业务的标准方式。客户端见 `web/src/services/bridge-client.js`：

```js
const result = await pythonBridgeClient.call(
  'echoPresenter',     // presenter 名
  'echo',              // 方法名
  ['hello'],           // 参数
  { timeout: 5000 }    // 可选
)
```

请求体：

```json
{
  "presenter": "echoPresenter",
  "method": "echo",
  "args": ["hello"]
}
```

成功响应：

```json
{
  "status": "success",
  "data": "hello"
}
```

失败响应：

```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "presenter 'missing' not found"
}
```

### 错误码

| code | HTTP 状态 | 含义 |
| --- | --- | --- |
| `NOT_FOUND` | 404 | presenter 或 method 不存在 |
| `INTERNAL` | 500 | presenter 内部抛异常 |
| —（前端造） | — | `BridgeTimeoutError` 超时；`BridgeHttpError` 非 JSON 响应 |

### baseUrl 解析

渲染端不写死 URL：

1. 启动时 `BridgeClient` 调 `ipc.invoke('python:get-backend-url')`
2. 主进程从 `PythonService` 拿到当前 baseUrl（可能因端口探测变成 47822）
3. 缓存到内存；WS 断开事件触发后清空，下次调用重新解析

## 通道三：WebSocket /ws/electron

Python 主动调用 Electron 能力（弹窗、读写本地、推送事件）走这条。

主进程持有一个长连接 `BridgeManager`：

```
electron/main/services/electron-bridge/
├── bridge-manager.js
├── ws-transport.js          指数退避重连 1/2/4/8/15s
├── builtin-handlers.js      系统对话框等内置 action
└── types.js
```

Python 侧调用：

```python
from app.electron_api.electron_api import electron_api

result = await electron_api.call("show_open_dialog", {"title": "选择文件"})
```

消息协议（简化）：

```json
{
  "callback_id": "uuid",
  "type": "electron_request",
  "action": "show_open_dialog",
  "params": { "title": "选择文件" },
  "timeout": 30
}
```

主进程收到后：

1. 在 BridgeManager 找匹配的 action handler
2. 执行（可能再走 IPC 触发渲染层）
3. 把结果以同 `callback_id` 的 `response` 帧回写给 Python
4. Python `CallbackManager` 按 `callback_id` 解决对应 future

### 超时与重连

| 场景 | 默认值 | 可配置 |
| --- | --- | --- |
| Python 端调用超时 | 30s | `electron_api.call(action, params, timeout=30)` |
| WS 重连退避 | 1 → 2 → 4 → 8 → 15s 循环 | `ws-transport.js` |
| 主进程检测断开 | TCP 半连接 + ping | 默认开启 |

## 完整一次往返

以「Python 业务里要让用户选一个文件再继续」为例：

```
Renderer.someFn()
   │
   ▼  IPC python:get-backend-url
Main.PythonService.getBackendBaseUrl()  →  Renderer
   │
   ▼  HTTP POST /api/bridge { presenter: someP, method: doIt }
Python.somePresenter.doIt()
   │
   ▼  WS electron_request { action: "show_open_dialog", callback_id: "..." }
Main.BridgeManager.processRequest → builtin handler
   │
   ▼  Electron dialog.showOpenDialog() (主进程原生对话框)
   │
   ▼  WS response { callback_id: "...", success: true, result: filePath }
Python.someP.doIt 拿到 filePath，继续业务
   │
   ▼  HTTP 200 { status: "success", data: ... }
Renderer.someFn() 拿到最终结果
```

三条通道协同，完整闭环。
