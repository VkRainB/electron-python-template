import { WebSocketBridgeTransport } from './ws-transport.js'
import { registerBuiltinHandlers } from './builtin-handlers.js'
import { Logger } from '../../../logger/logger.js'

export class BridgeManager {
  constructor(pythonBackendUrl) {
    this.logger = Logger.getInstance()
    this.transport = new WebSocketBridgeTransport(pythonBackendUrl)

    /** @type {Map<string, import('./types.js').ActionHandler>} */
    this.handlers = new Map()

    this.isConnected = false
    this.stats = {
      totalRequests: 0,
      totalSuccess: 0,
      totalErrors: 0,
      averageDuration: 0,
      handlers: []
    }
    this._totalDuration = 0

    this.transport.on('request', (req) => {
      this.processRequest(req).catch((err) =>
        this.logger.error(`[BridgeManager] processRequest error: ${err.message}`)
      )
    })
    this.transport.on('connected', () => {
      this.isConnected = true
      this.logger.info('[BridgeManager] connected')
    })
    this.transport.on('disconnected', () => {
      this.isConnected = false
      this.logger.warn('[BridgeManager] disconnected')
    })

    registerBuiltinHandlers(this)
  }

  connect() {
    this.transport.connect()
  }
  disconnect() {
    this.transport.disconnect()
  }
  getIsConnected() {
    return this.isConnected
  }
  setBackendUrl(url) {
    this.transport.setBackendUrl(url)
  }

  register(action, handler) {
    if (this.handlers.has(action)) {
      this.logger.warn(`[BridgeManager] handler "${action}" 被覆盖`)
    }
    this.handlers.set(action, handler)
    this.stats.handlers = [...this.handlers.keys()]
  }

  unregister(action) {
    this.handlers.delete(action)
    this.stats.handlers = [...this.handlers.keys()]
  }

  getStats() {
    return { ...this.stats, handlers: [...this.stats.handlers] }
  }

  async processRequest(req) {
    const { callback_id, action, params } = req
    this.stats.totalRequests++

    const handler = this.handlers.get(action)
    if (!handler) {
      const msg = `unknown action: ${action}`
      this.logger.warn(`[BridgeManager] ${msg}`)
      this.stats.totalErrors++
      if (callback_id) this.transport.sendError(callback_id, msg)
      return
    }

    const start = Date.now()
    try {
      const result = await handler(params || {})
      const dur = Date.now() - start
      this._totalDuration += dur
      this.stats.totalSuccess++
      this.stats.averageDuration = Math.round(
        this._totalDuration / Math.max(1, this.stats.totalSuccess)
      )
      if (callback_id) this.transport.sendSuccess(callback_id, result)
    } catch (err) {
      this.stats.totalErrors++
      this.logger.error(`[BridgeManager] handler "${action}" failed: ${err.message}`)
      if (callback_id) this.transport.sendError(callback_id, err.message)
    }
  }
}

let _instance = null

export function getBridgeManager(pythonBackendUrl) {
  if (!_instance) _instance = new BridgeManager(pythonBackendUrl)
  return _instance
}

export function _resetBridgeManagerForTest() {
  _instance = null
}
