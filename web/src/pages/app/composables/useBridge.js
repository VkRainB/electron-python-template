import { ref, computed, onMounted } from 'vue'
import { pythonBridgeClient, BridgeApiError, BridgeTimeoutError } from '@/services/bridge-client'
import * as pythonApi from '@/api/ipc/python'
import * as bridgeApi from '@/api/ipc/bridge'

/**
 * 封装 Python Bridge 的连接状态与调用逻辑。
 */
export function useBridge() {
  const pythonReady = ref(false)
  const bridgeConnected = ref(false)
  const backendUrl = ref('')
  const initialMessage = ref('初始化中...')
  const lastCall = ref(null)
  const isLoading = ref(false)

  const bridgeStatus = computed(() => {
    if (bridgeConnected.value) return 'Connected'
    if (pythonReady.value) return 'Connecting'
    return 'Idle'
  })

  const bridgeState = computed(() => {
    if (bridgeConnected.value) return 'ok'
    if (pythonReady.value) return 'pending'
    return 'idle'
  })

  onMounted(async () => {
    pythonApi.onReady(() => {
      pythonReady.value = true
    })
    bridgeApi.onConnected(() => (bridgeConnected.value = true))
    bridgeApi.onDisconnected(() => (bridgeConnected.value = false))

    try {
      const urlResp = await pythonApi.getBackendUrl()
      if (urlResp?.ok) backendUrl.value = urlResp.data || ''
      const statusResp = await pythonApi.getStatus()
      if (statusResp?.ok && statusResp.data?.isRunning) pythonReady.value = true
    } catch (e) {
      initialMessage.value = `获取后端地址失败:${e.message}`
    }

    try {
      const r = await bridgeApi.ensureConnection()
      if (r?.ok) {
        bridgeConnected.value = !!r.data?.connected
        if (!r.data?.connected) initialMessage.value = 'WebSocket 未连接'
      } else {
        bridgeConnected.value = false
        initialMessage.value = `WebSocket 未连接:${r?.error?.message || 'unknown'}`
      }
    } catch (e) {
      initialMessage.value = `建立连接失败:${e.message}`
    }
  })

  async function callBridge(presenter, method, args = [], label = '') {
    if (isLoading.value) return
    isLoading.value = true
    const start = Date.now()
    lastCall.value = null
    try {
      const data = await pythonBridgeClient.call(presenter, method, args)
      lastCall.value = {
        ok: true,
        label,
        payload: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
        duration: Date.now() - start
      }
    } catch (e) {
      let msg
      if (e instanceof BridgeTimeoutError) msg = `Timeout: ${e.message}`
      else if (e instanceof BridgeApiError) msg = `[${e.code}] ${e.message}`
      else msg = e.message
      lastCall.value = {
        ok: false,
        label,
        payload: msg,
        duration: Date.now() - start
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    pythonReady,
    bridgeConnected,
    backendUrl,
    initialMessage,
    lastCall,
    isLoading,
    bridgeStatus,
    bridgeState,
    callBridge
  }
}
