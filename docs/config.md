# app.config.json 配置文档

## 1. 是什么

`app.config.json` 是项目根目录下的**唯一配置真相源**（single source of truth），由 Python 运行时、Electron 主进程、PyInstaller、electron-builder 四方读取消费，用于消除跨进程、跨工具链的硬编码同步问题。

文件位置：`new-template/app.config.json`

## 2. Schema

```json
{
  "app": {
    "id": "com.electron.app",
    "name": "momo_py",
    "productName": "创工坊",
    "version": "0.1.0",
    "description": "An Electron application with Vue",
    "author": "example.com"
  },
  "backend": {
    "binaryName": "mo_server",
    "host": "127.0.0.1",
    "defaultPort": 12654,
    "portProbeRange": 50
  },
  "daemon": {
    "dirName": {
      "win32": "app_electron",
      "unix": ".app_electron"
    }
  }
}
```

## 3. 字段说明

### 3.1 `app` 段（Electron 打包元信息）

| 字段 | 类型 | 说明 | 影响 |
|---|---|---|---|
| `id` | string | electron-builder `appId`，反域名格式 | Windows AppUserModelID、macOS Bundle ID |
| `name` | string | 程序内部名（npm name），小写、无空格 | NSIS 安装包名 `${name}-${version}-setup.exe`、`win.executableName`、updater 缓存目录、`package.json.name` |
| `productName` | string | 用户可见的产品名，可中文 | 安装时显示名、桌面快捷方式名、控制面板"添加或删除程序"显示名 |
| `version` | string | 应用版本号，`x.y.z` | NSIS 安装包文件名、Python `APP_VERSION`、`package.json.version`、自动更新比对 |
| `description` | string | 应用描述 | `package.json.description` |
| `author` | string | 作者/组织名 | `package.json.author`、Windows publisher |

### 3.2 `backend` 段（Python 后端）

| 字段 | 类型 | 说明 | 影响 |
|---|---|---|---|
| `binaryName` | string | PyInstaller 输出名 | Win: `dist/<binaryName>.exe`(onefile)；Mac/Linux: `dist/<binaryName>/<binaryName>`(onedir)；Electron 端 `_resolveExecutable` 拼接路径 |
| `host` | string | 后端监听地址 | uvicorn 启动绑定地址、Electron HTTP/WS 客户端目标地址 |
| `defaultPort` | number | 首选端口 | Python `DaemonManager.resolve_port()` 起始探测点 |
| `portProbeRange` | number | 端口被占时向后探测的范围 | 实际尝试 `defaultPort` ~ `defaultPort + portProbeRange` |

### 3.3 `daemon` 段（守护进程元数据目录）

| 字段 | 类型 | 说明 |
|---|---|---|
| `dirName.win32` | string | Windows 平台下守护文件目录名，相对 `%LOCALAPPDATA%/` |
| `dirName.unix` | string | macOS/Linux 平台目录名，相对 `~/`，约定以 `.` 开头 |

