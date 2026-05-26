import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'app:store-theme'
const VALID_MODES = ['light', 'dark', 'system']

function systemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDark(isDark) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark)
}

export const useThemeStore = defineStore(
  'theme',
  () => {
    const mode = ref('system')
    const systemDark = ref(systemPrefersDark())

    const isDark = computed(() => {
      if (mode.value === 'dark') return true
      if (mode.value === 'light') return false
      return systemDark.value
    })

    watch(isDark, (val) => applyDark(val), { immediate: true })

    function setMode(val) {
      if (VALID_MODES.includes(val)) {
        mode.value = val
      }
    }

    return {
      mode,
      isDark,
      setMode
    }
  },
  {
    persist: {
      key: STORAGE_KEY,
      pick: ['mode']
    }
  }
)
