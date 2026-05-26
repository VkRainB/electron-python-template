/**
 * @typedef {object} IpcContext
 * @property {string} channel              频道名
 * @property {any} payload                 原始参数(未校验)
 * @property {any} validatedPayload        schema 校验后的参数(无 schema 时与 payload 相同)
 * @property {import('electron').IpcMainInvokeEvent} event
 * @property {Record<string, any>} deps    依赖注入容器解析出的服务
 * @property {string} traceId              请求追踪 id
 * @property {number} startTime            起始时间戳(ms)
 * @property {import('../../logger/logger.js').Logger} logger
 * @property {any} response                中间件链最终响应(后置中间件可读/改写)
 */

let _counter = 0
function nextTraceId() {
  _counter = (_counter + 1) >>> 0
  return `${Date.now().toString(36)}-${_counter.toString(36)}`
}

/**
 * @param {{channel: string, payload: any, event: any, deps: Record<string, any>, logger: any}} args
 * @returns {IpcContext}
 */
export function createContext({ channel, payload, event, deps, logger }) {
  return {
    channel,
    payload,
    validatedPayload: payload,
    event,
    deps,
    traceId: nextTraceId(),
    startTime: Date.now(),
    logger,
    response: undefined
  }
}
