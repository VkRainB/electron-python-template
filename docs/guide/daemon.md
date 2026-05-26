# 守护进程

为了让二次启动更快、并允许多个前端共享一个 Python 进程，后端默认以 **守护模式** 运行。

## 启动指令

```bash
python python_backend/main.py --daemon
```

主进程在开发态自动加上 `--daemon`，生产态也一样。

## 元数据目录

| 平台 | 路径 |
| --- | --- |
| Windows | `%LOCALAPPDATA%\app_electron\` |
| macOS / Linux | `~/.app_electron/` |

目录名来自 `app.config.json`：

```json
{
  "daemon": {
    "dirName": {
      "win32": "app_electron",
      "unix": ".app_electron"
    }
  }
}
```

## 三个元数据文件

| 文件 | 内容 | 用途 |
| --- | --- | --- |
| `daemon.pid` | 进程 PID | 检测是否还活着、僵尸识别 |
| `daemon.version` | 二进制版本 | 升级检测，旧版本会被新版本替换 |
| `daemon.port` | 实际监听端口 | 二次启动时直接复用 |

## 启动决议流程

```
PythonService.start()
   │
   ▼ 读 daemon.port + daemon.pid
   │
   ├── 进程存活且端口可访问 → 直接复用，不 spawn
   │
   ├── 进程存活但端口已变 → kill 旧进程，spawn 新的
   │
   └── 进程不存在 / 文件残留 → 清理 meta，spawn 新进程
```

新进程内部：

```
DaemonManager.check_existing()
   │
   ▼ 已有同版本守护，本进程退出 1
   │
DaemonManager.resolve_port(default_port, host)
   │ 默认 47821，被占则探测 +1，最多 portProbeRange 次（默认 50）
   │
DaemonManager.acquire_lock(pid, version, port)
   │ 原子写三个 meta 文件，atexit 注册 release_lock
   │
LifecycleManager 启动空闲计时
```

## 空闲软退出

`LifecycleManager`（`python_backend/app/lifecycle_manager.py`）维护一个 `idle_seconds`，默认 48 小时。每次 HTTP 请求或 WS 帧都会 `touch()` 重置计时。超过阈值后向自己发 `SIGTERM`，触发 `atexit` 清理 meta，进程退出。

主进程下次启动时发现 meta 文件已被清理，会重新 spawn 一个新进程。

## 客户端连接计数

`DaemonManager` 也是一个**简易引用计数器**：

```python
daemon.on_client_connect(session_id)
daemon.on_client_disconnect(session_id)
```

WS 连接、`/daemon/connect` 都会注册 session_id。如果 `active_count > 0`，LifecycleManager 会持续 touch 续期；只有 `active_count == 0` 且空闲超时，才会真正软退出。

## 排查与清理

| 现象 | 处理 |
| --- | --- |
| 「端口已被占用，且 PID 文件不存在」 | 手动 `taskkill /PID <pid> /F`（Win）或 `kill -9 <pid>`（Unix），删除 `daemon.port` |
| 「meta 文件残留，启动卡住」 | 删除整个 `%LOCALAPPDATA%\app_electron\` 目录 |
| 「升级后还是连到旧版本」 | 关闭 Electron，确认 `daemon.pid` 对应进程已退出，再次启动 |
| 「想强制干掉守护进程」 | `POST /shutdown_evol` 给后端，或直接 `taskkill` |

## 测试用短超时

开发时不想等 48 小时验证空闲软退出：

```bash
python python_backend/main.py --daemon --idle-timeout 30
```

30 秒后没有任何流量就会自动退出，方便观察 lifecycle 日志。
