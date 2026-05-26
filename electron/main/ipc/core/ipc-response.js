/**
 * 统一响应壳。
 * 成功:{ ok: true, data, meta? }
 * 失败:{ ok: false, error: { code, message, details? }, meta? }
 */

/**
 * @param {any} data
 * @param {object} [meta]
 */
export function ok(data, meta) {
  const r = { ok: true, data }
  if (meta) r.meta = meta
  return r
}

/**
 * @param {string} code
 * @param {string} message
 * @param {any} [details]
 * @param {object} [meta]
 */
export function fail(code, message, details, meta) {
  /** @type {{code: string, message: string, details?: any}} */
  const error = { code, message }
  if (details !== undefined) error.details = details
  const r = { ok: false, error }
  if (meta) r.meta = meta
  return r
}

/** 判断对象是否已经是统一响应壳 */
export function isResponse(v) {
  return v != null && typeof v === 'object' && typeof v.ok === 'boolean'
}
