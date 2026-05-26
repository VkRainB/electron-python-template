# API 调用

渲染端有两条对外的调用入口：

| 入口 | 用途 |
| --- | --- |
| `@/api/ipc/*` | 通过 Electron IPC 调主进程 |
| `pythonBridgeClient` | 通过 HTTP 调 Python 业务 |

## IPC 命名空间

`@/api/ipc/index.js` 把四个域聚合：

```js
export * as python from './python.js'
export * as bridge from './bridge.js'
export * as dialog from './dialog.js'
export * as system from './system.js'
```

业务里建议按需 import：

```js
import { getBackendUrl, getStatus, onReady } from '@/api/ipc/python'
```

### python

```js
getBackendUrl()      // Promise<{ ok, data: string }>     当前 baseUrl
getStatus()          // Promise<{ ok, data: Status }>     运行状态
healthCheck()        // 主动触发一次 /health
restart()            // 重启子进程
isDaemonMode()       // 是否守护模式
onReady(cb)          // 子进程进入 ready 状态
onStatusChanged(cb)  // 状态变更（restart、health 等）
```

`onReady` 与 `onStatusChanged` 都返回 `unsubscribe` 函数：

```js
import { onMounted, onUnmounted } from 'vue'
import { onReady } from '@/api/ipc/python'

let unsubscribe = null
onMounted(() => {
  unsubscribe = onReady(() => {
    console.log('python ready')
  })
})
onUnmounted(() => unsubscribe?.())
```

### bridge

```js
ensureConnection()    // 保证 WS 已连接，未连接则触发一次
getStatus()           // { isConnected, transport }
getStats()            // 调用次数、平均耗时、handlers 列表
disconnect()          // 主动断开
onConnected(cb)       // WS 上线
onDisconnected(cb)    // WS 掉线
```

### dialog

```js
selectDirectory({ title, defaultPath })   // 返回选择的目录或 null
```

更多对话框（文件、保存、消息框）按需在主进程添加。

### system

```js
getAppInfo()   // { name, version, productName, ... } 来自 app.config.json
```

## PythonBridgeClient

`@/services/bridge-client.js` 提供的客户端：

```js
import { pythonBridgeClient } from '@/services/bridge-client'

const result = await pythonBridgeClient.call(
  'echoPresenter',
  'echo',
  ['hello'],
  { timeout: 5000 }
)
```

### 错误类

```js
import {
  BridgeHttpError,    // 非 JSON 响应或 HTTP 错误未带统一壳
  BridgeApiError,     // 业务错误 { code, message }
  BridgeTimeoutError  // 超时
} from '@/services/bridge-client'

try {
  const data = await pythonBridgeClient.call('p', 'm')
} catch (e) {
  if (e instanceof BridgeApiError && e.code === 'NOT_FOUND') {
    /* ... */
  } else if (e instanceof BridgeTimeoutError) {
    /* ... */
  } else {
    throw e
  }
}
```

### baseUrl 缓存

第一次调用时通过 IPC 拿到 baseUrl 并缓存。订阅 `bridge.onDisconnected` 后清空缓存，下次调用再解析一次。这样：

- 端口变化（如 Python 重启换端口）能自动适应
- 不需要业务代码关心 URL 是什么

### 批量

```js
const [r1, r2] = await pythonBridgeClient.batch([
  { presenter: 'a', method: 'm1', args: [1] },
  { presenter: 'a', method: 'm2', args: [2] }
])
```

底层是 `Promise.all`，不是合并成一个请求。如果将来要做请求合并，可以在这里改成单次 HTTP。

## 业务封装的写法

不要在组件里直接 `pythonBridgeClient.call('userPresenter', 'getProfile')`。应该在 `services/` 下做一层薄封装：

```js
// web/src/services/user.js
import { pythonBridgeClient } from './bridge-client'

export async function getProfile() {
  return pythonBridgeClient.call('userPresenter', 'getProfile')
}

export async function updateProfile(payload) {
  return pythonBridgeClient.call('userPresenter', 'updateProfile', [payload])
}
```

好处：

- 业务方法签名稳定，组件升级零成本
- 容易写单测（mock 一个 `pythonBridgeClient`）
- 未来如果想从 HTTP 切到 IPC，只改这一层
