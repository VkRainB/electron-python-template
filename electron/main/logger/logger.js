import { createRequire } from 'node:module'
import { mkdirSync, existsSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'

// 在 Node 环境下用 createRequire 安全加载 electron；非 Electron 环境下 fallback
const _nodeRequire = createRequire(import.meta.url)
let _electronApp = null
try {
  const m = _nodeRequire('electron')
  _electronApp = m && typeof m === 'object' && m.app ? m.app : null
} catch {
  _electronApp = null
}

function _fallbackLogsDir() {
  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA || join(os.homedir(), 'AppData', 'Local')
    return join(base, 'app_electron', 'logs')
  }
  return join(os.homedir(), '.app_electron', 'logs')
}

class Logger {
  static instance = null

  static getInstance() {
    if (!Logger.instance) Logger.instance = new Logger()
    return Logger.instance
  }

  constructor() {
    this.filePath = null
    this._ensureFilePath()
  }

  _ensureFilePath() {
    if (this.filePath) return
    let logsDir = null
    try {
      logsDir = _electronApp?.getPath ? _electronApp.getPath('logs') : null
    } catch {
      logsDir = null
    }
    if (!logsDir) logsDir = _fallbackLogsDir()
    try {
      if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true })
      this.filePath = join(logsDir, 'main.log')
    } catch {
      this.filePath = null
    }
  }

  _write(level, msg) {
    const ts = new Date().toISOString().replace('T', ' ').replace('Z', '')
    const line = `${ts} [${level}] ${msg}\n`
    process.stdout.write(line)
    this._ensureFilePath()
    if (this.filePath) {
      try {
        appendFileSync(this.filePath, line)
      } catch {
        /* 忽略写文件失败 */
      }
    }
  }

  debug(msg) {
    this._write('DEBUG', msg)
  }
  info(msg) {
    this._write('INFO', msg)
  }
  warn(msg) {
    this._write('WARN', msg)
  }
  error(msg) {
    this._write('ERROR', msg)
  }
}

export { Logger }
