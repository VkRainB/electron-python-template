/**
 * koa-compose 风格的中间件管道。
 * 中间件签名:async (ctx, next) => any
 * @param {Array<(ctx: any, next: () => Promise<any>) => any>} middlewares
 * @returns {(ctx: any, finalHandler?: (ctx: any) => any) => Promise<any>}
 */
export function compose(middlewares) {
  if (!Array.isArray(middlewares)) throw new TypeError('middlewares must be an array')
  for (const fn of middlewares) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function')
  }

  return function (ctx, finalHandler) {
    let index = -1
    return dispatch(0)
    function dispatch(i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      const fn = i === middlewares.length ? finalHandler : middlewares[i]
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(ctx, () => dispatch(i + 1)))
      } catch (e) {
        return Promise.reject(e)
      }
    }
  }
}
