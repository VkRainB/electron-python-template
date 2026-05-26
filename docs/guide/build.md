# 打包发布

打包过程分两步：

1. **编译 Python 二进制**（PyInstaller）
2. **组装 Electron 安装包**（electron-builder），把 Python 产物作为 `extraResources`

模板把这两步串成了一条命令。

## 一键打包

```bash
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
```

每条命令展开后等价：

```bash
node scripts/sync-package-meta.mjs      # prebuild:python 同步 app.config.json → package.json
node scripts/build-python.mjs            # PyInstaller 打 Python
electron-vite build                       # 编译三端（main/preload/renderer）
electron-builder --win|--mac|--linux --config electron-builder.config.js
```

也可以分步：

```bash
npm run build:python    # 只打 Python
npm run build           # 只编 electron 三端
npm run build:unpack    # 出 dir 形式（不打安装包），方便快速验证
```

## 元数据同步

`scripts/sync-package-meta.mjs` 在每个 build 前跑一次：

- 读 `app.config.json` 的 `app` 节（见 [应用配置](/guide/config)）：`name / version / description / author`
- 与 `package.json` 比对，不一致就回写
- electron-builder 直接读 `package.json` 的字段

这样 **只改 `app.config.json` 一份配置** 就能让三端都拿到最新元数据。

## Python 打包

`scripts/build-python.mjs` 调用 PyInstaller 将 Python 后端编译为独立可执行文件。产物名由 [应用配置](/guide/config) 的 `backend.binaryName` 决定。

详细的 spec 配置（隐式 import、排除依赖、onefile / onedir 差异）见 [Python 打包配置](/guide/python-build-config)。

## Electron 打包

`electron-builder.config.js` 定义安装包的打包行为。`files` 排除源码目录，`extraResources` 把 Python 产物与 `app.config.json` 复制到安装包内。

详细的平台配置（NSIS、dmg、AppImage、自动更新）见 [Electron Builder 配置](/guide/electron-builder-config)。

## 产物位置

成功后产物在 `dist/`：

```
dist/
├── momo_py-0.1.1-setup.exe        # Windows NSIS
├── momo_py-0.1.1.dmg              # macOS
├── momo_py-0.1.1.AppImage         # Linux AppImage
├── momo_py_0.1.1_amd64.deb        # Linux deb
└── momo_py_0.1.1_amd64.snap       # Linux snap
```

文件名规则来自 `electron-builder.config.js` 里的 `artifactName`。

## 平台差异

| 平台 | 形式 | 安装路径 | 注意 |
| --- | --- | --- | --- |
| Windows | NSIS exe | `%LOCALAPPDATA%\Programs\<productName>` | 易被杀毒误报，可签名缓解 |
| macOS | dmg | `/Applications` | 需要 entitlements，模板默认不公证 |
| Linux | AppImage / snap / deb | 各自 | snap 需要 snapd 服务 |

macOS 公证需要：

- Apple Developer 账号
- `csc_link` + `csc_key_password` 环境变量
- electron-builder.config.js 里 `notarize: { teamId: 'XXXX' }`

## 持续集成

GitHub Actions 示例（伪代码）：

```yaml
- uses: actions/setup-node@v4
  with: { node-version: 20 }
- uses: actions/setup-python@v5
  with: { python-version: '3.11' }
- run: npm ci
- run: cd python_backend && python -m pip install -r requirements.txt
- run: npm run build:win   # 或 build:mac / build:linux
- uses: actions/upload-artifact@v4
  with: { name: dist, path: dist/ }
```

按平台分别用 `windows-latest` / `macos-latest` / `ubuntu-latest` 三条 job。

## 自动更新

`electron-builder.config.js` 里：

```js
publish: {
  provider: 'generic',
  url: 'https://example.com/auto-updates'
}
```

把 `dist/*.exe` / `dist/latest.yml` 等推到自己的 CDN，再在 Electron 启动后调 `autoUpdater.checkForUpdatesAndNotify()`。

模板预装了 `electron-updater` 但默认未启用 —— 业务自行调用。
