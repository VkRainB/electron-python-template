# 打包构建

本文档说明从源码到可分发安装包的完整构建流程。涉及三个工具链：electron-vite（前端）、PyInstaller（Python 后端）、electron-builder（最终打包分发）。

---

## 1. 构建工具栈

| 阶段 | 工具 | 产物 |
|---|---|---|
| Python 后端打包 | PyInstaller | `python_backend/dist/app_python.exe`（Windows 单文件） |
| Electron 前端构建 | electron-vite | `out/main/`、`out/preload/`、`out/renderer/` |
| Electron 应用分发 | electron-builder | `dist/electron_py-0.1.0-setup.exe`（NSIS 安装包） |

三个阶段必须按顺序执行：先 Python → 再 Electron 前端 → 最后整体打包。`npm run build:win` 已经把三步串好。

---

## 2. 开发态 vs 生产态对比

| 维度 | 开发态（`npm run dev`） | 生产态（已安装的应用） |
|---|---|---|
| 渲染层加载 | `http://localhost:5173`（vite dev server） | `file://.../out/renderer/index.html` |
| 主进程代码 | `out/main/index.js`（electron-vite 实时构建） | 同左（打入 `app.asar`） |
| Python 解释器 | `python_backend/venv/Scripts/python.exe` | 无（已嵌入打包后的 exe） |
| Python 业务代码 | `python_backend/main.py` | 全部嵌入 `app_python.exe` |
| Python 启动命令 | `venv/python.exe main.py --daemon` | `<resources>/app_python.exe --daemon` |
| 日志目录 | `%LOCALAPPDATA%/app_electron/logs/` | 同左 |
| 守护进程目录 | `%LOCALAPPDATA%/app_electron/` | 同左 |

路径解析逻辑见 `src/main/services/python-service.js:_resolveExecutable()`，通过 `app.isPackaged` 区分两种模式。

---

## 3. Python 后端打包（PyInstaller）

### 3.1 跨平台启动脚本

入口是 `scripts/build-python.mjs`，由 `npm run build:python` 调用。它做三件事：

1. **探测 Python**：优先 `python_backend/venv/Scripts/python.exe`，回退到系统 `python` / `py` / `python3`
2. **检查 PyInstaller**：用 `python -c "import PyInstaller"` 验证是否安装；未装则给出明确 `pip install` 提示
3. **执行打包**：`python -m PyInstaller --noconfirm --clean build.spec`（用 `-m` 形式不依赖 `pyinstaller.exe` 在 PATH）

这样既支持 venv 隔离，也支持纯系统 Python，二选一即可。

### 3.2 spec 文件解析

`python_backend/build.spec`：

```python
hidden_imports  = collect_submodules('uvicorn') \
                + collect_submodules('websockets') \
                + collect_submodules('fastapi') \
                + collect_submodules('pydantic')

a = Analysis(
    ['main.py'],
    excludes=['tkinter', 'unittest', 'PIL', 'numpy', 'scipy', 'pandas'],
    ...
)

exe = EXE(..., name='app_python', console=True, onefile=True)
```

关键设置：

| 字段 | 值 | 原因 |
|---|---|---|
| `hidden_imports` | uvicorn/websockets/fastapi/pydantic 全子模块 | 这些库动态 import 子模块，PyInstaller 静态分析抓不到 |
| `excludes` | tkinter/PIL/numpy/scipy/pandas | 模板不需要这些库，排除可减约 80 MB |
| `console=True` | 保留控制台 | 守护模式下用 detached spawn，控制台不可见但 stderr 仍可被 logger 读 |
| `onefile=True` | Windows 推荐 | 单文件分发简单；mac/linux 推荐 `onefile=False` 启动更快 |
| `upx=False` | 不压缩 | 避免某些杀软误报；如需可手动启用 |

实测产物：`app_python.exe` 约 16 MB。

### 3.3 macOS / Linux 调整

模板默认 spec 是 Windows 单文件。其它平台需要：
- 改 `onefile=False`（输出为目录形式，启动快 1~3 s）
- electron-builder 的 `mac.extraResources` / `linux.extraResources` 已按目录形式配置

---

## 4. Electron 前端构建（electron-vite）

### 4.1 三个 entry

```
electron-vite build
  ├─ main:     src/main/index.js      → out/main/index.js
  ├─ preload:  src/preload/index.js   → out/preload/index.js
  └─ renderer: src/renderer/index.html → out/renderer/...
```

