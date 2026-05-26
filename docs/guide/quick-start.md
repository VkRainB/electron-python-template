# 快速开始

## 环境要求

| 依赖 | 推荐版本 | 说明 |
| --- | --- | --- |
| Node.js | 20 LTS 或更高 | 已通过 npm 9+ 验证 |
| Python | 3.10 – 3.12 | 后端依赖 FastAPI + Uvicorn |
| Git | 任意 | 拉取源码 |
| 操作系统 | Windows 10+ / macOS 12+ / Ubuntu 20.04+ | 三端均支持 |

::: tip 提示
Windows 用户建议把 Node、Python 路径都加进 PATH，避免后续 `npm run dev` 时找不到解释器。
:::

## 第一步：克隆与安装

```bash
git clone <your-repo-url> new-template
cd new-template
npm install
```

`postinstall` 钩子会自动执行 `electron-builder install-app-deps`，把原生模块编译到当前 Electron 的 ABI。

## 第二步：准备 Python 虚拟环境

```bash
cd python_backend
python -m venv venv

# Windows
./venv/Scripts/python.exe -m pip install -r requirements.txt

# macOS / Linux
source venv/bin/activate
pip install -r requirements.txt
```

依赖清单非常精简：

```
fastapi>=0.110.0,<1.0.0
uvicorn[standard]>=0.27.0,<1.0.0
websockets>=12.0
pydantic>=2.5.0,<3.0.0
psutil>=5.9.0
pyinstaller>=6.0.0
```

## 第三步：启动开发模式

回到项目根目录：

```bash
npm run dev
```

`electron-vite dev` 会同时：

1. 启动 Vite Dev Server 编译渲染端
2. 编译主进程与 preload 脚本
3. 拉起 Electron 主进程
4. 主进程内部 spawn Python 子进程：`venv/Scripts/python.exe python_backend/main.py --daemon`

启动完成后，窗口会展示一个 Demo 页：

- 输入一段文字，点击「调用 echoPresenter.echo」按钮，应得到 echo 回显
- 点击「调用不存在的 presenter」按钮，应得到 `[NOT_FOUND] presenter 'missing' not found`

这意味着三端通路已经打通：**渲染层 → 主进程 → Python → 主进程 → 渲染层**。

## 第四步：探索代码

打开下列文件可以对每端有个入门印象：

| 文件 | 作用 |
| --- | --- |
| `electron/main/index.js` | Electron 主进程入口，bootstrap 流程 |
| `electron/main/ipc/index.js` | IPC 路由与中间件装配 |
| `web/src/main.js` | Vue 应用挂载 |
| `web/src/services/bridge-client.js` | 渲染端 HTTP 调用客户端 |
| `python_backend/main.py` | Python 启动入口与守护模式 |
| `python_backend/app/server/server.py` | FastAPI 应用工厂 |
| `python_backend/app/bridge_api.py` | Bridge 动态分发到 presenter |

## 常用脚本一览

```bash
npm run dev          # 启动开发模式
npm run lint         # ESLint 检查
npm run format       # Prettier 全量格式化
npm run build        # 编译三端代码（不打包安装包）
npm run build:win    # 打 Windows 安装包
npm run build:mac    # 打 macOS dmg
npm run build:linux  # 打 Linux AppImage/snap/deb
```

完整流程见 [开发流程](/guide/development) 与 [打包发布](/guide/build)。
