# 开发环境

本文档帮助新成员从零搭建开发环境，到能成功跑通 `npm run dev` 看到 Demo 页面。

---

## 1. 系统要求

| 项 | 最低 | 推荐 |
|---|---|---|
| 操作系统 | Windows 10 / macOS 11 / Ubuntu 20.04 | 同左 |
| Node.js | 18.x | 22.x LTS |
| Python | 3.10 | 3.12 / 3.13 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 2 GB | 4 GB |
| 网络 | 能访问 npm + PyPI | 国内推荐用镜像 |

---

## 2. 必装软件

### 2.1 Node.js

**Windows**（PowerShell 管理员）：
```
winget install OpenJS.NodeJS.LTS
```

**macOS**：
```
brew install node
```

**Linux**（Ubuntu/Debian）：
```
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

验证：
```
node -v    # 应 ≥ v18
npm -v     # 应 ≥ 9
```

### 2.2 Python

**Windows**：
```
winget install Python.Python.3.12
```

**macOS**：
```
brew install python@3.12
```

**Linux**（Ubuntu/Debian）：
```
sudo apt install -y python3.12 python3.12-venv
```

验证：
```
python --version    # Windows 也是 python；应 ≥ 3.10
# 或：
python3 --version   # Unix
```

如果命令找不到，确认安装时勾选了"Add to PATH"，或者用 `py --version`（Windows Python Launcher）。

---

## 3. 项目初始化

### 3.1 拉取代码

```
cd <你的工作目录>
# 假设仓库已存在；如果是从零创建：
# git clone <repo-url>
cd new-template
```

### 3.2 安装 Node 依赖

```
npm install
```

这一步会做：
1. 下载 `package.json` 中的依赖到 `node_modules/`
2. 触发 `postinstall` 钩子 → `electron-builder install-app-deps`，为当前平台重建原生模块（如 `bufferutil`/`utf-8-validate`，`ws` 的可选 native 加速）
3. 下载 Electron 二进制（首次 ~80 MB；从 npmmirror 镜像走，配置在 `.npmrc`）

如果网络慢：
```
npm config set registry https://registry.npmmirror.com
```

### 3.3 创建 Python 虚拟环境

```
cd python_backend
python -m venv venv
```

激活与安装依赖（**激活只在手动调试时需要**；`npm run dev` 与 `npm run build:python` 都会自动识别 venv 无需手动激活）：

**Windows**：
```
./venv/Scripts/python.exe -m pip install -r requirements.txt
```

**macOS / Linux**：
```
./venv/bin/python -m pip install -r requirements.txt
```

国内推荐加 `-i https://pypi.tuna.tsinghua.edu.cn/simple` 加速。

`requirements.txt` 内容：
- `fastapi` — HTTP 框架
- `uvicorn[standard]` — ASGI 服务器（含 websockets 支持）
- `websockets` — WS 实现
- `pydantic` — 数据校验
- `psutil` — 跨平台 PID 存活检测
- `pyinstaller` — 打包（仅 build 时用）

### 3.4 不使用 venv 的备选方案

如果你不想用 venv，可以直接用系统 Python 装依赖：
```
python -m pip install -r python_backend/requirements.txt
```

`scripts/build-python.mjs` 与 `src/main/services/python-service.js` 都会优先找 `python_backend/venv/`，找不到回退到系统 `python` / `py` / `python3`。

不过推荐保留 venv，避免污染全局环境。

---

## 4. 启动开发模式

### 4.1 命令

```
cd new-template
npm run dev
```

### 4.2 这条命令做了什么

```
npm run dev
  │
  └─ electron-vite dev
       │
       ├─ 启动 vite dev server (renderer)
       │     监听 http://localhost:5173
       │     支持 HMR（修改 Vue 文件实时刷新）
       │
       ├─ 构建 main 进程（src/main/index.js → out/main/index.js）
       │
       ├─ 构建 preload 进程（src/preload/index.js → out/preload/index.js）
       │
       └─ 启动 Electron，加载 out/main/index.js
              │
              ├─ 主进程入口 src/main/index.js
              │   ├─ Logger.getInstance() 初始化日志（写到 %LOCALAPPDATA%/app_electron/logs/main.log）
              │   ├─ new PythonService() — 准备 Python 服务管理器
              │   ├─ session.onHeadersReceived — 移除所有 CSP 响应头
              │   │
              │   ├─ await pythonService.start()
              │   │   ├─ daemonClient.isDaemonRunning()  ← 检查驻留进程
              │   │   │     ├─ 命中：reused=true，~1 s 完成
              │   │   │     │
              │   │   │     └─ 未命中：spawn venv/Scripts/python.exe main.py --daemon
              │   │   │           ├─ FastAPI 启动监听 127.0.0.1:47821
              │   │   │           ├─ 写 daemon.pid/version/port 到 %LOCALAPPDATA%/app_electron/
              │   │   │           └─ 主进程轮询 /health 直到就绪
              │   │   │
              │   │   ├─ 启动健康检查（30 s 周期）
              │   │   └─ 启动守护心跳（120 s 周期）
              │   │
              │   ├─ bridge = getBridgeManager(backendUrl)
              │   │   ├─ 注册 11 个 builtin handler（show_notification 等）
              │   │   └─ bridge.connect() → 建立 WebSocket
              │   │         ├─ 发 hello / 收 hello_ack
              │   │         └─ 启动 10 s 心跳
              │   │
              │   ├─ registerAllIpcHandlers({ pythonService })
              │   │   └─ 注册 bridge:* 与 python:* 共 9 个 IPC channel
              │   │
              │   └─ createWindow() → 加载 http://localhost:5173 (dev) 或 file://out/renderer/index.html (prod)
              │
              └─ 渲染进程加载 App.vue
                   ├─ window.api.python.onReady → 订阅就绪事件
                   ├─ window.api.bridge.ensureConnection() → 确认 WS 已连
                   └─ 显示 Demo UI
```

