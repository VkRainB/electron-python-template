# 架构总览

模板把整套应用拆成三个独立运行的进程：

```
┌────────────────────────────────────────────────────────────┐
│                       Electron App                         │
│                                                            │
│   ┌──────────────┐         ┌────────────────────────┐      │
│   │  Renderer    │  IPC    │      Main Process      │      │
│   │  (Vue 3)     │ ◀────▶  │  (Node.js / Electron)  │      │
│   └──────┬───────┘         └──────────┬─────────────┘      │
│          │                            │ spawn / supervise  │
│          │ HTTP /api/bridge           │                    │
│          ▼                            ▼                    │
│   ┌────────────────────────────────────────────┐           │
│   │       Python Backend (FastAPI + WS)        │           │
│   │   /api/bridge   /ws/electron  /health ...  │           │
│   └────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────┘
```

## 三个进程的职责

### Renderer（渲染端）

- 完整的 Vue 应用，UI / 状态 / 路由都在这里
- 通过 `window.electron`（来自 preload）调用主进程能力
- 通过 `fetch /api/bridge` 直接调用 Python 业务
- 不持有 Python URL，启动时向主进程拿一次，断开后重新解析

### Main（主进程）

- 创建 BrowserWindow、管理菜单与生命周期
- spawn / 监督 Python 子进程，决定开发态走 venv、生产态走打包好的二进制
- 维护 IPC Router：依赖注入容器 + 洋葱模型中间件
- 持有 `BridgeManager`：与 Python 的 WebSocket 反向通道
- 把 Python 反向调用分发到合适的 handler（系统对话框、窗口操作等）

### Python Backend

- FastAPI 应用，启动后监听 `127.0.0.1:47821`（端口被占用时自动 +1）
- 提供 `/api/bridge` 让渲染端发起业务调用，按 `presenter:method` 动态分发
- 提供 `/ws/electron` 让主进程订阅，Python 通过它主动调用 Electron 能力
- 守护模式下写 `daemon.pid` / `daemon.version` / `daemon.port`，二次启动会拒绝重复 launch

## 启动时序

```
1. npm run dev → electron-vite 启动
2. main.js: bootstrap()
   ├── PythonService.start()
   │   ├── 检查 daemon meta，已存在则复用
   │   ├── 否则 spawn python_backend/main.py --daemon
   │   └── 轮询 /health 直到 ready
   ├── BridgeManager 建立 WS 到 /ws/electron
   ├── createWindow() 打开主窗口
   └── setupIpc()   注册所有 IPC handler
3. Renderer 加载首页
   ├── 通过 IPC 拿到 backendUrl
   └── 用 PythonBridgeClient 调用 /api/bridge
```

## 关键设计取舍

### 为什么用 HTTP 而不是纯 IPC

IPC 适合短而频繁的状态查询；业务调用如果都走 IPC，主进程会变成「转发器」。HTTP 让渲染端直接和 Python 对话，主进程只关心"Python 还活着吗"。

### 为什么主进程还是要持有 WebSocket

Python 偶尔需要主动通知前端（推送、长任务进度、需要弹窗确认）。直接让 Python 连渲染层会破坏 Electron 的安全模型；主进程做中转，再用 IPC 通知渲染端，符合最小特权原则。

### 为什么 Python 走守护模式

冷启动 PyInstaller 单文件 exe 大约 5 秒。守护模式让二次启动复用驻留进程，启动时间降到约 1 秒。`LifecycleManager` 在长期空闲后软退出，避免占内存。

## 错误模型

| 层 | 错误 | 处理 |
| --- | --- | --- |
| HTTP | 404 / 500 | `BridgeApiError(code, message)` 抛给前端 |
| HTTP | 超时 | `BridgeTimeoutError` |
| WS | 断开 | 主进程指数退避重连 1/2/4/8/15s |
| Python | LookupError | 转为 `NOT_FOUND` |
| Python | 其他异常 | 转为 `INTERNAL` + 完整 traceback |

更多见 [通信通道](/guide/communication) 与 [守护进程](/guide/daemon)。
