import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const _nodeRequire = createRequire(import.meta.url)
let _electronApp = null
try {
  const m = _nodeRequire('electron')
  _electronApp = m && typeof m === 'object' && m.app ? m.app : null
} catch {
  _electronApp = null
}

function _resolveConfigPath() {
  // 1) Electron packaged: process.resourcesPath/app.config.json（extraResources 提供）
  if (_electronApp?.isPackaged) {
    return path.join(process.resourcesPath, 'app.config.json')
  }
  // 2) Electron dev: app.getAppPath() 指向项目根
  if (_electronApp?.getAppPath) {
    return path.join(_electronApp.getAppPath(), 'app.config.json')
  }
  // 3) 非 Electron 上下文（构建脚本）: 从 cwd 向上找
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'app.config.json')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.join(process.cwd(), 'app.config.json')
}

let _cached = null

export function loadConfig() {
  if (_cached) return _cached
  const p = _resolveConfigPath()
  _cached = JSON.parse(fs.readFileSync(p, 'utf8'))
  return _cached
}

export function getBackend() {
  return loadConfig().backend
}

export function getApp() {
  return loadConfig().app
}

export function getDaemonDirName() {
  const cfg = loadConfig()
  return process.platform === 'win32' ? cfg.daemon.dirName.win32 : cfg.daemon.dirName.unix
}
