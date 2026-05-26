# Python 服务管理

`electron/main/services/python-service.js` 是主进程里对 Python 子进程的统一抽象。

## 配置常量

```js
export const ENABLE_DAEMON_MODE = true

export const MAX_RESTART_ATTEMPTS = 3
export const MAX_DAEMON_RECOVERY_ATTEMPTS = 5
export const HEALTH_CHECK_INTERVAL = 30_000
export const DAEMON_HEARTBEAT_INTERVAL = 120_000
export const RESTART_COOLDOWN = 60_000
export const DAEMON_RECOVERY_COOLDOWN = 120_000
```

| 常量 | 含义 |
| --- | --- |
| `MAX_RESTART_ATTEMPTS` | 非守护模式下连续重启上限 |
| `MAX_DAEMON_RECOVERY_ATTEMPTS` | 守护模式下尝试恢复的上限 |
| `HEALTH_CHECK_INTERVAL` | 30 秒一次 `/health` 探活 |
| `DAEMON_HEARTBEAT_INTERVAL` | 2 分钟一次 `/daemon/status` 心跳 |
| `RESTART_COOLDOWN` | 重启冷却 60 秒，避免雪崩 |

## 启动流程

```js
await pythonService.start()
```

内部分两条路径：

### 守护模式（默认）

1. `PythonDaemonClient` 读取本机 `daemon.pid` / `daemon.port`
2. 文件存在且 PID 存活 → 直接连，跳过 spawn
3. 否则 spawn 一份新进程：开发态用 `venv/Scripts/python.exe python_backend/main.py --daemon`
4. 轮询 `/health` 直到 200
5. 触发 `onReadyCallback`

### 非守护模式

1. 直接 spawn 子进程
2. 监听 `stdout` / `stderr` / `exit`
3. exit 非 0 触发重启循环，超过 `MAX_RESTART_ATTEMPTS` 报错

## 端口探测

端口配置在 [应用配置](/guide/config) 的 `backend` 节：

```json
{
  "backend": {
    "host": "127.0.0.1",
    "defaultPort": 47821,
    "portProbeRange": 50
  }
}
```

Python 侧 `DaemonManager.resolve_port` 接管真正的端口探测：从 `defaultPort` 开始 +1 探测最多 50 次。Electron 拿到的 `getBackendBaseUrl()` 永远反映当前真实端口。

## 健康检查

```
30s 一次 → GET http://127.0.0.1:<port>/health
```

- 连续 N 次失败 → 触发自愈
- 自愈优先级：在冷却期外 → 尝试守护恢复（重连） → 实在不行才 spawn 新进程

## 启动二进制定位

```js
_resolveExecutable() {
  const isPackaged = Boolean(_electronApp?.isPackaged)
  if (isPackaged) {
    const res = process.resourcesPath
    if (process.platform === 'win32') {
      return { command: path.join(res, `${BINARY_NAME}.exe`), args: [], cwd: res }
    }
    const dir = path.join(res, 'python_build', BINARY_NAME)
    return { command: path.join(dir, BINARY_NAME), args: [], cwd: dir }
  }
  const root = process.cwd()
  const backend = path.join(root, 'python_backend')
  if (process.platform === 'win32') {
    return {
      command: path.join(backend, 'venv', 'Scripts', 'python.exe'),
      args: [path.join(backend, 'main.py')],
      cwd: root
    }
  }
  return {
    command: path.join(backend, 'venv', 'bin', 'python3'),
    args: [path.join(backend, 'main.py')],
    cwd: root
  }
}
```

- `BINARY_NAME` 来自 `app.config.json.backend.binaryName`，本模板默认是 `mo_server`
- electron-builder 配置里把 PyInstaller 产物按 `extraResources` 复制到 `resources/`，跟该函数对齐

## 停止流程

`await pythonService.stop({ preserveDaemon })`：

1. 取消所有定时器（health、heartbeat）
2. 断开 daemon 会话（`disconnectSession`）
3. **守护模式**：若 `preserveDaemon=true` 则仅断 session、保留进程；否则执行 `_terminateDaemon` 四步清理：HTTP `/shutdown_evol` → 等待 1s → `manualCleanup`（按 PID kill + 清文件） → `killByPort` 兜底
4. **非守护模式**：SIGTERM → 等待 1 秒 → 若仍在则 SIGKILL → `killByPort` 兜底清理残留

## 暴露的接口

```js
class PythonService {
  start()
  stop({ preserveDaemon })   // preserveDaemon=true 时保留守护进程
  onReady(callback)
  getStatus()        // { isRunning, lastHealthCheck, healthCheckSuccess, restartCount, startTime, lastError }
  getBackendBaseUrl()
  isDaemonModeEnabled()
  healthCheck()      // 返回 { success, latencyMs, error? }
  restart()          // stop + start
}
```

`getStatus()` 是 IPC `python:status` 的数据源，渲染端可以画状态卡片。
