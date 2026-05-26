# 目录结构

模板按照 **三端职责分离** 的原则组织，根目录扁平、子目录内聚。

## 顶层

```
new-template/
├── app.config.json                # 跨端共享配置（appId、端口、守护目录名）
├── package.json                   # Node 端依赖与脚本入口
├── electron.vite.config.mjs       # electron-vite 配置（main/preload/renderer）
├── electron-builder.config.js     # 打包配置（多平台）
├── eslint.config.mjs              # ESLint 规则
├── components.json                # shadcn 组件元数据
├── jsconfig.json                  # 路径别名与类型提示
├── resources/                     # 图标等静态资源（被打包进 asar）
├── build/                         # electron-builder 资源（图标、entitlements）
├── scripts/                       # 构建辅助脚本
│   ├── build-python.mjs           # 调用 PyInstaller 打 Python 二进制
│   └── sync-package-meta.mjs      # 同步 app.config.json 元数据到 package.json
├── .build/                        # Vite 与 electron-vite 的自定义构建产物
│
├── electron/                      # === Electron 端 ===
├── web/                           # === Vue 渲染端 ===
├── python_backend/                # === Python 后端 ===
└── gh-pages/                      # === 项目文档（VitePress） ===
```

## Electron 端

```
electron/
├── main/
│   ├── index.js                   # 应用入口、bootstrap、生命周期
│   ├── logger/                    # 主进程日志
│   ├── services/
│   │   ├── python-service.js      # Python 进程管理（spawn / 守护客户端）
│   │   ├── python-daemon-client.js
│   │   └── electron-bridge/       # WebSocket 反向通信 manager
│   └── ipc/
│       ├── index.js               # 路由装配
│       ├── core/                  # 容器、router、中间件
│       ├── events/                # 跨模块事件总线
│       └── modules/               # 业务 handler（dialog、python、bridge、system）
├── preload/
│   └── index.js                   # contextBridge 暴露 electron 与 ipc
└── shared/
    └── config.js                  # 与 web、python 共享的配置读取
```

## Vue 渲染端

```
web/
├── index.html
└── src/
    ├── main.js                    # 应用挂载
    ├── App.vue                    # 根组件（只放 RouterView）
    ├── api/                       # 与主进程交互的封装
    │   └── ipc/                   # bridge / dialog / python / system
    ├── components/                # 组件库
    ├── composables/               # 组合式函数
    ├── layouts/                   # 页面布局
    ├── pages/                     # 业务页（home / settings / app）
    ├── router/                    # vue-router 路由表
    ├── stores/                    # Pinia store（app、workspace、theme）
    ├── services/
    │   └── bridge-client.js       # HTTP /api/bridge 客户端
    ├── lib/                       # 通用工具
    └── assets/                    # 全局样式、字体、Lottie
```

## Python 后端

```
python_backend/
├── main.py                        # 启动入口（支持守护模式）
├── requirements.txt
├── build.spec / build.bat / build.sh  # PyInstaller 打包
└── app/
    ├── app_config.py              # 读取 app.config.json
    ├── version.py
    ├── logger.py
    ├── daemon_manager.py          # PID / 端口 / 元数据
    ├── lifecycle_manager.py       # 空闲软退出
    ├── bridge_api.py              # presenter 注册与分发
    ├── presenters/                # 业务 presenter
    │   └── echo_presenter.py
    ├── server/
    │   ├── server.py              # FastAPI 应用工厂
    │   └── responses.py           # ok / err 统一响应
    ├── electron_bridge/           # WS /ws/electron 反向通道
    │   ├── ws_manager.py
    │   ├── electron_client.py
    │   ├── callback_manager.py
    │   └── models.py              # WS 报文模型（Pydantic）
    └── electron_api/              # Python 向 Electron 发起的业务封装
        └── electron_api.py
```

## 跨端配置：app.config.json

`app.config.json` 是三端共享的唯一事实源头，定义应用元数据、后端端口、守护目录等。修改这一份文件即可同步 Electron、Python、electron-builder 与构建脚本。

完整的字段说明与消费方列表见 [应用配置](/guide/config)。
