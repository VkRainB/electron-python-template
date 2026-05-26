# IPC 模块开发指南

本文档说明如何在 `electron/main/ipc/modules/` 下新增一个 IPC 模块,以及如何在渲染端调用。

适用范围:渲染进程 ↔ 主进程的请求/响应类 IPC,以及主进程 → 渲染进程的广播事件。
不涉及 Python ↔ 主进程的 WebSocket Bridge(见 `docs/communication.md`)。

---

## 1. 自动加载机制

`modules/index.js` 使用 Vite 的 `import.meta.glob('./**/*.module.js', { eager: true })` **自动扫描所有子目录**下的 `*.module.js` 文件,聚合为模块清单数组。

```js
// electron/main/ipc/modules/index.js  (一次写好,无需再动)
const modules = import.meta.glob('./**/*.module.js', { eager: true })
export default Object.values(modules).map((m) => m.default).filter(Boolean)
```

**含义**:在 `modules/` 任意层级新建一个以 `.module.js` 结尾的文件,就会被自动注册,**不需要在任何地方手动 import**。Vite 在编译期把 glob 解析为静态 import 数组,运行时零开销。

---

## 2. 目录结构

按业务域分子目录,域内可以放该域专属的 schemas / helpers / types:

```
electron/main/ipc/modules/
├── python/
│   └── python.module.js
├── bridge/
│   └── bridge.module.js
├── dialog/
│   └── dialog.module.js
├── system/
│   └── system.module.js
└── index.js                 # 一行 glob,不需要改动
```

---

## 3. 模块清单格式

每个 `*.module.js` 默认导出一个 `IpcModule` 对象:

```js
export default {
  name: 'xxx',            // 仅用于日志识别
  handlers: [
    { channel, handler, schema?, deps? },
    ...
  ]
}
```

中间件链(error-boundary / logging / timing / metrics / validate)对所有 handler 自动生效。

---

## 4. 完整示例:新增 `fs` 模块

需求:提供两个 channel,读文本文件、写文本文件。从零到 Vue 组件可调用,共 3 步。

### 步骤 1 — 主进程模块

新建 `electron/main/ipc/modules/fs/fs.module.js`:

```js
import fs from 'node:fs/promises'
import { z } from 'zod'
import { IpcError } from '../../core/ipc-error.js'   // 注意:子目录下,需要 ../../ 回到 ipc/

const readSchema = z.object({
  path: z.string().min(1),
  encoding: z.string().optional()
})

const writeSchema = z.object({
  path: z.string().min(1),
  content: z.string()
})

/**
 * @type {import('../../core/ipc-router.js').IpcModule}
 */
export default {
  name: 'fs',
  handlers: [
    {
      channel: 'fs:read-text',
      schema: readSchema,
      handler: async (ctx) => {
        const { path, encoding = 'utf-8' } = ctx.validatedPayload
        try {
          return await fs.readFile(path, encoding)
        } catch (e) {
          if (e.code === 'ENOENT') {
            throw new IpcError('FS_NOT_FOUND', `文件不存在: ${path}`)
          }
          throw e
        }
      }
    },
    {
      channel: 'fs:write-text',
      schema: writeSchema,
      handler: async (ctx) => {
        const { path, content } = ctx.validatedPayload
        await fs.writeFile(path, content, 'utf-8')
        return { written: true, bytes: Buffer.byteLength(content) }
      }
    }
  ]
}
```

保存即生效。**不需要在任何 index.js 里 import 它**。

### 步骤 2 — 渲染端 API 封装

新建 `web/src/api/ipc/fs.js`:

```js
const ipc = window.electron.ipcRenderer

export const readText = (path, encoding) =>
  ipc.invoke('fs:read-text', { path, encoding })

export const writeText = (path, content) =>
  ipc.invoke('fs:write-text', { path, content })
```

(可选)在 `web/src/api/ipc/index.js` 加一行 `export * as fs from './fs.js'`,以便统一从 `@/api/ipc` 解构。

### 步骤 3 — 组件中使用

```vue
<script setup>
import * as fsApi from '@/api/ipc/fs'

async function loadConfig() {
  const resp = await fsApi.readText('C:/data/config.json')
  if (resp.ok) {
    const obj = JSON.parse(resp.data)
    console.log(obj)
  } else {
    console.error(resp.error.code, resp.error.message)
  }
}
</script>
```

---

## 5. handler 配置项

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `channel` | string | 是 | 任意字符串,建议 `domain:action` 格式 |
| `handler` | `(ctx, deps) => any \| Promise<any>` | 是 | 业务函数,返回值自动包成 `{ok:true, data}` |
| `schema` | zod schema | 否 | 校验 `payload`,失败返回 `IPC_VALIDATION_FAILED` |
| `deps` | `string[]` | 否 | 声明容器中的依赖 key,自动注入到 handler 第二参 |

### handler 入参

```js
handler: async (ctx, deps) => { ... }
```