每个 entry 用 Vite 独立构建，配置见 `electron.vite.config.mjs`。

### 4.2 externalizeDepsPlugin

主进程与 preload 不打包 `node_modules` 的依赖，而是直接 `require()` 运行时加载：

```js
export default defineConfig({
  main:    { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] }
})
```

这样的好处：
- `ws` 等含 native 模块（`bufferutil`/`utf-8-validate`）的依赖不被错误打包
- `electron-builder install-app-deps` 能正确处理这些原生模块
- 启动时通过 Node `require` 机制查 `resources/app.asar/node_modules/`

代价：最终安装包要带 `node_modules` 子集（仅 `dependencies`，不含 `devDependencies`）。

### 4.3 渲染层

渲染层是普通 Vue 3 SPA，构建产物完全静态（HTML + JS + CSS + assets），与浏览器项目无异。Vite 会自动做代码分割、tree-shaking、压缩。

---

## 5. 最终打包（electron-builder）

### 5.1 配置文件 `electron-builder.yml`

核心字段：

```yaml
appId: com.electron.app
productName: electron_py
files:
  - '!python_backend/**'        # Python 源码不进 app.asar，由 extraResources 接管
  - '!venv/**'
asarUnpack:
  - resources/**

win:
  executableName: electron_py
  extraResources:
    - from: 'python_backend/dist/app_python.exe'
      to: 'app_python.exe'

mac:
  extraResources:
    - from: 'python_backend/dist/app_darwin/'
      to: 'python_build/app_darwin/'

linux:
  extraResources:
    - from: 'python_backend/dist/app_linux/'
      to: 'python_build/app_linux/'
  target: [AppImage, snap, deb]

nsis:
  artifactName: ${name}-${version}-setup.${ext}
  createDesktopShortcut: always

electronDownload:
  mirror: https://npmmirror.com/mirrors/electron/   # 国内镜像加速
```

### 5.2 extraResources 与路径解析

打包后目录（Windows）：

```
electron_py/
├── electron_py.exe                       ← Electron 可执行
├── resources/
│   ├── app.asar                          ← 主进程 + preload + renderer + node_modules
│   ├── app_python.exe                    ← PyInstaller 产物（来自 extraResources）
│   └── icon.png
├── ...electron 运行时...
```

主进程通过 `process.resourcesPath` 拿到 `resources/` 路径，再拼 `app_python.exe`：

```js
// src/main/services/python-service.js
if (isPackaged) {
  if (process.platform === 'win32') {
    return { command: path.join(res, 'app_python.exe'), args: [], cwd: res }
  }
  // mac/linux: path.join(res, 'python_build', 'app_darwin', 'app_darwin')
}
```

### 5.3 ASAR

默认主进程、preload、renderer 都打入 `app.asar`（一个紧凑的归档文件）。但 `resources/**` 通过 `asarUnpack` 解包，因为：
- PyInstaller 产物可能需要写临时文件
- 杀毒软件扫描 asar 内部 exe 时可能挂

---

## 6. npm 脚本

| 脚本 | 等价命令 | 用途 |
|---|---|---|
| `dev` | `electron-vite dev` | 启动 dev 模式（HMR + Electron 窗口） |
| `start` | `electron-vite preview` | 跑构建产物（不打包） |
| `build` | `electron-vite build` | 仅构建前端（main/preload/renderer） |
| `build:python` | `node scripts/build-python.mjs` | 仅打包 Python |
| `build:win` | `build:python` → `build` → `electron-builder --win` | 完整 Windows 分发 |
| `build:mac` | 同上 `--mac` | macOS dmg |
| `build:linux` | 同上 `--linux` | AppImage/snap/deb |
| `build:unpack` | `build` → `electron-builder --dir` | 只生成解包目录（调试用） |
| `postinstall` | `electron-builder install-app-deps` | npm install 后自动重建原生模块 |

---

## 7. 完整构建时序

