import{_ as s,H as a,f as p,i as e}from"./chunks/framework.Usbf9s97.js";const u=JSON.parse('{"title":"目录结构","description":"","frontmatter":{},"headers":[],"relativePath":"guide/structure.md","filePath":"guide/structure.md","lastUpdated":1779801822000}'),l={name:"guide/structure.md"};function i(t,n,c,o,r,d){return a(),p("div",null,[...n[0]||(n[0]=[e(`<h1 id="目录结构" tabindex="-1">目录结构 <a class="header-anchor" href="#目录结构" aria-label="Permalink to &quot;目录结构&quot;">​</a></h1><p>模板按照 <strong>三端职责分离</strong> 的原则组织，根目录扁平、子目录内聚。</p><h2 id="顶层" tabindex="-1">顶层 <a class="header-anchor" href="#顶层" aria-label="Permalink to &quot;顶层&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>new-template/</span></span>
<span class="line"><span>├── app.config.json                # 跨端共享配置（appId、端口、守护目录名）</span></span>
<span class="line"><span>├── package.json                   # Node 端依赖与脚本入口</span></span>
<span class="line"><span>├── electron.vite.config.mjs       # electron-vite 配置（main/preload/renderer）</span></span>
<span class="line"><span>├── electron-builder.config.js     # 打包配置（多平台）</span></span>
<span class="line"><span>├── eslint.config.mjs              # ESLint 规则</span></span>
<span class="line"><span>├── components.json                # shadcn 组件元数据</span></span>
<span class="line"><span>├── jsconfig.json                  # 路径别名与类型提示</span></span>
<span class="line"><span>├── resources/                     # 图标等静态资源（被打包进 asar）</span></span>
<span class="line"><span>├── build/                         # electron-builder 资源（图标、entitlements）</span></span>
<span class="line"><span>├── scripts/                       # 构建辅助脚本</span></span>
<span class="line"><span>│   ├── build-python.mjs           # 调用 PyInstaller 打 Python 二进制</span></span>
<span class="line"><span>│   └── sync-package-meta.mjs      # 同步 app.config.json 元数据到 package.json</span></span>
<span class="line"><span>├── .build/                        # Vite 与 electron-vite 的自定义构建产物</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>├── electron/                      # === Electron 端 ===</span></span>
<span class="line"><span>├── web/                           # === Vue 渲染端 ===</span></span>
<span class="line"><span>├── python_backend/                # === Python 后端 ===</span></span>
<span class="line"><span>└── gh-pages/                      # === 项目文档（VitePress） ===</span></span></code></pre></div><h2 id="electron-端" tabindex="-1">Electron 端 <a class="header-anchor" href="#electron-端" aria-label="Permalink to &quot;Electron 端&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>electron/</span></span>
<span class="line"><span>├── main/</span></span>
<span class="line"><span>│   ├── index.js                   # 应用入口、bootstrap、生命周期</span></span>
<span class="line"><span>│   ├── logger/                    # 主进程日志</span></span>
<span class="line"><span>│   ├── services/</span></span>
<span class="line"><span>│   │   ├── python-service.js      # Python 进程管理（spawn / 守护客户端）</span></span>
<span class="line"><span>│   │   ├── python-daemon-client.js</span></span>
<span class="line"><span>│   │   └── electron-bridge/       # WebSocket 反向通信 manager</span></span>
<span class="line"><span>│   └── ipc/</span></span>
<span class="line"><span>│       ├── index.js               # 路由装配</span></span>
<span class="line"><span>│       ├── core/                  # 容器、router、中间件</span></span>
<span class="line"><span>│       ├── events/                # 跨模块事件总线</span></span>
<span class="line"><span>│       └── modules/               # 业务 handler（dialog、python、bridge、system）</span></span>
<span class="line"><span>├── preload/</span></span>
<span class="line"><span>│   └── index.js                   # contextBridge 暴露 electron 与 ipc</span></span>
<span class="line"><span>└── shared/</span></span>
<span class="line"><span>    └── config.js                  # 与 web、python 共享的配置读取</span></span></code></pre></div><h2 id="vue-渲染端" tabindex="-1">Vue 渲染端 <a class="header-anchor" href="#vue-渲染端" aria-label="Permalink to &quot;Vue 渲染端&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>web/</span></span>
<span class="line"><span>├── index.html</span></span>
<span class="line"><span>└── src/</span></span>
<span class="line"><span>    ├── main.js                    # 应用挂载</span></span>
<span class="line"><span>    ├── App.vue                    # 根组件（只放 RouterView）</span></span>
<span class="line"><span>    ├── api/                       # 与主进程交互的封装</span></span>
<span class="line"><span>    │   └── ipc/                   # bridge / dialog / python / system</span></span>
<span class="line"><span>    ├── components/                # 组件库</span></span>
<span class="line"><span>    ├── composables/               # 组合式函数</span></span>
<span class="line"><span>    ├── layouts/                   # 页面布局</span></span>
<span class="line"><span>    ├── pages/                     # 业务页（home / settings / app）</span></span>
<span class="line"><span>    ├── router/                    # vue-router 路由表</span></span>
<span class="line"><span>    ├── stores/                    # Pinia store（app、workspace、theme）</span></span>
<span class="line"><span>    ├── services/</span></span>
<span class="line"><span>    │   └── bridge-client.js       # HTTP /api/bridge 客户端</span></span>
<span class="line"><span>    ├── lib/                       # 通用工具</span></span>
<span class="line"><span>    └── assets/                    # 全局样式、字体、Lottie</span></span></code></pre></div><h2 id="python-后端" tabindex="-1">Python 后端 <a class="header-anchor" href="#python-后端" aria-label="Permalink to &quot;Python 后端&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>python_backend/</span></span>
<span class="line"><span>├── main.py                        # 启动入口（支持守护模式）</span></span>
<span class="line"><span>├── requirements.txt</span></span>
<span class="line"><span>├── build.spec / build.bat / build.sh  # PyInstaller 打包</span></span>
<span class="line"><span>└── app/</span></span>
<span class="line"><span>    ├── app_config.py              # 读取 app.config.json</span></span>
<span class="line"><span>    ├── version.py</span></span>
<span class="line"><span>    ├── logger.py</span></span>
<span class="line"><span>    ├── daemon_manager.py          # PID / 端口 / 元数据</span></span>
<span class="line"><span>    ├── lifecycle_manager.py       # 空闲软退出</span></span>
<span class="line"><span>    ├── bridge_api.py              # presenter 注册与分发</span></span>
<span class="line"><span>    ├── presenters/                # 业务 presenter</span></span>
<span class="line"><span>    │   └── echo_presenter.py</span></span>
<span class="line"><span>    ├── server/</span></span>
<span class="line"><span>    │   ├── server.py              # FastAPI 应用工厂</span></span>
<span class="line"><span>    │   └── responses.py           # ok / err 统一响应</span></span>
<span class="line"><span>    ├── electron_bridge/           # WS /ws/electron 反向通道</span></span>
<span class="line"><span>    │   ├── ws_manager.py</span></span>
<span class="line"><span>    │   ├── electron_client.py</span></span>
<span class="line"><span>    │   ├── callback_manager.py</span></span>
<span class="line"><span>    │   └── models.py              # WS 报文模型（Pydantic）</span></span>
<span class="line"><span>    └── electron_api/              # Python 向 Electron 发起的业务封装</span></span>
<span class="line"><span>        └── electron_api.py</span></span></code></pre></div><h2 id="跨端配置-app-config-json" tabindex="-1">跨端配置：app.config.json <a class="header-anchor" href="#跨端配置-app-config-json" aria-label="Permalink to &quot;跨端配置：app.config.json&quot;">​</a></h2><p><code>app.config.json</code> 是三端共享的唯一事实源头，定义应用元数据、后端端口、守护目录等。修改这一份文件即可同步 Electron、Python、electron-builder 与构建脚本。</p><p>完整的字段说明与消费方列表见 <a href="/electron-python-template/guide/config">应用配置</a>。</p>`,13)])])}const g=s(l,[["render",i]]);export{u as __pageData,g as default};
