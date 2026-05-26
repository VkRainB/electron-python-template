import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import axios from 'axios'

import { Logger } from '../../logger/logger.js'
import { PythonDaemonClient } from './python-daemon-client.js'
import { getBackend } from '../../../shared/config.js'

const _nodeRequire = createRequire(import.meta.url)
let _electronApp = null
let _electronDialog = null
try {
  const m = _nodeRequire('electron')
  _electronApp = m && typeof m === 'object' && m.app ? m.app : null
  _electronDialog = m && typeof m === 'object' && m.dialog ? m.dialog : null
} catch {
  _electronApp = null
  _electronDialog = null
}

export const ENABLE_DAEMON_MODE = true

export const MAX_RESTART_ATTEMPTS = 3
export const MAX_DAEMON_RECOVERY_ATTEMPTS = 5
export const HEALTH_CHECK_INTERVAL = 30_000
export const DAEMON_HEARTBEAT_INTERVAL = 120_000
export const RESTART_COOLDOWN = 60_000
export const DAEMON_RECOVERY_COOLDOWN = 120_000

const _backendCfg = getBackend()
const DAEMON_HOST = _backendCfg.host
const DEFAULT_PORT = _backendCfg.defaultPort
const BINARY_NAME = _backendCfg.binaryName

export class PythonService {
  constructor() {
    this.logger = Logger.getInstance()
    this.useDaemonMode = ENABLE_DAEMON_MODE
    this.daemonClient = new PythonDaemonClient()
    this.pythonProcess = null

    this.onReadyCallback = null

    this.healthCheckTimer = null
    this.daemonHeartbeatTimer = null

    this.restartAttempts = 0
    this.lastRestartTime = 0
    this.isRestartInProgress = false
    this.daemonRecoveryAttempts = 0
    this.lastDaemonRecoveryTime = 0

    this._status = {
      isRunning: false,
      lastHealthCheck: null,
      healthCheckSuccess: false,
      restartCount: 0,
      startTime: null,
      lastError: null
    }
  }

  isDaemonModeEnabled() {
    return this.useDaemonMode
  }

  getBackendBaseUrl() {
    const port = this.daemonClient.getCurrentPort() || DEFAULT_PORT
    return `http://${DAEMON_HOST}:${port}`
  }

  onReady(cb) {
    this.onReadyCallback = cb
  }

  getStatus() {
    return { ...this._status, restartCount: this.restartAttempts }
  }

  _updateStatus(patch) {
    this._status = { ...this._status, ...patch }
  }

  // ---------- 启动 / 停止 ----------
  async start() {
    this._updateStatus({ isRunning: false, startTime: new Date(), lastError: null })

    if (this.useDaemonMode) {
      // 先尝试发现已驻留进程
      if (await this.daemonClient.isDaemonRunning()) {
        await this.daemonClient.start()
        this._updateStatus({ isRunning: true })
        this._startHealthCheckTimer()
        this._startDaemonHeartbeat()
        if (this.onReadyCallback) this.onReadyCallback()
        return
      }
      // 未驻留：spawn 新 daemon
      this._spawnProcess()
      try {
        await this._waitForHttpReady(30_000)
        await this.daemonClient.start()
      } catch (e) {
        this._updateStatus({ lastError: e.message })
        throw e
      }
      this._updateStatus({ isRunning: true })
      this._startHealthCheckTimer()
      this._startDaemonHeartbeat()
      if (this.onReadyCallback) this.onReadyCallback()
      return
    }

    // spawn 模式
    this._spawnProcess()
    await this._waitForHttpReady(30_000)
    this._updateStatus({ isRunning: true })
    this._startHealthCheckTimer()
    if (this.onReadyCallback) this.onReadyCallback()
  }

