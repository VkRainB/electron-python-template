import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import axios from 'axios'

import { Logger } from '../../logger/logger.js'
import { getBackend, loadConfig } from '../../../shared/config.js'

const _nodeRequire = createRequire(import.meta.url)
let _electronApp = null
try {
  const m = _nodeRequire('electron')
  _electronApp = m && typeof m === 'object' && m.app ? m.app : null
} catch {
  _electronApp = null
}

const _backendCfg = getBackend()
const _daemonCfg = loadConfig().daemon
const DAEMON_PORT_DEFAULT = _backendCfg.defaultPort
const DAEMON_HOST = _backendCfg.host
const DAEMON_DIR_WIN = _daemonCfg.dirName.win32
const DAEMON_DIR_UNIX = _daemonCfg.dirName.unix

const WAIT_DAEMON_TIMEOUT_MS = 30_000
const HTTP_TIMEOUT_MS = 1500

function _safePid(raw) {
  const n = Number.parseInt(String(raw ?? '').trim(), 10)
  if (!Number.isInteger(n) || n <= 0 || n > 4_194_304) return null
  return n
}

function _safePort(raw) {
  const n = Number.parseInt(String(raw ?? '').trim(), 10)
  if (!Number.isInteger(n) || n <= 0 || n > 65_535) return null
  return n
}

export class PythonDaemonClient {
  constructor() {
    this.logger = Logger.getInstance()
    this.APP_VERSION = this._readAppVersion()
    this.daemonDir = this._getDaemonDir()
    this.pidFile = path.join(this.daemonDir, 'daemon.pid')
    this.versionFile = path.join(this.daemonDir, 'daemon.version')
    this.portFile = path.join(this.daemonDir, 'daemon.port')
    this.currentPort = DAEMON_PORT_DEFAULT
    this.currentPid = null
    this.sessionId = ''
  }

