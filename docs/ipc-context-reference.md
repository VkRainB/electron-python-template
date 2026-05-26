# IPC handler ctx 参考

本文档说明 IPC handler 第一参数 `ctx` 的来源、字段、典型用法。
配套阅读:[ipc-module-guide.md](./ipc-module-guide.md)。

---

## 1. `_ctx` 是什么

`_ctx` 不是特殊对象,就是 handler 的第一个参数 `ctx`,前缀下划线是 JS 的命名约定 —— 表示"必须占住这个位置但用不到"。ESLint 默认不对下划线开头的未使用参数报警。

```js
handler: async (ctx, deps)  => { ... }    // 用 ctx
handler: async (_ctx, deps) => { ... }    // 不用 ctx,但要拿第二参 deps
handler: async (ctx, _deps) => { ... }    // 反过来
```

类型定义见 `electron/main/ipc/core/ipc-context.js`。

---

## 2. ctx 字段总览

| 字段 | 类型 | 来源 | 用途 |
|---|---|---|---|
| `channel` | string | router 创建 | 当前请求的频道名,如 `'fs:read-text'` |
| `payload` | any | renderer 传入 | **原始**参数,未经 schema 校验/转换 |
| `validatedPayload` | any | validate 中间件 | schema 校验/转换**后**的参数(无 schema 时等于 payload) |
| `event` | `IpcMainInvokeEvent` | electron 原生 | 含 `sender` 等,用于定位调用窗口 |
| `deps` | `Record<string, any>` | container | 依赖对象(也作为 handler 第二参传入,通常用第二参更顺) |
| `traceId` | string | router 创建 | 请求追踪 id,贯穿全链路日志 |
| `startTime` | number | router 创建 | 请求开始时间戳(ms) |
| `logger` | Logger | container | 日志器,等同于 `ctx.deps.logger` |
| `response` | object | 中间件链填入 | 最终响应壳,**后置中间件**可读/改写 |
| `_schema` | zod schema | router 私有 | validate 中间件用,业务不要碰 |
| `durationMs` | number | timing 中间件 | 本次请求总耗时,主要给 metrics 读 |

---

## 3. 5 个典型用法

### 3.1 拿参数(最常见)

```js
handler: async (ctx) => {
  const { path, encoding = 'utf-8' } = ctx.validatedPayload
  return await fs.readFile(path, encoding)
}
```

**注意**:有 schema 时一定用 `ctx.validatedPayload`(零成本拿到类型转换/默认值填充后的对象),没有 schema 时 `payload` 和 `validatedPayload` 完全等价。

### 3.2 完全不用 ctx

```js
handler: async (_ctx, { python }) => {
  return python.getStatus()
}
```

### 3.3 拿事件源(定位调用窗口)

```js
import { createRequire } from 'node:module'
const { BrowserWindow } = createRequire(import.meta.url)('electron')

handler: async (ctx) => {
  const win = BrowserWindow.fromWebContents(ctx.event.sender)
  return await dialog.showOpenDialog(win, { ... })
}
```
`dialog` 模块就是这样让弹窗自动 attach 到调用者窗口的(`electron/main/ipc/modules/dialog/dialog.module.js`)。

### 3.4 写带 traceId 的业务日志

```js
handler: async (ctx) => {
  ctx.logger.info(`[fs] read trace=${ctx.traceId} path=${ctx.payload.path}`)
}
```

框架已经在 logging 中间件里自动打了入参/出参日志(`[ipc][channel] >>/<<`),业务一般**不必**自己再打,除非要标记某个业务关键节点。

### 3.5 自定义返回 meta(罕用)

```js
import { ok } from '../../core/ipc-response.js'

handler: async (ctx) => {
  const data = await something()
  return ok(data, { customMeta: 'foo' })   // 想塞额外 meta 时手动包壳
}
```

默认情况下,handler 直接 `return value` 会被自动包成 `{ ok:true, data: value, meta: { traceId, durationMs } }`,**不需要手动包**。

---

## 4. handler 签名速记

```js
handler: (ctx, deps) => { ... }
//        ↑    ↑
//        │    └─ container 按 deps:['python','logger'] 解析出的 { python, logger }
//        └─ IpcContext(见第 2 节)
```

第二参 `deps` 就是 `ctx.deps`,只是单独拎出来便于解构。两种写法等价:

```js
handler: async (ctx, { python }) => python.getStatus()
handler: async (ctx) => ctx.deps.python.getStatus()
```

---

## 5. payload 与 validatedPayload 的区别

| 场景 | `ctx.payload` | `ctx.validatedPayload` |
|---|---|---|
| 无 schema | renderer 原值 | 等于 `payload`(同一个引用) |
| 有 schema 且校验通过 | renderer 原值 | zod 转换后的对象(可能有默认值、类型强转、剥离未知字段) |
| 有 schema 但校验失败 | 不会进入 handler | 不会进入 handler(validate 中间件直接返回 fail) |

业务代码**统一用 `validatedPayload`** 是最安全的选择。`payload` 仅在需要拿到 schema 之外的字段(如调试)时使用。

---

## 6. 字段来源时序

请求流转一次,字段填充顺序:

```
ipcMain.handle 触发
  ↓
router 创建 ctx                          → channel / payload / event / deps / traceId / startTime / logger
  ↓
error-boundary 中间件                    (透传)
  ↓
logging 中间件                           (读 channel/payload/traceId 打入站日志)
  ↓
timing 中间件                            (记录 t0)
  ↓
metrics 中间件                           (透传)
  ↓
validate 中间件                          → validatedPayload  (若 schema 校验通过)
  ↓
handler(ctx, deps)                       → response          (返回值自动包壳填到 ctx.response)
  ↓
timing 中间件回程                         → durationMs / response.meta
  ↓
metrics 中间件回程                       (读 response/durationMs 更新计数器)
  ↓
logging 中间件回程                       (读 response 打出站日志)
  ↓
error-boundary 中间件回程                (兜底:若 ctx.response 未设置则补一个 fail)
  ↓
ipcMain.handle 返回 ctx.response 给 renderer
```

后置中间件(`await next()` 之后的代码)总是能读到当前 `ctx.response`。
