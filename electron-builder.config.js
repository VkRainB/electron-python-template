/**
 * electron-builder 配置（替代 electron-builder.yml）。
 * 所有可变值统一从 app.config.json 读取。
 *
 * 二进制名 binaryName 统一为 app_python：
 *   - Windows: onefile → resources/<binaryName>.exe
 *   - macOS/Linux: onedir → resources/python_build/<binaryName>/<binaryName>
 *
 * app.config.json 同时通过 extraResources 复制到 resources/，
 * 供 Python 运行时与 Electron 主进程从同一路径读取。
 */

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
  },
  mac: {
    entitlementsInherit: 'build/entitlements.mac.plist',
    extendInfo: [
      { NSCameraUsageDescription: "Application requests access to the device's camera." },
      { NSMicrophoneUsageDescription: "Application requests access to the device's microphone." },
      { NSDocumentsFolderUsageDescription: "Application requests access to the user's Documents folder." },
      { NSDownloadsFolderUsageDescription: "Application requests access to the user's Downloads folder." }
    ],
    notarize: false,
    extraResources: [
      { from: `python_backend/dist/${binName}/`, to: `python_build/${binName}/` }
    ]
  },
  dmg: {
    artifactName: '${name}-${version}.${ext}'
  },
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
  },
  npmRebuild: false,
  publish: {
    provider: 'generic',
    url: 'https://example.com/auto-updates'
  },
  electronDownload: {
    mirror: 'https://npmmirror.com/mirrors/electron/'
  }
}
