import { fail } from '../ipc-response.js'
import { ErrorCode } from '../ipc-error.js'

/**
 * zod schema 校验中间件。
 * 校验失败时短路链路,直接写 fail 响应(用户已确认:不抛异常)。
 *
 * 注:每个 handler 自己声明 schema 在 register 时由 router 注入到 ctx._schema。
 * 这里只负责读取并执行。
 * @returns {(ctx: any, next: () => Promise<any>) => Promise<any>}
 */
export function validate() {
  return async (ctx, next) => {
    const schema = ctx._schema
    if (!schema) {
      await next()
      return
    }
    const result = schema.safeParse(ctx.payload)
    if (!result.success) {
      const issues = result.error?.issues || []
      ctx.response = fail(
        ErrorCode.VALIDATION_FAILED,
        'payload validation failed',
        issues.map((i) => ({ path: i.path, message: i.message, code: i.code }))
      )
      return
    }
    ctx.validatedPayload = result.data
    await next()
  }
}