### 4.3 启动后应该看到

DevTools Console 与终端日志：
```
2026-05-17 ... [INFO] [main] === Electron starting ===
2026-05-17 ... [INFO] [PythonService] spawn .../venv/Scripts/python.exe ...
2026-05-17 ... [INFO] === 开始启动Python服务 ===
2026-05-17 ... [INFO] [DaemonClient] 复用驻留进程 pid=xxx port=47821
2026-05-17 ... [INFO] [main] python ready → broadcast python-ready
2026-05-17 ... [INFO] [ws] connecting ws://127.0.0.1:47821/ws/electron
2026-05-17 ... [INFO] [ws] open
2026-05-17 ... [INFO] [BridgeManager] connected
2026-05-17 ... [INFO] [ws] hello_ack received
```

应用窗口顶部右侧应显示 "All Systems Ready"（绿点），三个状态卡都为 Ready / Connected / `http://127.0.0.1:47821`。

### 4.4 验证调用回路

1. 在输入框输入 `hello world` → 点 "Call echo"
2. 输出卡应显示 `SUCCESS` tag + `echoPresenter.echo` + 耗时（~10 ms）+ 内容 `hello world`
3. 点 "Call missing presenter" → 应显示 `ERROR [NOT_FOUND] presenter 'missing' not found`

这两个回路分别验证：
- 正常路径：HTTP → presenter dispatch → 响应
- 错误路径：404 → BridgeApiError 类型转换

---

## 5. 关键目录速览

```
new-template/
├── package.json                  ← 依赖 + 脚本
├── electron.vite.config.mjs      ← 三个 entry 的构建配置
├── electron-builder.yml          ← 安装包配置
├── README.md
├── docs/                         ← 本文档所在
│   ├── communication.md          ← 通信架构详解
│   ├── build.md                  ← 打包流程详解
│   └── development.md            ← 你正在看的这份
│
├── scripts/
│   └── build-python.mjs          ← 跨平台 PyInstaller 启动器
│
├── src/                          ← Electron 端源码
│   ├── main/                     ← 主进程
│   │   ├── index.js              ← 入口
│   │   ├── logger/               ← 日志
│   │   ├── services/             ← PythonService / DaemonClient / BridgeManager
│   │   └── ipc/                  ← IPC handler
│   ├── preload/index.js          ← 白名单 contextBridge
│   └── renderer/                 ← Vue 3 渲染层
│       ├── index.html
│       └── src/
│           ├── App.vue
│           ├── main.js
│           ├── services/bridge-client.js
│           └── assets/
│
└── python_backend/               ← Python 后端
    ├── main.py                   ← uvicorn 启动入口
    ├── requirements.txt
    ├── build.spec                ← PyInstaller 配置
    ├── venv/                     ← 虚拟环境（git 忽略）
    └── app/
        ├── server/server.py      ← FastAPI 路由
        ├── bridge_api.py         ← presenter 调度
        ├── daemon_manager.py     ← 守护进程
        ├── lifecycle_manager.py
        ├── electron_bridge/      ← WS 反向通信
        ├── electron_api/         ← 业务封装
        └── presenters/           ← 业务 presenter（echoPresenter 示例）
```

---

## 6. 日常开发工作流

### 6.1 添加一个 Python presenter

1. 在 `python_backend/app/presenters/` 新建 `my_presenter.py`：
   ```python
   class MyPresenter:
       async def hello(self, name: str) -> str:
           return f'hello {name}'
   ```

2. 在 `python_backend/app/presenters/__init__.py` 导出：
   ```python
   from .my_presenter import MyPresenter
   __all__ = ['EchoPresenter', 'MyPresenter']
   ```

3. 在 `python_backend/app/bridge_api.py` 的 `_register_builtins` 中注册：
   ```python
   self.register('myPresenter', MyPresenter())
   ```

