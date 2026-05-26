import { createRequire } from 'node:module'

import { compose } from './compose.js'
import { createContext } from './ipc-context.js'
import { ok, isResponse } from './ipc-response.js'
import { IpcError, ErrorCode } from './ipc-error.js'

const _nodeRequire = createRequire(import.meta.url)
const { ipcMain } = _nodeRequire('electron')

/**
 * @typedef {object} HandlerSpec
 * @property {string} channel              频道名(任意字符串)
 * @property {import('zod').ZodType} [schema] 参数 schema
 * @property {string[]} [deps]             声明依赖,自动从容器注入到 handler 第二参
 * @property {(ctx: import('./ipc-context.js').IpcContext, deps: Record<string, any>) => any} handler
 */

/**
 * @typedef {object} IpcModule
 * @property {string} name
 * @property {HandlerSpec[]} handlers
 */

/**
 * IPC 路由器:统一注册、卸载、中间件管道、容器注入。
 */
export class IpcRouter {
  /**
   * @param {object} args
   * @param {import('./container.js').Container} args.container
   * @param {any} args.logger
   */
  constructor({ container, logger }) {
    this.container = container
    this.logger = logger
    /** @type {Array<(ctx: any, next: () => Promise<any>) => any>} */
    this._middlewares = []
    /** @type {Map<string, HandlerSpec>} */
    this._handlers = new Map()
    /** @type {Set<string>} 已 ipcMain.handle 注册的 channel(便于 unregister) */
    this._registered = new Set()
  }

  /** @param {(ctx: any, next: () => Promise<any>) => any} mw */
  use(mw) {
    if (typeof mw !== 'function') throw new TypeError('middleware must be a function')
    this._middlewares.push(mw)
    return this
  }

  /** @param {IpcModule} mod */
  register(mod) {
    if (!mod || !Array.isArray(mod.handlers)) {
      throw new TypeError(`[IpcRouter] invalid module: ${mod?.name || '?'}`)
    }
    for (const spec of mod.handlers) {
      this._registerOne(mod.name, spec)
    }
    this.logger.info(
      `[IpcRouter] module "${mod.name}" registered (${mod.handlers.length} handlers)`
    )
  }

  /** @param {IpcModule[]} mods */
  registerAll(mods) {
    for (const m of mods) this.register(m)
  }

  _registerOne(moduleName, spec) {
    const { channel, handler, schema, deps = [] } = spec
    if (!channel) throw new Error(`[IpcRouter] handler in module "${moduleName}" missing channel`)
    if (typeof handler !== 'function') {
      throw new Error(`[IpcRouter] handler for "${channel}" must be a function`)
    }
    if (this._handlers.has(channel)) {
      throw new Error(`[IpcRouter] duplicate handler for "${channel}"`)
    }
    // 校验依赖在容器中可解析(早失败)
    for (const k of deps) {
      if (!this.container.has(k)) {
        throw new IpcError(
          ErrorCode.DEPENDENCY_MISSING,
          `dependency "${k}" required by "${channel}" not registered`
        )
      }
    }
    this._handlers.set(channel, spec)

    const pipeline = compose(this._middlewares)
    ipcMain.handle(channel, async (event, payload) => {
      const ctx = createContext({
        channel,
        payload,
        event,
        deps: this.container.resolveMany(deps),
        logger: this.logger
      })
      // 把模块级 schema 传给 validate 中间件读取
      ctx._schema = schema

      await pipeline(ctx, async (c) => {
        const result = await handler(c, c.deps)
        // 若 handler 自己返回了响应壳就直接用,否则自动包装
        c.response = isResponse(result) ? result : ok(result)
      })
      return ctx.response
    })
    this._registered.add(channel)
  }

  /** 卸载所有 ipcMain handler(测试/热重载用) */
  unregisterAll() {
    for (const ch of this._registered) ipcMain.removeHandler(ch)
    this._registered.clear()
    this._handlers.clear()
  }

  /** @returns {string[]} */
  listChannels() {
    return [...this._handlers.keys()]
  }
}