```
$ npm run build:win
  │
  ├─ npm run build:python
  │    │
  │    └─ node scripts/build-python.mjs
  │         ├─ 探测 venv 或系统 Python
  │         ├─ 验证 PyInstaller 已装
  │         └─ python -m PyInstaller --noconfirm --clean build.spec
  │              ├─ 分析 main.py + 依赖
  │              ├─ 嵌入 Python 解释器
  │              ├─ 嵌入所有依赖到 PKG
  │              └─ 输出 python_backend/dist/app_python.exe  (~16 MB)
  │
  ├─ npm run build
  │    │
  │    └─ electron-vite build
  │         ├─ vite build (main)     → out/main/index.js
  │         ├─ vite build (preload)  → out/preload/index.js
  │         └─ vite build (renderer) → out/renderer/{index.html, assets/...}
  │
  └─ electron-builder --win
       ├─ 下载 Electron 运行时（首次；后续走缓存）
       ├─ 收集 files 字段 → 打包为 app.asar
       ├─ 复制 extraResources → resources/app_python.exe
       ├─ 调用 NSIS 生成安装包
       └─ 输出 dist/electron_py-0.1.0-setup.exe
```

---

## 8. 产物结构

```
new-template/
├── python_backend/dist/app_python.exe          ← PyInstaller 输出
├── out/
│   ├── main/index.js                           ← Electron 前端构建
│   ├── preload/index.js
│   └── renderer/{index.html, assets/...}
└── dist/                                        ← electron-builder 输出
    ├── electron_py-0.1.0-setup.exe             ← NSIS 安装包（用户拿到的）
    ├── win-unpacked/                            ← 解包目录（可直接运行）
    │   ├── electron_py.exe
    │   └── resources/
    │       ├── app.asar
    │       └── app_python.exe
    └── builder-effective-config.yaml            ← 实际生效的配置
```

---

## 9. 体积优化

| 项 | 默认 | 优化后 | 操作 |
|---|---|---|---|
| `app_python.exe` | ~16 MB | ~12 MB | PyInstaller `excludes` 已排除 tkinter/PIL 等 |
| `app.asar`（含 node_modules） | ~70 MB | ~60 MB | 删除未用依赖 |
| Electron 运行时 | ~120 MB | 无法降低 | Electron 本身体积固定 |
| NSIS 安装包 | ~80 MB | ~70 MB | UPX 压缩 |
| **总安装大小** | **~250 MB** | **~220 MB** | — |

进一步压缩可考虑：
- `app_python` 改 `onefile=False`（启动更快但文件多）
- 自定义 Electron 构建剥离 `Materials/`、`locales/` 多余资源
- 用 `process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL=9`

---

## 10. 跨平台注意事项

### Windows

- 杀毒软件可能误报 PyInstaller 单文件 exe；可通过签名或改 `onefile=False` 缓解
- 路径含中文/空格时 `spawn` 已加 `windowsHide: true`，但路径解析仍需谨慎

### macOS

- 必须 `entitlementsInherit: build/entitlements.mac.plist`
- 公证（notarize）默认关闭；正式发布需 Apple Developer 账号
- PyInstaller 建议 `onefile=False`（mac 单文件解压慢）

### Linux

- AppImage 自包含但体积大；snap/deb 适合特定发行版
- Python 子进程的 cwd 必须正确，否则 import 路径失败

---

## 11. 常见构建问题

| 现象 | 原因 | 解决 |
|---|---|---|
| `pyinstaller not recognized` | PATH 没装 PyInstaller | 用 `npm run build:python`，脚本自动找 venv |
| `Cannot find module 'ws'` | externalizeDepsPlugin 未生效 | 确认 `electron.vite.config.mjs` 含 plugin |
| `process.resourcesPath` 在 dev 是 undefined | dev 不走 packaged 路径 | 用 `app.isPackaged` 区分（已实现） |
| 安装包能装但启动后白屏 | renderer URL 解析错 | 检查 `out/renderer/index.html` 是否存在 |
| `app_python.exe` 启动报 import error | `hidden_imports` 漏 | 在 `build.spec` 加 `collect_submodules('xxx')` |
| Python 模块路径错 | spawn 的 cwd 不对 | dev 走 `python_backend`，packaged 走 `resources` |
| 杀毒拦截 | PyInstaller 单文件特征 | 改目录形式，或代码签名 |

---

## 12. 验证安装包

```
1. cd new-template
2. npm run build:win
3. 双击 dist/electron_py-0.1.0-setup.exe 安装
4. 启动应用 → 首页应在 ≤ 7 s 内出现 "All Systems Ready"
5. 点击 "Call echo" → 返回 'hello from vue'
6. 关闭应用 → 检查任务管理器中 app_python.exe 已退出
7. 卸载 → %LOCALAPPDATA%/app_electron/ 可残留（设计如此，不影响）
```
