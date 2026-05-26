import { Logger } from '../logger/logger.js'
import { getContainer } from './core/container.js'
import { IpcRouter } from './core/ipc-router.js'
import { errorBoundary } from './core/middlewares/error-boundary.js'
import { logging } from './core/middlewares/logging.js'
import { timing } from './core/middlewares/timing.js'
import { metrics } from './core/middlewares/metrics.js'
import { validate } from './core/middlewares/validate.js'

import allModules from './modules/index.js'

import { getBridgeManager } from '../services/python/electron-bridge/index.js'

/**
 * 一站式 IPC 装配:注册依赖、构建中间件管道、加载所有业务模块。
 * 模块通过 modules/index.js 的 import.meta.glob 自动发现。
 *
 * @param {{ pythonService: import('../services/python-service.js').PythonService }} deps
 * @returns {IpcRouter}
 */
export function setupIpc({ pythonService }) {
  const logger = Logger.getInstance()
  const container = getContainer()

  container.register('python', pythonService)
  container.register('bridge', () => getBridgeManager())
  container.register('logger', logger)

  const router = new IpcRouter({ container, logger })

  // 中间件顺序(洋葱模型最外 → 最内):
  // error-boundary → logging → timing → metrics → validate → handler
  router.use(errorBoundary()).use(logging()).use(timing()).use(metrics()).use(validate())

  router.registerAll(allModules)

  logger.info(
    `[ipc] all modules ready, modules=${allModules.length} channels=${router.listChannels().length}`
  )
  return router
}
