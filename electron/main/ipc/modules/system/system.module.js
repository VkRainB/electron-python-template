import { loadConfig } from '../../../../shared/config.js'

/**
 * @type {import('../core/ipc-router.js').IpcModule}
 */
export default {
  name: 'system',
  handlers: [
    {
      channel: 'system:get-app-info',
      handler: () => {
        const cfg = loadConfig()
        return {
          name: cfg.app.name,
          productName: cfg.app.productName,
          version: cfg.app.version,
          description: cfg.app.description,
          author: cfg.app.author
        }
      }
    }
  ]
}
