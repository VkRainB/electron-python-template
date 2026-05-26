/**
 * 自动扫描 ./**\/*.module.js,聚合所有模块清单。
 *
 * 新增模块的方式:在 modules/<域>/ 下创建 xxx.module.js 即可,无需在此手动 import。
 * Vite 在编译期把 glob 解析为静态 import 数组,运行时零开销。
 *
 * 子目录建议按业务域组织(如 python/、system/),域内可放共享 schemas.js / helpers.js。
 */
const modules = import.meta.glob('./**/*.module.js', { eager: true })

/**
 * @type {import('../core/ipc-router.js').IpcModule[]}
 */
export default Object.values(modules)
  .map((m) => m.default)
  .filter(Boolean)
