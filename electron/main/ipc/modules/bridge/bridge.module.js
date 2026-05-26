import { IpcError } from '../../core/ipc-error.js'

const ENSURE_TIMEOUT_MS = 5000
const POLL_INTERVAL_MS = 100

/**
 * @type {import('../core/ipc-router.js').IpcModule}
 */
export default {
  name: 'bridge',
  handlers: [
    {
      channel: 'bridge:ensure-connection',
      deps: ['bridge'],
      handler: async (_ctx, { bridge }) => {
        if (bridge.getIsConnected()) return { connected: true }
        bridge.connect()
        const deadline = Date.now() + ENSURE_TIMEOUT_MS
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
          if (bridge.getIsConnected()) return { connected: true }
        }
        throw new IpcError(
          'BRIDGE_CONNECT_TIMEOUT',
          `bridge connection timeout (${ENSURE_TIMEOUT_MS}ms)`
        )
      }
    },
    {
      channel: 'bridge:get-status',
      deps: ['bridge'],
      handler: (_ctx, { bridge }) => ({ connected: bridge.getIsConnected() })
    },
    {
      channel: 'bridge:disconnect',
      deps: ['bridge'],
      handler: (_ctx, { bridge }) => {
        bridge.disconnect()
        return { disconnected: true }
      }
    },
    {
      channel: 'bridge:get-stats',
      deps: ['bridge'],
      handler: (_ctx, { bridge }) => bridge.getStats()
    }
  ]
}
