# IPC 系统

IPC 通道是主进程对外暴露能力的标准方式。模板把它做成了一个**可测试、可扩展的微框架**。

## 三个核心抽象

| 抽象 | 文件 | 作用 |
| --- | --- | --- |
| Container | `core/container.js` | 极简 DI，注册键值或工厂 |
| IpcRouter | `core/ipc-router.js` | 把 channel 字符串映射到 handler |
| Middleware | `core/middlewares/*.js` | 洋葱模型，每个 handler 共享 |

## 装配流程

入口在 `electron/main/ipc/index.js`：

```js
export function setupIpc({ pythonService }) {
  const logger = Logger.getInstance()
  const container = getContainer()

  container.register('python', pythonService)
  container.register('bridge', () => getBridgeManager())
  container.register('logger', logger)

  const router = new IpcRouter({ container, logger })

  router
    .use(errorBoundary())
    .use(logging())
    .use(timing())
    .use(metrics())
    .use(validate())

  router.registerAll(allModules)

  logger.info(
    `[ipc] all modules ready, modules=${allModules.length} channels=${router.listChannels().length}`
  )
  return router
}
```

容器里常用的键：

| key | 类型 | 说明 |
| --- | --- | --- |
| `python` | PythonService | 进程状态、URL、重启 |
| `bridge` | 工厂 → BridgeManager | 反向通道管理 |
| `logger` | Logger | 单例日志 |
| `mainWindow` | BrowserWindow | 在 createWindow 时写入 |

## 中间件管道

注册顺序即执行顺序，洋葱模型从外向内：

```
errorBoundary → logging → timing → metrics → validate → handler
```

| 中间件 | 责任 |
| --- | --- |
| `errorBoundary` | 把 handler 抛的异常转成统一响应 `{ ok: false, error: { code, message } }` |
| `logging` | 进入与离开记一行日志，含 channel 与耗时 |
| `timing` | 注入 `ctx.startedAt`，timing.end() 反向写回结果 meta |
| `metrics` | 收集 channel 调用次数、平均耗时（可 expose 给运维） |
| `validate` | 若模块声明了 `schema`，按 `zod` 校验入参 |

handler 拿到的上下文 `ctx`：

```js
async (ctx) => {
  ctx.deps          // 注入的依赖对象（按 deps: [...] 声明）
  ctx.payload       // 入参（已校验）
  ctx.event         // 原始 IpcMainInvokeEvent
  ctx.logger        // 子 logger（带 channel 前缀）
  return data       // 返回值会被包装成 { ok: true, data }
}
```

## 模块自动发现

`electron/main/ipc/modules/index.js`：

```js
const modules = import.meta.glob('./**/*.module.js', { eager: true })

export default Object.values(modules)
  .map((m) => m.default)
  .filter(Boolean)
```

新增能力只需新建 `modules/<域>/<feature>.module.js`，导出 default：

```js
// electron/main/ipc/modules/python/python.module.js
export default {
  name: 'python',
  handlers: [
    {
      channel: 'python:get-backend-url',
      deps: ['python'],
      handler: (_ctx, { python }) => python.getBackendBaseUrl()
    },
    {
      channel: 'python:get-status',
      deps: ['python'],
      handler: (_ctx, { python }) => python.getStatus()
    }
  ]
}
```

Vite 编译期就把 glob 解析成静态 import 数组，运行时零开销。

## 现有四个业务域

| 文件 | 提供的 channel |
| --- | --- |
| `modules/python/python.module.js` | `python:get-backend-url`、`python:get-status`、`python:health-check`、`python:restart`、`python:is-daemon-mode` |
| `modules/bridge/bridge.module.js` | `bridge:ensure-connection`、`bridge:get-status`、`bridge:disconnect`、`bridge:get-stats` |
| `modules/dialog/dialog.module.js` | `dialog:select-directory` |
| `modules/system/system.module.js` | `system:get-app-info` |

## 渲染端调用

`web/src/api/ipc/python.js` 提供薄封装：

```js
const ipc = window.electron.ipcRenderer

export const getBackendUrl = () => ipc.invoke('python:get-backend-url')
export const getStatus = () => ipc.invoke('python:get-status')
```

约定：所有 IPC 都通过 `invoke` 走，返回 `{ ok, data }` 或 `{ ok: false, error: { code, message } }`。