4. 重启后端（任务管理器结束 `python.exe` 让 Electron 自动重启，或 IPC 调 `python:restart`）

5. 渲染层调用：
   ```js
   await pythonBridgeClient.call('myPresenter', 'hello', ['world'])
   ```

### 6.2 添加一个 Electron 端 action

让 Python 端能 `await electron_api.my_action(...)`。

1. 在 `src/main/services/electron-bridge/builtin-handlers.js` 或主进程任意位置：
   ```js
   bridge.register('my_action', async (params) => {
     // 做些事情
     return { ok: true }
   })
   ```

2. Python 端：
   ```python
   from app.electron_bridge.electron_client import electron_client
   result = await electron_client.call('my_action', {'foo': 'bar'})
   ```

如果希望封装得更优雅，往 `python_backend/app/electron_api/electron_api.py` 加方法：
   ```python
   async def my_action(self, foo: str):
       return await electron_client.call('my_action', {'foo': foo})
   ```

### 6.3 添加一个 IPC channel

1. `src/main/ipc/handlers/python-service-handlers.js`（或新建 handler 文件）：
   ```js
   ipcMain.handle('python:my-method', async () => { ... })
   ```

2. `src/preload/index.js` 的 `INVOKE_ALLOWED` 加 `python:my-method`，`api.python` 暴露：
   ```js
   myMethod: () => invoke('python:my-method')
   ```

3. 渲染层：
   ```js
   await window.api.python.myMethod()
   ```

---

## 7. 日志位置

| 进程 | 文件 |
|---|---|
| Electron 主进程 | `%LOCALAPPDATA%\app_electron\logs\main.log`（Win）<br>`~/.app_electron/logs/main.log`（Unix） |
| Python 后端 | `%LOCALAPPDATA%\app_electron\logs\python_backend.log` |
| Electron 渲染进程 | DevTools Console（F12） |

实时查看（PowerShell）：
```
Get-Content -Wait $env:LOCALAPPDATA\app_electron\logs\main.log
Get-Content -Wait $env:LOCALAPPDATA\app_electron\logs\python_backend.log
```

实时查看（Unix）：
```
tail -f ~/.app_electron/logs/main.log
tail -f ~/.app_electron/logs/python_backend.log
```

---

## 8. 常见问题

| 现象 | 原因 | 解决 |
|---|---|---|
| `npm install` 卡在 electron 下载 | 国内访问 GitHub 慢 | 已在 `.npmrc` 配置 npmmirror，若仍慢可手动设置 `ELECTRON_MIRROR` 环境变量 |
| `pnpm-lock` vs `package-lock` 冲突 | 项目使用 npm | 删除 `pnpm-lock.yaml`（如有），用 `npm install` |
| `pyinstaller not recognized` | 全局 PATH 没装 | 用 `npm run build:python`，脚本会找 venv |
| 启动后 "Python: Starting" 不变绿 | 端口 47821 被占 | 看 main.log 是否有"端口 47821 占用，回退到 47822"日志；或先 `netstat -ano \| findstr :47821` 找占用进程 |
| WS 频繁断连重连 | 守护进程异常退出 | 看 `python_backend.log` 中 SIGTERM/SIGKILL 触发原因 |
| 改 Vue 不生效 | vite HMR 未启动 | 确认终端有 "vite ... ready in xx ms" 日志 |
| 改 main/preload 后没反应 | main/preload 不支持 HMR | 需要重启 `npm run dev`（Electron 主进程必须重启） |
| 端口残留：上次关闭后下次启动报错 | shutdown 不完整 | 已实现多重清理；如仍残留：`taskkill /F /IM python.exe` 或重启电脑 |

---

## 9. IDE 推荐

### VS Code

推荐扩展：

| 扩展 | 用途 |
|---|---|
| Vue.volar | Vue 3 语言服务 |
| ESLint | JS/Vue lint |
| Prettier | 格式化 |
| Python | Python 语言服务（Pylance） |
| Black Formatter | Python 格式化 |
| Ruff | Python lint |

工作区设置（`.vscode/settings.json` 可选）：
```json
{
  "python.defaultInterpreterPath": "python_backend/venv/Scripts/python.exe",
  "editor.formatOnSave": true,
  "[python]": { "editor.defaultFormatter": "ms-python.black-formatter" },
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[vue]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

打开项目时 VS Code 应自动识别 `python_backend/venv/` 作为 Python 解释器。

### PyCharm + WebStorm

可分别打开 `python_backend/`（PyCharm）与项目根（WebStorm）。

---

## 10. 接下来读什么

- [`communication.md`](./communication.md) — 通信架构详解（三通道、关键模块、调用链）
- [`build.md`](./build.md) — 打包流程（PyInstaller、electron-vite、electron-builder）
- 顶层 `README.md` — 概述与一句话上手
- `todo/index.md`（如存在）— 移植任务列表（保留作为代码起源说明）
