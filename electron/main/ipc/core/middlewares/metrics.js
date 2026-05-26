/**
 * 内存级指标采集。提供 getMetrics() 供 system 模块/调试导出。
 *
 * 采集维度(按 channel 聚合):
 *  - calls       请求总数
 *  - success     成功数(ok=true)
 *  - failures    失败数(按 errorCode 拆分)
 *  - durationMs  最近、平均、最大耗时
 */

/**
 * @typedef {object} ChannelMetric
 * @property {number} calls
 * @property {number} success
 * @property {Record<string, number>} failures
 * @property {number} lastDurationMs
 * @property {number} avgDurationMs
 * @property {number} maxDurationMs
 * @property {number} _totalDurationMs
 */

/** @type {Map<string, ChannelMetric>} */
const _metrics = new Map()

function _ensure(channel) {
  let m = _metrics.get(channel)
  if (!m) {
    m = {
      calls: 0,
      success: 0,
      failures: {},
      lastDurationMs: 0,
      avgDurationMs: 0,
      maxDurationMs: 0,
      _totalDurationMs: 0
    }
    _metrics.set(channel, m)
  }
  return m
}

export function metrics() {
  return async (ctx, next) => {
    await next()
    const m = _ensure(ctx.channel)
    m.calls += 1
    const d = ctx.durationMs ?? 0
    m.lastDurationMs = d
    m._totalDurationMs += d
    m.avgDurationMs = Math.round(m._totalDurationMs / m.calls)
    if (d > m.maxDurationMs) m.maxDurationMs = d
    if (ctx.response?.ok) {
      m.success += 1
    } else {
      const code = ctx.response?.error?.code || 'UNKNOWN'
      m.failures[code] = (m.failures[code] || 0) + 1
    }
  }
}

/**
 * 导出当前所有指标的快照(纯数据,可序列化)。
 * @returns {Record<string, Omit<ChannelMetric, '_totalDurationMs'>>}
 */
export function getMetricsSnapshot() {
  /** @type {Record<string, any>} */
  const out = {}
  for (const [channel, m] of _metrics.entries()) {
    // eslint-disable-next-line no-unused-vars
    const { _totalDurationMs, ...pub } = m
    out[channel] = { ...pub, failures: { ...pub.failures } }
  }
  return out
}

/** 测试用 */
export function _resetMetricsForTest() {
  _metrics.clear()
}