- `ctx.payload` — renderer 传过来的原始参数
- `ctx.validatedPayload` — schema 校验/转换后的参数(无 schema 时等于 payload)
- `ctx.event` — Electron `IpcMainInvokeEvent`(含 `sender` 用于定位窗口)
- `ctx.traceId` — 本次请求追踪 id
- `ctx.logger` — Logger 单例
- `deps` — 容器解析出的依赖对象,如 `{ python, logger }`

### handler 返回值

| 返回方式 | 渲染端拿到 |
|---|---|
| `return any` | `{ ok: true, data: any, meta: { traceId, durationMs } }` |
| `throw new IpcError(code, msg, details?)` | `{ ok: false, error: { code, message, details }, meta }` |
| `throw new Error(...)` | `{ ok: false, error: { code: 'IPC_INTERNAL_ERROR', message }, meta }` |
| `return ok(data)` / `return fail(code, msg)` | 直接透传(需要自定义 meta 时使用) |

---

## 6. 依赖注入

handler 不要直接 import 服务,改走容器。

### 注册服务

`electron/main/ipc/index.js`:

```js
import { FileWatcherService } from '../services/file-watcher.js'

container.register('fileWatcher', new FileWatcherService())  // 直接传实例
container.register('bridge', () => getBridgeManager())       // 工厂函数 = 懒加载单例
```

### 声明依赖

```js
{
  channel: 'fs:watch',
  deps: ['fileWatcher', 'logger'],
  handler: async (ctx, { fileWatcher, logger }) => {
    logger.info('[fs] start watching')
    return fileWatcher.watch(ctx.payload.path)
  }
}
```

如果 `deps` 中的 key 未注册,`router.register()` 会在启动阶段抛 `IPC_DEPENDENCY_MISSING` 早失败。

---

## 7. 广播事件(主进程 → 渲染端)

不走 channel/handler,走 `eventBus`。事件名为任意字符串,不需要预先注册。

### 主进程发送

```js
import { getEventBus } from '../ipc/events/event-bus.js'
import { Logger } from '../logger/logger.js'

const eventBus = getEventBus(Logger.getInstance())
eventBus.emit('fs:file-changed', { path: '/foo/bar.txt' })
```

### 渲染端订阅

在 `web/src/api/ipc/fs.js` 加订阅函数:

```js
export function onFileChanged(cb) {
  const wrapped = (_e, payload) => cb(payload)
  ipc.on('fs:file-changed', wrapped)
  return () => ipc.removeListener('fs:file-changed', wrapped)
}
```

组件中使用,记得卸载:

```js
import { onMounted, onBeforeUnmount } from 'vue'
import * as fsApi from '@/api/ipc/fs'

let unsubscribe
onMounted(() => {
  unsubscribe = fsApi.onFileChanged(({ path }) => {
    console.log('文件变了:', path)
  })
})
onBeforeUnmount(() => unsubscribe?.())
```

事件 payload 不走统一壳,直接是原始数据。

---

## 8. 错误码规范

| 类型 | 命名 | 示例 |
|---|---|---|
| 框架内置 | `IPC_*` | `IPC_VALIDATION_FAILED` / `IPC_INTERNAL_ERROR` / `IPC_DEPENDENCY_MISSING` |
| 业务自定义 | `<DOMAIN>_<REASON>` 全大写下划线 | `FS_NOT_FOUND` / `PYTHON_NOT_READY` / `BRIDGE_CONNECT_TIMEOUT` |

业务错误一律 `throw new IpcError(code, message, details?)`,由 error-boundary 中间件统一转成失败响应。

---

## 9. Checklist

新增一个模块需要做的事:

| 步骤 | 文件 | 是否必做 |
|---|---|---|
| 1 | 新建 `electron/main/ipc/modules/<域>/xxx.module.js` | 必做 |
| 2 | 新建 `web/src/api/ipc/xxx.js` 薄封装 | 推荐 |
| 3 | `web/src/api/ipc/index.js` 加 `export * as xxx` | 可选 |
| 4 | 如有新服务,`container.register('key', service)` | 仅当 handler 需要 |

**不需要做的**:
- 修改 `modules/index.js`(glob 自动发现)
- 修改 `ipc/index.js`(只读 `allModules`)
- 修改 preload(已全量暴露 `ipcRenderer`)
- 维护任何契约 / 白名单
- 改 eslint 配置

---

## 10. 模块的子目录路径规则

| 模块位置 | 引用框架代码时的相对路径 |
|---|---|
| `modules/xxx.module.js`(直接放 modules 下) | `'../core/ipc-error.js'` |
| `modules/<域>/xxx.module.js`(放在域子目录) | `'../../core/ipc-error.js'` |
| `modules/<域>/<子域>/xxx.module.js` | `'../../../core/ipc-error.js'` |

推荐统一放到子目录(`modules/<域>/xxx.module.js`),路径一致,便于复制粘贴。
