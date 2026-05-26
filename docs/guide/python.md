# Python 后端

后端是一份独立的 FastAPI 应用，**既能给 Electron 当本地服务，也能脱离 Electron 单独运行**（开发态直接 `python main.py` 起服务，浏览器访问 `/__docs` 可看 OpenAPI）。

## 技术栈

| 依赖 | 版本要求 | 用途 |
| --- | --- | --- |
| `fastapi` | ≥0.110, <1.0 | HTTP 路由与 WS |
| `uvicorn[standard]` | ≥0.27, <1.0 | ASGI 服务器（含 websockets、watchfiles） |
| `websockets` | ≥12.0 | 协议依赖 |
| `pydantic` | ≥2.5, <3.0 | 入参与配置校验 |
| `psutil` | ≥5.9 | 跨平台 PID 存活检测 |
| `pyinstaller` | ≥6.0 | 打成单可执行文件 |

## 进程模型

启动一份 `python main.py --daemon` 后：

```
process: app_python
├── uvicorn (主 asyncio loop)
│   ├── HTTP /health /version
│   ├── HTTP /api/bridge          # 渲染端发起的业务调用
│   ├── WS   /ws/electron         # 与 Electron 主进程的反向通道
│   ├── HTTP /api/electron_bridge # Python 内部主动调 Electron
│   └── HTTP /daemon/*            # 守护进程协作
│
├── DaemonManager                  # pid/port/version 元数据
├── LifecycleManager               # 空闲软退出
├── BridgeApi                      # presenter 注册表
└── WSManager (单例)               # WS 单连接 + 心跳 + 回调
```

## 启动指令

```bash
# 标准启动（不守护，前台）
python main.py --host 127.0.0.1 --port 47821

# 守护模式（Electron 默认走这条）
python main.py --daemon

# 测试用：30 秒后空闲软退出
python main.py --daemon --idle-timeout 30
```

环境变量也可以覆盖：

```bash
APP_BACKEND_HOST=127.0.0.1 APP_BACKEND_PORT=47821 APP_IDLE_TIMEOUT=30 \
  python main.py --daemon
```

## 配置来源

```python
from app.app_config import get_backend
backend = get_backend()      # 读 app.config.json
DEFAULT_PORT = int(backend["defaultPort"])
DEFAULT_HOST = backend["host"]
BINARY_NAME = backend["binaryName"]
```

`app.config.json` 是三端共用的事实源头，完整字段说明见 [应用配置](/guide/config)。

## 内置端点

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/health` | 简单健康检查 |
| GET | `/version` | 返回 `APP_VERSION` |
| POST | `/api/bridge` | presenter 业务分发 |
| GET | `/api/bridge/presenters` | 列出已注册 presenter |
| WS | `/ws/electron` | 与 Electron 主进程的反向通道 |
| GET | `/api/electron/stats` | WS 连接快照 |
| GET | `/api/electron/pending` | 等待中的回调 ID |
| POST | `/api/electron_bridge` | Python 服务端主动调 Electron 的内部入口 |
| POST | `/api/electron_control` | 上面的语义糖（workspace/tab/window 三类操作） |
| POST | `/api/mcp/start` | MCP 占位（NOT_IMPLEMENTED） |
| GET | `/daemon/status` | 守护状态 |
| POST | `/daemon/connect` / `/daemon/disconnect` | 客户端引用计数 |
| POST | `/shutdown_evol` | 强制关闭（清理 meta + SIGTERM） |
| GET | `/__docs` | Swagger UI |

## 章节导航

- [路由与中间件](/guide/python-server) — FastAPI 工厂、CORS、异常处理
- [Bridge API](/guide/python-bridge) — `/api/bridge` 工作机制
- [Presenter 业务层](/guide/presenter) — 编写自己的业务 presenter
- [守护与生命周期](/guide/lifecycle) — DaemonManager + LifecycleManager
