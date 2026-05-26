import { z } from 'zod'

/**
 * @type {import('../core/ipc-router.js').IpcModule}
 */
export default {
  name: 'python',
  handlers: [
    {
      channel: 'python:get-backend-url',
      deps: ['python'],
      handler: (_ctx, { python }) => python.getBackendBaseUrl()
    },
    {
      channel: 'python:get-status',
      deps: ['python'],
      handler: (_ctx, { python }) => python.getStatus()
    },
    {
      channel: 'python:health-check',
      deps: ['python'],
      handler: async (_ctx, { python }) => await python.healthCheck()
    },
    {
      channel: 'python:restart',
      schema: z.void().optional(),
      deps: ['python'],
      handler: async (_ctx, { python }) => {
        await python.restart()
        return { restarted: true }
      }
    },
    {
      channel: 'python:is-daemon-mode',
      deps: ['python'],
      handler: (_ctx, { python }) => ({ enabled: python.isDaemonModeEnabled() })
    }
  ]
}
