# Electron Builder 配置

`electron-builder.config.js` 位于项目根目录，定义 Electron 安装包的打包行为。所有可变值从 [应用配置](/guide/config) 的 `app.config.json` 读取。

## 完整配置

```js
const cfg = require('./app.config.json')

const { app: appCfg, backend } = cfg
const binName = backend.binaryName

module.exports = {
  appId: appCfg.id,
  productName: appCfg.productName,
  directories: {
    buildResources: 'build'
  },
  files: [
    '!**/.vscode/*',
    '!electron/**',
    '!web/**',
    '!.build/**',
    '!vue-electron-best-master/**',
    '!electron.vite.config.{js,ts,mjs,cjs}',
    '!{.eslintcache,eslint.config.mjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md,DESIGN.md}',
    '!{.env,.env.*,.npmrc,pnpm-lock.yaml,jsconfig.json,components.json}',
    '!python_backend/**',
    '!venv/**'
  ],
  extraResources: [
    { from: 'app.config.json', to: 'app.config.json' }
  ],
  asarUnpack: ['resources/**'],
  win: { ... },
  mac: { ... },
  linux: { ... },
  npmRebuild: false,
  publish: { ... }
}
```

## 核心字段

### appId / productName

来自 `app.config.json`，分别对应 `app.id` 和 `app.productName`。影响 Windows 注册表、macOS bundle id 与安装包文件名。

### files

打包时包含的文件白名单。以 `!` 开头的条目为排除规则：

| 排除项 | 原因 |
| --- | --- |
| `electron/**`、`web/**` | 源码，已被 electron-vite 编译到 `out/` |
| `python_backend/**`、`venv/**` | Python 源码，通过 `extraResources` 单独打包 |
| `.env`、`.npmrc` 等 | 开发期文件，不应进入安装包 |

只保留 `out/`（electron-vite 编译产物）和 `resources/`（图标等静态资源）。

### extraResources

把文件复制到安装包的 `resources/` 目录，运行时通过 `process.resourcesPath` 访问。

```js
extraResources: [
  { from: 'app.config.json', to: 'app.config.json' }
]
```

Python 二进制按平台分别配置：

| 平台 | from | to |
| --- | --- | --- |
| Windows | `python_backend/dist/<binaryName>.exe` | `<binaryName>.exe` |
| macOS | `python_backend/dist/<binaryName>/` | `python_build/<binaryName>/` |
| Linux | `python_backend/dist/<binaryName>/` | `python_build/<binaryName>/` |

路径与 PyInstaller 的 `build.spec` 输出保持一致。

### asarUnpack

```js
asarUnpack: ['resources/**']
```

默认所有代码打进 asar 归档。`resources/**` 被排除在 asar 外，允许主进程直接通过文件系统路径访问 Python 二进制。

## 平台配置

### Windows

```js
win: {
  executableName: appCfg.name,
  extraResources: [
    { from: `python_backend/dist/${binName}.exe`, to: `${binName}.exe` }
  ]
},
nsis: {
  artifactName: '${name}-${version}-setup.${ext}',
  shortcutName: '${productName}',
  uninstallDisplayName: '${productName}',
  createDesktopShortcut: 'always'
}
```

产物为 NSIS 安装包，默认安装到 `%LOCALAPPDATA%\Programs\<productName>`。

### macOS

```js
mac: {
  entitlementsInherit: 'build/entitlements.mac.plist',
  extendInfo: [
    { NSCameraUsageDescription: "..." },
    { NSMicrophoneUsageDescription: "..." },
    { NSDocumentsFolderUsageDescription: "..." },
    { NSDownloadsFolderUsageDescription: "..." }
  ],
  notarize: false,
  extraResources: [
    { from: `python_backend/dist/${binName}/`, to: `python_build/${binName}/` }
  ]
},
dmg: {
  artifactName: '${name}-${version}.${ext}'
}
```

- `entitlements` 定义应用权限（摄像头、麦克风、文件夹访问）
- `notarize: false` 默认不公证，发布前需改为 `true` 并配置 `teamId`
- macOS 使用 onedir 形式打包 Python，因为 onefile 在 macOS 上有兼容问题

### Linux

```js
linux: {
  target: ['AppImage', 'snap', 'deb'],
  maintainer: 'electronjs.org',
  category: 'Utility',
  extraResources: [
    { from: `python_backend/dist/${binName}/`, to: `python_build/${binName}/` }
  ]
},
appImage: {
  artifactName: '${name}-${version}.${ext}'
}
```

同时产出三种格式，按需裁剪 `target` 数组。

## 其他配置

### npmRebuild

```js
npmRebuild: false
```

跳过 `electron-builder` 的原生模块重编译。模板已通过 `postinstall` 钩子在 `electron-builder install-app-deps` 阶段完成。

### publish

```js
publish: {
  provider: 'generic',
  url: 'https://example.com/auto-updates'
}
```

自动更新的 CDN 地址。模板预装了 `electron-updater` 但默认未启用，业务自行调用 `autoUpdater.checkForUpdatesAndNotify()`。

### electronDownload

```js
electronDownload: {
  mirror: 'https://npmmirror.com/mirrors/electron/'
}
```

国内镜像加速，避免下载 Electron 预编译包超时。
