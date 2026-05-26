/**
 * 入参/出参日志,附带 traceId。
 * 入参摘要会截断到 200 字符,避免日志膨胀。
 * @returns {(ctx: any, next: () => Promise<any>) => Promise<any>}
 */
export function logging() {
  return async (ctx, next) => {
    const payloadStr = _safeStringify(ctx.payload)
    ctx.logger.info(
      `[ipc][${ctx.channel}] >> trace=${ctx.traceId} payload=${_truncate(payloadStr, 200)}`
    )
    await next()
    const status = ctx.response?.ok ? 'ok' : `fail(${ctx.response?.error?.code || '?'})`
    ctx.logger.info(`[ipc][${ctx.channel}] << trace=${ctx.traceId} status=${status}`)
  }
}

function _safeStringify(v) {
  if (v === undefined) return 'undefined'
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function _truncate(s, n) {
  return s.length > n ? s.slice(0, n) + `...(+${s.length - n})` : s
}