完整路径：
- Windows: `%LOCALAPPDATA%\<dirName.win32>\` → 默认 `%LOCALAPPDATA%\app_electron\`
- Unix: `~/<dirName.unix>/` → 默认 `~/.app_electron/`

该目录下存放：`daemon.pid` / `daemon.version` / `daemon.port`。

## 4. 读取方与适配层

| 消费方 | 读取入口 | 文件 |
|---|---|---|
| Electron 主进程（运行时） | `loadConfig()` from `src/shared/config.js` | ES Module，通过 vite 打包到 main bundle |
| Python 后端（运行时） | `load_config()` from `app.app_config` | 标准 Python 模块，`@lru_cache` 缓存 |
| electron-builder（构建时） | `require('./app.config.json')` | `electron-builder.config.js` 中直接引入 |
| PyInstaller（构建时） | `json.load(...)` 读 `../app.config.json` | `python_backend/build.spec` |
| sync 脚本 | `JSON.parse(fs.readFileSync(...))` | `scripts/sync-package-meta.mjs` |
| build-python.mjs | 同上 | `scripts/build-python.mjs` |

## 5. 加载优先级（Python 侧）

`python_backend/app/app_config.py` 实现三层 fallback：

```
1. 生产态：<exe_dir>/app.config.json                    ← 用户可热修复
2. 生产态：sys._MEIPASS/app.config.json                  ← PyInstaller 内嵌兜底
3. 生产态：<exe_dir>/../app.config.json                  ← Electron resources/ 同源
4. 开发态：python_backend/../app.config.json             ← 项目根
```

Electron 侧（`src/shared/config.js`）：

```
1. packaged: process.resourcesPath/app.config.json     ← extraResources 复制结果
2. dev:      app.getAppPath()/app.config.json          ← 项目根
3. 构建脚本:  从 cwd 向上找
```

## 6. 修改后的影响范围

修改 `app.config.json` 后，**必须**：

| 修改字段 | 需要的动作 |
|---|---|
| `backend.*`、`daemon.*` | 重启 Python 后端进程即可 |
| `app.name` / `version` / `description` / `author` | 跑 `npm run sync:meta` 同步到 `package.json`（构建脚本会自动跑） |
| `app.id` / `productName` / `backend.binaryName` | 必须重新打包（影响 NSIS/PyInstaller 产物名） |

## 7. 修改示例

### 7.1 改端口（仅运行时）

```diff
"backend": {
-  "defaultPort": 12654,
+  "defaultPort": 47821,
}
```
重启即可，无需打包。

### 7.2 改产品名（要重新打包）

```diff
"app": {
-  "productName": "创工坊",
+  "productName": "新产品",
}
```
```bash
npm run build:win
```
产物：
- `dist/<name>-<version>-setup.exe`
- 安装后 Windows 控制面板显示"新产品"
- `resources/app.config.json` 同步更新

### 7.3 改后端二进制名

```diff
"backend": {
-  "binaryName": "mo_server",
+  "binaryName": "myapp_backend",
}
```
```bash
npm run build:win
```
影响：
- PyInstaller 输出 `dist/myapp_backend.exe`
- electron-builder `extraResources` 自动拼接新路径
- Electron `_resolveExecutable` 自动适配

## 8. 同步到 package.json

`scripts/sync-package-meta.mjs` 单向同步 `app.config.json → package.json`：

- 同步字段：`name` / `version` / `description` / `author`
- 触发时机：`npm run build` / `npm run build:python` 前自动执行（prebuild 钩子）
- 手动触发：`npm run sync:meta`
- 仅在值不一致时写入，避免无意义 diff

**重要**：开发者应**只改 `app.config.json`**，不要直接改 `package.json` 的对应字段，否则下次构建会被覆盖。

## 9. 打包时的资源分发

`electron-builder.config.js` 通过 `extraResources` 把 `app.config.json` 复制到打包产物的 `resources/` 目录：

```
dist/win-unpacked/
└── resources/
    ├── app.asar
    ├── app.config.json     ← 双侧运行时共同读取
    └── mo_server.exe       ← Python 后端
```

PyInstaller 通过 `datas` 把 json 嵌入二进制，构成第二层兜底（外部文件丢失时仍可启动）。

## 10. 注意事项

### 10.1 electron-builder 26 配置识别问题

`electron-builder` 26.8.1 **不自动识别** `.config.js` / `.config.cjs` 配置文件，必须在命令行显式 `--config electron-builder.config.js`。`package.json` 中的 `build:win/mac/linux` 脚本已包含该参数，不要在简化命令时去掉。

### 10.2 缓存导致改 config 后必须重启

Python 端 `load_config()` 使用 `@lru_cache(maxsize=1)`；Node 端 `loadConfig()` 在模块级缓存。生产态下用户修改 `resources/app.config.json` 后必须重启应用才能生效。

### 10.3 外部覆盖的安全性

打包后用户可篡改 `resources/app.config.json`。这是**有意为之的热修复能力**（如改端口避免冲突），但意味着不应在此文件中放置敏感信息（密钥、token 等）。

### 10.4 中文 productName

`productName` 支持 Unicode（含中文），electron-builder + NSIS 会正确处理。但 `app.name` 必须是小写 ASCII、无空格（npm 包名规则），否则 `package.json` 同步会失败。

### 10.5 单向同步

不要把 `package.json` 当成可改源。已有的 npm 字段（`scripts`、`dependencies` 等）正常维护；但 `name` / `version` / `description` / `author` 这四个字段属于 `app.config.json` 的下游产物。

## 11. 相关文件索引

| 类别 | 文件 |
|---|---|
| 配置文件本身 | `app.config.json` |
| Node 读取器 | `src/shared/config.js` |
| Python 读取器 | `python_backend/app/app_config.py` |
| 同步脚本 | `scripts/sync-package-meta.mjs` |
| electron-builder 配置 | `electron-builder.config.js` |
| PyInstaller spec | `python_backend/build.spec` |
| Python 后端入口 | `python_backend/main.py` |
| Python 守护管理 | `python_backend/app/daemon_manager.py` |
| Python 版本号 | `python_backend/app/version.py` |
| Electron python 服务 | `src/main/services/python-service.js` |
| Electron daemon 客户端 | `src/main/services/python-daemon-client.js` |
