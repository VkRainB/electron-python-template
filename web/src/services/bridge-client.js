import * as pythonApi from '@/api/ipc/python'
import * as bridgeApi from '@/api/ipc/bridge'

export class BridgeHttpError extends Error {
  constructor(status, body) {
    super(`HTTP ${status}`)
    this.status = status
    this.body = body
    this.name = 'BridgeHttpError'
  }
}

export class BridgeApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
    this.name = 'BridgeApiError'
  }
}

export class BridgeTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`request timeout ${timeoutMs}ms`)
    this.timeoutMs = timeoutMs
    this.name = 'BridgeTimeoutError'
  }
}

export class PythonBridgeClient {
  /**
   * @param {Object} [opts]
   * @param {string} [opts.baseUrl] 不传则从 IPC 动态获取
   * @param {number} [opts.timeout=10000]
   */
  constructor(opts = {}) {
    this._baseUrl = opts.baseUrl || null
    this._defaultTimeout = opts.timeout ?? 10000

    try {
      bridgeApi.onDisconnected(() => {
        this._baseUrl = null
      })
    } catch {
      /* ignore */
    }
  }

  async _resolveBaseUrl() {
    if (this._baseUrl) return this._baseUrl
    const resp = await pythonApi.getBackendUrl()
    if (!resp?.ok) {
      throw new Error(`getBackendUrl failed: ${resp?.error?.message || 'unknown'}`)
    }
    this._baseUrl = resp.data
    return this._baseUrl
  }

  /**
   * @param {string} presenter
   * @param {string} method
   * @param {any[]} [args=[]]
   * @param {{timeout?: number}} [config]
   */
  async call(presenter, method, args = [], config = {}) {
    const baseUrl = await this._resolveBaseUrl()
    const url = `${baseUrl.replace(/\/$/, '')}/api/bridge`
    const timeout = config.timeout ?? this._defaultTimeout

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    let resp
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presenter, method, args }),
        signal: controller.signal
      })
    } catch (e) {
      clearTimeout(timer)
      if (e.name === 'AbortError') throw new BridgeTimeoutError(timeout)
      throw e
    }
    clearTimeout(timer)

    let body = null
    try {
      body = await resp.json()
    } catch {
      /* 非 json */
    }

    if (!resp.ok) {
      if (body?.status === 'error') {
        throw new BridgeApiError(body.code || 'ERROR', body.message || `HTTP ${resp.status}`)
      }
      throw new BridgeHttpError(resp.status, body)
    }
    if (!body) throw new BridgeApiError('EMPTY', 'empty response')
    if (body.status === 'error') {
      throw new BridgeApiError(body.code || 'ERROR', body.message || 'unknown error')
    }
    return body.data
  }

  async batch(requests) {
    return Promise.all(requests.map((r) => this.call(r.presenter, r.method, r.args, r.config)))
  }
}

export const pythonBridgeClient = new PythonBridgeClient()
