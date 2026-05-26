/**
 * 轻量依赖注入容器。
 * 支持直接值与工厂函数(单例懒加载)。
 */
export class Container {
  constructor() {
    /** @type {Map<string, {factory?: Function, value?: any, instance?: any}>} */
    this._registry = new Map()
  }

  /**
   * @param {string} key
   * @param {any | (() => any)} valueOrFactory 函数视为工厂(懒加载),其它视为直接值
   */
  register(key, valueOrFactory) {
    if (typeof valueOrFactory === 'function') {
      this._registry.set(key, { factory: valueOrFactory })
    } else {
      this._registry.set(key, { value: valueOrFactory })
    }
    return this
  }

  has(key) {
    return this._registry.has(key)
  }

  /** @param {string} key */
  resolve(key) {
    const entry = this._registry.get(key)
    if (!entry) throw new Error(`[Container] dependency "${key}" not registered`)
    if ('value' in entry) return entry.value
    if (entry.instance === undefined) entry.instance = entry.factory()
    return entry.instance
  }

  /**
   * 批量解析,返回 { key: instance } 形状。
   * @param {string[]} keys
   */
  resolveMany(keys = []) {
    const out = {}
    for (const k of keys) out[k] = this.resolve(k)
    return out
  }

  clear() {
    this._registry.clear()
  }
}

const _default = new Container()
export function getContainer() {
  return _default
}
