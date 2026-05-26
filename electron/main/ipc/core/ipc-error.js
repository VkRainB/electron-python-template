/**
 * 业务/框架异常基类。被 error-boundary 中间件捕获后转为统一 fail 响应。
 */
export class IpcError extends Error {
  /**
   * @param {string} code 错误码,大写下划线(如 'PYTHON_NOT_READY')
   * @param {string} message 人类可读错误信息
   * @param {any} [details] 附加上下文
   */
  constructor(code, message, details) {
    super(message)
    this.name = 'IpcError'
    this.code = code
    this.details = details
  }
}

/** 框架内置错误码 */
export const ErrorCode = Object.freeze({
  VALIDATION_FAILED: 'IPC_VALIDATION_FAILED',
  RATE_LIMITED: 'IPC_RATE_LIMITED',
  INTERNAL_ERROR: 'IPC_INTERNAL_ERROR',
  UNKNOWN_CHANNEL: 'IPC_UNKNOWN_CHANNEL',
  DEPENDENCY_MISSING: 'IPC_DEPENDENCY_MISSING'
})
