import { ref, onMounted } from 'vue'
import axios from 'axios'
import * as systemApi from '@/api/ipc/system'
import * as pythonApi from '@/api/ipc/python'

/**
 * 加载应用版本(主进程 IPC)与服务版本(Python /version)。
 */
export function useSystemInfo() {
  const appVersion = ref('-')
  const serviceVersion = ref('-')
  const error = ref(null)

  async function loadAppInfo() {
    try {
      const resp = await systemApi.getAppInfo()
      if (resp?.ok) {
        appVersion.value = resp.data?.version || '-'
      } else if (resp?.error) {
        error.value = resp.error.message
      }
    } catch (e) {
      error.value = e.message
    }
  }

  async function loadServiceVersion() {
    try {
      const resp = await pythonApi.getBackendUrl()
      if (!resp?.ok) {
        serviceVersion.value = '-'
        return
      }
      const baseUrl = resp.data
      const { data } = await axios.get(`${baseUrl}/version`, { timeout: 3000 })
      serviceVersion.value = data?.version || '-'
    } catch {
      serviceVersion.value = '-'
    }
  }

  onMounted(() => {
    loadAppInfo()
    loadServiceVersion()
  })

  return { appVersion, serviceVersion, error, loadAppInfo, loadServiceVersion }
}