  async stop({ preserveDaemon = false } = {}) {
    this._stopHealthCheckTimer()
    this._stopDaemonHeartbeat()

    try {
      await this.daemonClient.disconnectSession()
    } catch {
      /* ignore */
    }

    if (this.useDaemonMode) {
      if (preserveDaemon) {
        // 显式要求保留 daemon（下次复用），仅断 session
        this.logger.info('[PythonService] stop with preserveDaemon=true, daemon 保留运行')
        this._updateStatus({ isRunning: false })
        return
      }
      // 彻底清理流水线：/shutdown_evol → 等待 → manualCleanup → killByPort 兜底
      await this._terminateDaemon()
      this._updateStatus({ isRunning: false })
      return
    }

    // spawn 模式
    if (this.pythonProcess) {
      try {
        this.pythonProcess.kill('SIGTERM')
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 1000))
      if (this.pythonProcess && !this.pythonProcess.killed) {
        try {
          this.pythonProcess.kill('SIGKILL')
        } catch {
          /* ignore */
        }
      }
      this.pythonProcess = null
    }
    // 兜底：按端口杀残留
    await this.daemonClient.killByPort(this.daemonClient.getCurrentPort() || DEFAULT_PORT)
    this._updateStatus({ isRunning: false })
  }

  /**
   * 守护模式下的彻底清理：HTTP /shutdown_evol → 检查 → manualCleanup → killByPort。
   * 多重兜底确保不留僵尸进程。
   */
  async _terminateDaemon() {
    const baseUrl = this.getBackendBaseUrl()

    // Step 1: HTTP /shutdown_evol 触发 Python 端优雅退出
    try {
      this.logger.info(`[PythonService] POST ${baseUrl}/shutdown_evol`)
      await axios.post(`${baseUrl}/shutdown_evol`, {}, {
        timeout: 3000,
        validateStatus: () => true
      })
    } catch (e) {
      this.logger.warn(`[PythonService] /shutdown_evol 失败：${e.message}`)
    }

    // Step 2: 等 1s 让 Python 自行退出
    await new Promise((r) => setTimeout(r, 1000))

    // Step 3: 若仍在 → manualCleanup（按 PID kill + 清文件）
    if (await this.daemonClient.isDaemonRunning()) {
      this.logger.warn('[PythonService] shutdown_evol 后 daemon 仍在，执行 manualCleanup')
      await this.daemonClient.manualCleanup()
      await new Promise((r) => setTimeout(r, 500))
    } else {
      // 即便 daemon 已退出，也清理元数据文件（防止它退得不干净）
      await this.daemonClient.manualCleanup().catch(() => undefined)
    }

    // Step 4: 终极兜底 → 按端口杀
    const port = this.daemonClient.getCurrentPort() || DEFAULT_PORT
    const killed = await this.daemonClient.killByPort(port)
    if (killed > 0) {
      this.logger.warn(`[PythonService] 端口兜底杀掉 ${killed} 个残留进程`)
    }
  }

  async restart() {
    this.logger.info('[PythonService] 触发自动重启')
    await this.stop()
    await new Promise((r) => setTimeout(r, 500))
    await this.start()
  }

  // ---------- 健康检查 ----------
  _startHealthCheckTimer() {
    if (this.healthCheckTimer) return
    this.healthCheckTimer = setInterval(async () => {
      const result = await this.healthCheck()
      this._updateStatus({ lastHealthCheck: new Date(), healthCheckSuccess: result.success })
      if (!result.success) this._attemptRestart()
    }, HEALTH_CHECK_INTERVAL)
  }

  _stopHealthCheckTimer() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  async healthCheck() {
    const start = Date.now()
    try {
      const { data } = await axios.get(`${this.getBackendBaseUrl()}/health`, {
        timeout: 2000
      })
      return { success: data?.status === 'ok', latencyMs: Date.now() - start }
    } catch (e) {
      return { success: false, error: e.message, latencyMs: Date.now() - start }
    }
  }

  // ---------- daemon 心跳（守护模式独有） ----------
  _startDaemonHeartbeat() {
    if (!this.useDaemonMode || this.daemonHeartbeatTimer) return
    this.daemonHeartbeatTimer = setInterval(async () => {
      const alive = await this.daemonClient.isDaemonRunning()
      if (!alive) {
        this.logger.warn('[PythonService] daemon 心跳失败，触发恢复')
        this._attemptDaemonRecovery()
      }
    }, DAEMON_HEARTBEAT_INTERVAL)
  }

  _stopDaemonHeartbeat() {
    if (this.daemonHeartbeatTimer) {
      clearInterval(this.daemonHeartbeatTimer)
      this.daemonHeartbeatTimer = null
    }
  }

  async _attemptDaemonRecovery() {
    if (Date.now() - this.lastDaemonRecoveryTime < DAEMON_RECOVERY_COOLDOWN) return
    if (this.daemonRecoveryAttempts >= MAX_DAEMON_RECOVERY_ATTEMPTS) {
      this.logger.error('[PythonService] 已达最大 daemon 恢复次数')
      this._showFatalDialog('Python 后端守护进程多次恢复失败，请重启应用')
      return
    }
    this.lastDaemonRecoveryTime = Date.now()
    this.daemonRecoveryAttempts++
    try {
      this._spawnProcess()
      await this._waitForHttpReady(30_000)
      await this.daemonClient.start()
      this.logger.info('[PythonService] daemon 恢复成功')
    } catch (e) {
      this.logger.error(`[PythonService] daemon 恢复失败: ${e.message}`)
    }
  }

  // ---------- spawn 模式重启 ----------
  _attemptRestart() {
    if (this.isRestartInProgress) return
    if (Date.now() - this.lastRestartTime < RESTART_COOLDOWN) return
    if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      this.logger.error('[PythonService] 已达最大重启次数')
      this._showFatalDialog('Python 后端多次重启失败，请重启应用')
      return
    }
    this.isRestartInProgress = true
    this.lastRestartTime = Date.now()
    this.restartAttempts++
    this.restart()
      .catch((e) => this.logger.error(`[PythonService] restart failed: ${e.message}`))
      .finally(() => {
        this.isRestartInProgress = false
      })
  }

  _showFatalDialog(message) {
    if (_electronDialog && _electronDialog.showErrorBox) {
      try {
        _electronDialog.showErrorBox('Python 后端异常', message)
      } catch {
        /* ignore */
      }
    } else {
      this.logger.error(`[PythonService][FATAL] ${message}`)
    }
  }

  // ---------- spawn ----------
  _spawnProcess() {
    const { command, args, cwd } = this._resolveExecutable()
    if (!fs.existsSync(command)) {
      throw new Error(`Python 可执行文件不存在: ${command}`)
    }
    const finalArgs = this.useDaemonMode ? [...args, '--daemon'] : args
    this.logger.info(`[PythonService] spawn ${command} ${finalArgs.join(' ')} (cwd=${cwd})`)
    this.logger.info('=== 开始启动Python服务 ===')

    const spawnOptions = {
      cwd,
      env: {
        ...process.env,
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8'
      },
      windowsHide: true
    }

    // 守护模式下分离子进程，让 Python 在 Electron 退出后继续驻留
    if (this.useDaemonMode) {
      spawnOptions.detached = true
      spawnOptions.stdio = 'ignore'
    } else {
      spawnOptions.stdio = ['pipe', 'pipe', 'pipe']
    }

    this.pythonProcess = spawn(command, finalArgs, spawnOptions)

    if (!this.useDaemonMode && this.pythonProcess.stdout) {
      this.pythonProcess.stdout.on('data', (d) =>
        this.logger.debug(`[py-stdout] ${d.toString().trimEnd()}`)
      )
      this.pythonProcess.stderr.on('data', (d) =>
        this.logger.warn(`[py-stderr] ${d.toString().trimEnd()}`)
      )
    }

    this.pythonProcess.on('exit', (code, signal) => {
      this.logger.warn(`[PythonService] python process exited code=${code} signal=${signal}`)
      if (!this.useDaemonMode) {
        this._updateStatus({ isRunning: false, lastError: `exit ${code}` })
        this._attemptRestart()
      }
    })

    this.pythonProcess.on('error', (err) => {
      this.logger.error(`[PythonService] spawn error: ${err.message}`)
      this._updateStatus({ isRunning: false, lastError: err.message })
    })

    if (this.useDaemonMode) {
      try {
        this.pythonProcess.unref()
      } catch {
        /* ignore */
      }
    }
  }

  _resolveExecutable() {
    const isPackaged = Boolean(_electronApp?.isPackaged)
    if (isPackaged) {
      const res = process.resourcesPath
      if (process.platform === 'win32') {
        return { command: path.join(res, `${BINARY_NAME}.exe`), args: [], cwd: res }
      }
      // mac/linux: PyInstaller onedir 形态，统一目录名 = BINARY_NAME
      const dir = path.join(res, 'python_build', BINARY_NAME)
      return { command: path.join(dir, BINARY_NAME), args: [], cwd: dir }
    }
    const root = process.cwd()
    const backend = path.join(root, 'python_backend')
    if (process.platform === 'win32') {
      return {
        command: path.join(backend, 'venv', 'Scripts', 'python.exe'),
        args: [path.join(backend, 'main.py')],
        cwd: root
      }
    }
    return {
      command: path.join(backend, 'venv', 'bin', 'python3'),
      args: [path.join(backend, 'main.py')],
      cwd: root
    }
  }

  async _waitForHttpReady(timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const r = await this.healthCheck()
      if (r.success) return
      await new Promise((r) => setTimeout(r, 200))
    }
    throw new Error(`[PythonService] 等待后端就绪超时 ${timeoutMs}ms`)
  }
}
