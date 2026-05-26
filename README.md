# momo_py

Electron + Vue 3 + Python (FastAPI) 通信脚手架。

## 通信架构

三通道复合：

```
渲染层 (Vue)
  │  HTTP fetch          IPC                 WebSocket
  ▼ /api/bridge          window.api          (内部)
Python ◀──────── 主进程 ◀──────── 渲染层
        ws://         ipcMain/Renderer
```

| 通道 | 方向 | 用途 |
|---|---|---|
| Renderer ↔ Main | IPC | 状态查询、连接控制、事件订阅 |
| Renderer → Python | HTTP `/api/bridge` | 同步业务调用 |
| Python → Renderer | WS `/ws/electron` → 主进程 BridgeManager | 系统通知、读文件、窗口操作 |

详细设计见 `../todo/index.md` 与 `../electron_python_bridge_report.html`。

## 开发环境

### 1. 安装 Node 依赖

```bash
npm install
```

### 2. 准备 Python 虚拟环境

```bash
cd python_backend
python -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# 或：source venv/bin/activate && pip install -r requirements.txt
```

### 3. 启动开发模式

```bash
npm run dev
```

主进程会自动 spawn 后端：
- 开发态：`venv/Scripts/python.exe python_backend/main.py --daemon`
- 生产态：`resourcesPath/app_python.exe --daemon`

启动后窗口打开 Demo 页：
- 输入文本 → 点「调用 echoPresenter.echo」 → 应得 echo 回显
- 点「调用不存在的 presenter」 → 应得 `[NOT_FOUND] presenter 'missing' not found`

## 打包

```bash
npm run build:win    # Windows NSIS 安装包
npm run build:mac    # macOS dmg
npm run build:linux  # AppImage/snap/deb
```

`build:*` 会先跑 `build:python`（PyInstaller 打 app_python.exe / app_darwin / app_linux）。
产物：`dist/momo_py-0.1.1-setup.exe`。

## 守护进程

- 元数据目录（决议）：
  - Windows: `%LOCALAPPDATA%\app_electron\`
  - Unix:   `~/.app_electron/`
- 三个文件：`daemon.pid` / `daemon.version` / `daemon.port`
- 默认端口 47821，被占用时按 47822→ 探测
- 二次启动 Electron 时复用驻留进程，启动时间从 ~5 s 降到 ~1 s

## 常见问题

- **端口占用**：删除 `%LOCALAPPDATA%\app_electron\daemon.port` 或 `taskkill /PID <pid> /F`
- **daemon 残留**：进程被强 kill 时元数据可能残留，下次启动会自动识别为僵尸 PID 并清理
- **WS 重连**：拔网 / kill Python 后主进程会按 1/2/4/8/15s 指数退避重连
- **杀毒误报**：PyInstaller 单文件 exe 容易被识别为可疑；签名或改用目录形式可缓解

## 目录结构

```
new-template/
├── python_backend/
│   ├── main.py              # FastAPI 启动入口
│   ├── build.spec           # PyInstaller 配置
│   ├── requirements.txt
│   └── app/
│       ├── bridge_api.py    # /api/bridge 动态 presenter 调度
│       ├── daemon_manager.py
│       ├── lifecycle_manager.py
│       ├── logger.py
│       ├── presenters/      # 业务 presenter（echoPresenter 示例）
│       ├── server/          # FastAPI 路由
│       ├── electron_bridge/ # WS 反向通信
│       └── electron_api/    # Python→Electron 业务封装
├── electron/
│   ├── main/
│   │   ├── index.js
│   │   ├── logger/
│   │   ├── services/
│   │   │   ├── python-service.js
│   │   │   ├── python-daemon-client.js
│   │   │   └── electron-bridge/
│   │   └── ipc/             # IPC 模块化架构
│   │       ├── core/        # 路由、中间件、容器
│   │       ├── events/      # 事件总线
│   │       └── modules/     # bridge / dialog / python / system
│   ├── preload/index.js
│   └── shared/config.js
├── web/
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── api/ipc/         # IPC API 封装
│       ├── components/      # UI 组件（shadcn-vue 风格）
│       ├── layouts/         # 布局组件
│       ├── pages/           # home / app / settings
│       ├── router/
│       ├── services/        # bridge-client
│       └── stores/          # Pinia 状态管理
├── scripts/                 # 构建脚本
├── resources/               # 应用资源
├── build/                   # 打包图标与签名
└── electron-builder.config.js
```

## IDE 推荐

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
