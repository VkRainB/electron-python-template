/**
 * 耗时统计:把 durationMs 写入 ctx.response.meta,并通知 metrics 中间件。
 * @returns {(ctx: any, next: () => Promise<any>) => Promise<any>}
 */
export function timing() {
  return async (ctx, next) => {
    const t0 = Date.now()
    await next()
    const durationMs = Date.now() - t0
    ctx.durationMs = durationMs
    if (ctx.response && typeof ctx.response === 'object') {
      ctx.response.meta = { ...(ctx.response.meta || {}), traceId: ctx.traceId, durationMs }
    }
  }
}
