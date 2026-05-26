import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as pythonApi from '@/api/ipc/python'
import * as bridgeApi from '@/api/ipc/bridge'

/**
 * 后端健康监控。
 * - check():手动触发一次
 * - 可选 autoRefreshMs 周期轮询
 */
export function useServiceHealth({ autoRefreshMs = 0 } = {}) {
  const healthy = ref(false)
  const latencyMs = ref(0)
  const lastCheck = ref(null)
  const wsConnected = ref(false)
  const isChecking = ref(false)

  let timer = null

  async function check() {
    if (isChecking.value) return
    isChecking.value = true
    try {
      const resp = await pythonApi.healthCheck()
      const data = resp?.ok ? resp.data : null
      healthy.value = !!data?.success
      latencyMs.value = data?.latencyMs ?? 0
      lastCheck.value = new Date()

      try {
        const statusResp = await bridgeApi.getStatus()
        wsConnected.value = !!(statusResp?.ok && statusResp.data?.connected)
      } catch {
        wsConnected.value = false
      }
    } catch {
      healthy.value = false
      lastCheck.value = new Date()
    } finally {
      isChecking.value = false
    }
  }

  onMounted(() => {
    check()
    if (autoRefreshMs > 0) {
      timer = setInterval(check, autoRefreshMs)
    }
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })

  return { healthy, latencyMs, lastCheck, wsConnected, isChecking, check }
}