  _readAppVersion() {
    try {
      if (_electronApp && _electronApp.getVersion) {
        const v = _electronApp.getVersion()
        if (v) return v
      }
    } catch {
      /* not in electron context */
    }
    try {
      const here = path.dirname(new URL(import.meta.url).pathname)
      const candidates = [
        path.resolve(here, '..', '..', '..', 'package.json'),
        path.resolve(process.cwd(), 'package.json')
      ]
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const json = JSON.parse(fs.readFileSync(p, 'utf8'))
          if (json?.version) return json.version
        }
      }
    } catch {
      /* fallback */
    }
    return '0.0.0'
  }

  _getDaemonDir() {
    if (os.platform() === 'win32') {
      const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
      return path.join(base, DAEMON_DIR_WIN)
    }
    return path.join(os.homedir(), DAEMON_DIR_UNIX)
  }

  _readPid() {
    try {
      return _safePid(fs.readFileSync(this.pidFile, 'utf8'))
    } catch {
      return null
    }
  }

  _readVersion() {
    try {
      return fs.readFileSync(this.versionFile, 'utf8').trim()
    } catch {
      return null
    }
  }

  _readPort() {
    try {
      return _safePort(fs.readFileSync(this.portFile, 'utf8')) ?? DAEMON_PORT_DEFAULT
    } catch {
      return DAEMON_PORT_DEFAULT
    }
  }

  async _isPidAlive(pid) {
    if (!pid) return false
    if (os.platform() === 'win32') {
      try {
        const out = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'ignore']
        }).toString()
        return out.includes(String(pid))
      } catch {
        return false
      }
    }
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  async _httpVersionOk(port) {
    try {
      const { data } = await axios.get(`http://${DAEMON_HOST}:${port}/version`, {
        timeout: HTTP_TIMEOUT_MS
      })
      return Boolean(data && typeof data.version === 'string')
    } catch {
      return false
    }
  }

  _isVersionCompatible(daemonVersion) {
    if (!daemonVersion) return false
    const localMajor = String(this.APP_VERSION).split('.')[0]
    const remoteMajor = String(daemonVersion).split('.')[0]
    return localMajor === remoteMajor
  }

  async isDaemonRunning() {
    const pid = this._readPid()
    if (!(await this._isPidAlive(pid))) return false
    const version = this._readVersion()
    if (!this._isVersionCompatible(version)) return false
    const port = this._readPort()
    return this._httpVersionOk(port)
  }

  async start() {
    if (await this.isDaemonRunning()) {
      this.currentPid = this._readPid()
      this.currentPort = this._readPort()
      this.logger.info(
        `[DaemonClient] 复用驻留进程 pid=${this.currentPid} port=${this.currentPort}`
      )
      await this.connectSession().catch((e) => {
        this.logger.warn(`[DaemonClient] connectSession 失败：${e.message}`)
      })
      return { reused: true, pid: this.currentPid, port: this.currentPort }
    }

    // 不兼容版本：先尝试让旧 daemon 退出
    const oldVersion = this._readVersion()
    if (oldVersion && !this._isVersionCompatible(oldVersion)) {
      this.logger.warn(`[DaemonClient] 旧 daemon 版本 ${oldVersion} 不兼容，触发终止`)
      await this.terminateExistingDaemon().catch((e) => {
        this.logger.warn(`[DaemonClient] terminate 失败：${e.message}`)
      })
    }

    await this._waitForDaemonStart()
    return { reused: false, pid: this.currentPid, port: this.currentPort }
  }

  async _waitForDaemonStart() {
    this.logger.info('[DaemonClient] 等待 PythonService 启动新 daemon...')
    const deadline = Date.now() + WAIT_DAEMON_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (await this.isDaemonRunning()) {
        this.currentPid = this._readPid()
        this.currentPort = this._readPort()
        this.logger.info(
          `[DaemonClient] 新 daemon 就绪 pid=${this.currentPid} port=${this.currentPort}`
        )
        await this.connectSession().catch(() => undefined)
        return
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    throw new Error('等待 daemon 启动超时（30s）')
  }

  async terminateExistingDaemon() {
    const port = this._readPort()
    try {
      await axios.post(`http://${DAEMON_HOST}:${port}/shutdown_evol`, {}, { timeout: 1500 })
    } catch {
      // shutdown_evol 触发后连接会被断，错误可忽略
    }
    // 等待文件被清理
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      if (!fs.existsSync(this.pidFile)) return
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  async killByPid(pid) {
    if (!pid || pid <= 0) return false
    try {
      if (os.platform() === 'win32') {
        execSync(`taskkill /PID ${pid} /F /T`, {
          stdio: 'ignore',
          windowsHide: true
        })
      } else {
        try {
          process.kill(pid, 'SIGKILL')
        } catch {
          /* already dead */
        }
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * 按端口查到 LISTENING 进程并 kill。
   * Windows: netstat -ano + taskkill；Unix: lsof -ti:PORT | xargs kill -9
   */
  async killByPort(port) {
    if (!port || port <= 0) return 0
    let killed = 0
    try {
      if (os.platform() === 'win32') {
        const out = execSync('netstat -ano -p tcp', {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'ignore']
        }).toString()
        const lines = out.split(/\r?\n/)
        const pids = new Set()
        const re = new RegExp(`\\s127\\.0\\.0\\.1:${port}\\s.*LISTENING\\s+(\\d+)`)
        for (const line of lines) {
          const m = line.match(re)
          if (m) pids.add(parseInt(m[1], 10))
        }
        for (const pid of pids) {
          if (await this.killByPid(pid)) killed++
        }
      } else {
        try {
          const out = execSync(`lsof -ti:${port}`, {
            stdio: ['ignore', 'pipe', 'ignore']
          }).toString()
          for (const line of out.split(/\r?\n/)) {
            const pid = parseInt(line.trim(), 10)
            if (pid > 0 && (await this.killByPid(pid))) killed++
          }
        } catch {
          /* nothing listening */
        }
      }
    } catch (e) {
      this.logger.warn(`[DaemonClient] killByPort(${port}) error: ${e.message}`)
    }
    return killed
  }

  /**
   * 综合清理：按 PID 杀 → 等待 → 按端口兜底 → 清理元数据文件。
   * 用于 Electron 退出时确保 daemon 不残留。
   */
  async manualCleanup() {
    const pid = this._readPid()
    const port = this._readPort()

    if (pid) {
      this.logger.info(`[DaemonClient] manualCleanup: kill pid=${pid}`)
      await this.killByPid(pid)
      await new Promise((r) => setTimeout(r, 300))
    }

    const killed = await this.killByPort(port)
    if (killed > 0) {
      this.logger.info(`[DaemonClient] manualCleanup: killByPort(${port}) 杀掉 ${killed} 个进程`)
    }

    for (const f of [this.pidFile, this.versionFile, this.portFile]) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f)
      } catch {
        /* ignore */
      }
    }
  }

  async connectSession() {
    const port = this.currentPort || this._readPort()
    try {
      const { data } = await axios.post(
        `http://${DAEMON_HOST}:${port}/daemon/connect`,
        {},
        { timeout: 2000 }
      )
      this.sessionId = data?.session_id || ''
      return this.sessionId
    } catch (e) {
      this.logger.warn(`[DaemonClient] connectSession error: ${e.message}`)
      return ''
    }
  }

  async disconnectSession() {
    if (!this.sessionId) return
    const port = this.currentPort || this._readPort()
    try {
      await axios.post(
        `http://${DAEMON_HOST}:${port}/daemon/disconnect`,
        { session_id: this.sessionId },
        { timeout: 2000 }
      )
    } catch {
      /* ignore */
    } finally {
      this.sessionId = ''
    }
  }

  async healthCheck() {
    const port = this.currentPort || this._readPort()
    try {
      const { data } = await axios.get(`http://${DAEMON_HOST}:${port}/health`, {
        timeout: HTTP_TIMEOUT_MS
      })
      return data?.status === 'ok'
    } catch {
      return false
    }
  }

  getCurrentPort() {
    return this.currentPort
  }
  getCurrentPid() {
    return this.currentPid
  }
  getSessionId() {
    return this.sessionId
  }
  getDaemonDir() {
    return this.daemonDir
  }
}
