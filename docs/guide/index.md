# 项目介绍

本项目是一套以 **Electron + Vue 3 + Python（FastAPI）** 为核心的桌面应用脚手架，目标是让开发者在一份代码中同时拥有：

- 跨平台桌面壳（Electron）
- 现代前端开发体验（Vite + Vue 3 + Pinia + Tailwind 4）
- 强大的本地服务能力（Python FastAPI 后端）

## 为什么需要这套模板

传统的 Electron 应用只有 Node.js 与渲染层两端。若业务需要：

- 调用大量已有 Python 生态（数据处理、机器学习、文件解析）
- 需要独立的本地服务进程供其他工具消费
- 想把业务逻辑沉淀在 Python 侧而非 Node 侧

此时简单的 `child_process.spawn` 不足以支撑：进程崩溃恢复、端口冲突、请求超时、双向回调、安装包内嵌打包二进制等，都是难点。本模板把这些都做成默认值。

## 三端组成

| 端 | 技术栈 | 角色 |
| --- | --- | --- |
| **Electron 主进程** | Electron 39 + electron-vite | 桌面壳、子进程管理、IPC 路由、Python 服务监督 |
| **Vue 渲染端** | Vue 3 + Pinia + Vue Router + Tailwind 4 | 用户界面、调用主进程能力与 Python API |
| **Python 后端** | FastAPI + Uvicorn + Pydantic | 业务执行、HTTP / WebSocket 服务、可独立打包 |

每端的代码都按职责清晰分目录，互不耦合：

```
new-template/
├── electron/          # 主进程与 preload
├── web/               # Vue 渲染端
├── python_backend/    # Python FastAPI 服务
├── scripts/           # 构建与同步脚本
└── gh-pages/          # 项目介绍文档（VitePress）
```

## 通信总览

三端通过三条独立的通道协同：

```
渲染层 (Vue)
   │  IPC               HTTP /api/bridge       WebSocket
   ▼                    ▼                       ▲
Electron 主进程 ────────────────→ Python 后端 ──┘
        ◀────────────── WS /ws/electron ───────
```

- **Renderer ↔ Main**：标准 Electron IPC，用于状态查询、连接控制
- **Renderer → Python**：HTTP `/api/bridge`，同步业务调用
- **Python → Renderer**：WebSocket 反向通道，主进程作为代理把指令分发到渲染层

详细分层与超时模型见 [架构总览](/guide/architecture)。

## 默认提供的能力

- 自动启动 / 停止 Python 子进程，崩溃后指数退避重连
- 端口探测：默认 47821 被占用时自动 +1 探测，最多 50 次
- 守护进程模式：二次启动复用驻留进程，元数据写到用户目录
- DI 容器与 IPC 中间件管道（错误边界、日志、计时、指标、参数校验）
- WebSocket 反向通信与回调管理
- electron-builder + PyInstaller 一键打包 Win / Mac / Linux
- VitePress 项目文档（即本站）

## 接下来

- 想跑起来：[快速开始](/guide/quick-start)
- 想了解每端：[主进程入口](/guide/main-process) · [Web 目录结构](/guide/web-structure) · [路由与中间件](/guide/python-server)
- 想看怎么开发与发布：[开发流程](/guide/development) · [打包发布](/guide/build)
