import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import path from 'node:path'
import fs from 'node:fs'
import WebSocket from 'ws'

import { Logger } from '../../../logger/logger.js'

const _nodeRequire = createRequire(import.meta.url)
let _electronApp = null
try {
  const m = _nodeRequire('electron')
  _electronApp = m && typeof m === 'object' && m.app ? m.app : null
} catch {
  _electronApp = null
}

const RECONNECT_BASE = 1_000
const RECONNECT_MAX = 15_000
const HEARTBEAT_INTERVAL = 10_000

function _readAppVersionFallback() {
  try {
    if (_electronApp?.getVersion) return _electronApp.getVersion()
  } catch {
    /* ignore */
  }
  try {
    const here = path.dirname(new URL(import.meta.url).pathname)
    const candidates = [
      path.resolve(here, '..', '..', '..', '..', 'package.json'),
      path.resolve(process.cwd(), 'package.json')
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const json = JSON.parse(fs.readFileSync(p, 'utf8'))
        if (json?.version) return json.version
      }
    }
  } catch {
    /* ignore */
  }
  return '0.0.0'
}

export class WebSocketBridgeTransport extends EventEmitter {
  constructor(pythonBackendUrl = 'http://127.0.0.1:47821') {
    super()
    this.logger = Logger.getInstance()
    this.pythonBackendUrl = pythonBackendUrl
    this.websocket = null
    this.reconnectAttempts = 0
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.isManualClose = false
  }

  setBackendUrl(url) {
    this.pythonBackendUrl = url
  }

  isConnected() {
    return this.websocket && this.websocket.readyState === WebSocket.OPEN
  }

  connect() {
    this.isManualClose = false
    this._createSocket()
  }

  disconnect() {
    this.isManualClose = true
    this._stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      try {
        this.websocket.close()
      } catch {
        /* ignore */
      }
    }
  }

  _wsUrl() {
    return this.pythonBackendUrl.replace(/^http/i, 'ws') + '/ws/electron'
  }

  _createSocket() {
    const url = this._wsUrl()
    this.logger.info(`[ws] connecting ${url}`)
    try {
      this.websocket = new WebSocket(url)
    } catch (e) {
      this.logger.error(`[ws] new WebSocket failed: ${e.message}`)
      this._scheduleReconnect()
      return
    }

    this.websocket.on('open', () => {
      this.logger.info('[ws] open')
      this.reconnectAttempts = 0
      this._send({
        type: 'hello',
        client: 'electron',
        version: _readAppVersionFallback()
      })
      this._startHeartbeat()
      this.emit('connected')
    })

    this.websocket.on('message', (raw) => {
      let msg
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        this.logger.warn(`[ws] invalid json: ${raw}`)
        return
      }

      switch (msg.type) {
        case 'hello_ack':
          this.logger.info('[ws] hello_ack received')
          break
        case 'ping':
          this._send({ type: 'pong', timestamp: msg.timestamp })
          break
        case 'pong':
          break
        case 'electron_request':
          this.emit('request', msg)
          break
        default:
          this.logger.warn(`[ws] unknown type: ${msg.type}`)
      }
    })

    this.websocket.on('error', (e) => {
      this.logger.error(`[ws] error: ${e.message}`)
    })

    this.websocket.on('close', (code, reason) => {
      this.logger.warn(`[ws] close code=${code} reason=${String(reason)}`)
      this._stopHeartbeat()
      this.emit('disconnected')
      if (!this.isManualClose) this._scheduleReconnect()
    })
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return
    const delay = Math.min(RECONNECT_BASE * 2 ** this.reconnectAttempts, RECONNECT_MAX)
    this.reconnectAttempts++
    this.logger.info(`[ws] reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this._createSocket()
    }, delay)
  }

  _startHeartbeat() {
    this._stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected()) return
      this._send({ type: 'ping', timestamp: Date.now() })
    }, HEARTBEAT_INTERVAL)
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  _send(payload) {
    if (!this.isConnected()) return
    try {
      this.websocket.send(JSON.stringify(payload))
    } catch (e) {
      this.logger.warn(`[ws] send failed: ${e.message}`)
    }
  }

  sendSuccess(callback_id, result) {
    this._send({
      type: 'response',
      callback_id,
      success: true,
      result,
      timestamp: Date.now()
    })
  }

  sendError(callback_id, error) {
    this._send({
      type: 'response',
      callback_id,
      success: false,
      error: typeof error === 'string' ? error : error?.message || String(error),
      timestamp: Date.now()
    })
  }
}
