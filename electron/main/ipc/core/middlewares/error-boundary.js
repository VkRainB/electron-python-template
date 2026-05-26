import { fail, isResponse } from '../ipc-response.js'
import { IpcError, ErrorCode } from '../ipc-error.js'

/**
 * 异常边界:catch 任何下游抛出的异常,转换为统一 fail 响应。
 * 必须放在中间件链的最外层(第一个 use)。
 * @returns {(ctx: any, next: () => Promise<any>) => Promise<any>}
 */
export function errorBoundary() {
  return async (ctx, next) => {
    try {
      await next()
      if (!isResponse(ctx.response)) {
        ctx.logger.warn(`[ipc][${ctx.channel}] handler 未返回响应壳,trace=${ctx.traceId}`)
        ctx.response = fail(ErrorCode.INTERNAL_ERROR, 'handler returned no response')
      }
    } catch (err) {
      if (err instanceof IpcError) {
        ctx.response = fail(err.code, err.message, err.details)
      } else {
        ctx.logger.error(
          `[ipc][${ctx.channel}] uncaught error: ${err.message}\n${err.stack || ''} trace=${ctx.traceId}`
        )
        ctx.response = fail(ErrorCode.INTERNAL_ERROR, err.message || 'unknown error')
      }
    }
  }
}
