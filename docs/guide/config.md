# 应用配置

`app.config.json` 位于项目根目录，是三端共享的**唯一事实源头**。修改这一份文件即可同步 Electron、Python、electron-builder 与构建脚本的元数据。

```json
{
  "app": {
    "id": "com.electron.app",
    "name": "momo_py",
    "productName": "创工坊",
    "version": "0.1.1",
    "description": "An Electron application with Vue",
    "author": "example.com"
  },
  "backend": {
    "binaryName": "mo_server",
    "host": "127.0.0.1",
    "defaultPort": 47821,
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

## app

应用元数据，同时影响 Electron 窗口标题、安装包名称与 `package.json` 同步。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 应用唯一标识，用于 `electron-builder` 的 `appId`，Windows 注册表与 macOS bundle id |
| `name` | string | 内部名称，用于二进制文件命名、目录名等技术场景 |
| `productName` | string | 用户可见的产品名称，显示在窗口标题、安装包文件名、系统应用列表中 |
| `version` | string | 语义化版本号，构建时由 `sync-package-meta.mjs` 同步到 `package.json` |
| `description` | string | 应用描述，写入安装包元数据 |
| `author` | string | 作者信息，写入 `package.json` 的 `author` 字段 |

## backend

Python 后端的运行与打包配置。

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `binaryName` | string | `mo_server` | PyInstaller 产物名称。Windows 生成 `mo_server.exe`，macOS/Linux 生成 `mo_server/` 目录 |
| `host` | string | `127.0.0.1` | Python 服务监听地址。仅本地通信，不建议改为 `0.0.0.0` |
| `defaultPort` | number | `47821` | 首选端口。被占用时自动递增探测 |
| `portProbeRange` | number | `50` | 从 `defaultPort` 起最多探测的端口数。全部占用则启动失败 |

端口探测逻辑见 [守护进程](/guide/daemon)。Python 侧由 `DaemonManager.resolve_port` 执行，Electron 侧通过 `PythonService.getBackendBaseUrl()` 获取最终端口。

## daemon

守护进程的元数据目录配置。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `dirName.win32` | string | Windows 平台下的元数据目录名，位于 `%LOCALAPPDATA%` 下 |
| `dirName.unix` | string | macOS / Linux 平台下的元数据目录名，位于 `~` 下 |

元数据目录存放三个文件：`daemon.pid`、`daemon.version`、`daemon.port`，用于守护进程复用与生命周期管理。

| 平台 | 实际路径 |
| --- | --- |
| Windows | `%LOCALAPPDATA%\app_electron\` |
| macOS / Linux | `~/.app_electron/` |

## 消费方

`app.config.json` 被四个消费方读取，各取所需：

| 消费方 | 读取方式 | 用到的字段 |
| --- | --- | --- |
| Electron 主进程 | `electron/shared/config.js` | `backend.*`、`daemon.*` |
| Python 后端 | `app/app_config.py` → `get_backend()` / `get_daemon_dir_name()` | `backend.*`、`daemon.*` |
| electron-builder | `electron-builder.config.js` | `app.id`、`app.name`、`app.productName` |
| 构建脚本 | `scripts/sync-package-meta.mjs` | `app.*`（同步到 `package.json`） |
| PyInstaller | `build.spec` 的 `datas` | 全量嵌入，运行时通过 `sys._MEIPASS` 读取 |

## 常见修改

### 修改产品名称

改 `app.productName`，下次构建时安装包文件名、窗口标题、系统应用列表自动更新。

### 修改端口

改 `backend.defaultPort`。如果环境中有其他服务占用 47821 附近端口，同时调大 `portProbeRange`：

```json
{
  "backend": {
    "defaultPort": 50000,
    "portProbeRange": 100
  }
}
```

### 修改二进制名称

改 `backend.binaryName`。影响 PyInstaller 产物名与主进程的 `resolvePythonExecutable()` 路径。

### 修改守护目录名

改 `daemon.dirName`。影响元数据存放路径，适用于多实例隔离场景：

```json
{
  "daemon": {
    "dirName": {
      "win32": "my_app_v2",
      "unix": ".my_app_v2"
    }
  }
}
```
