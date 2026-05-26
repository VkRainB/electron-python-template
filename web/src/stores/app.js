import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore(
  'app',
  () => {
    const sidebarCollapsed = ref(false)
    const lanAccessEnabled = ref(false)

    function toggleSidebar() {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    return {
      sidebarCollapsed,
      lanAccessEnabled,
      toggleSidebar
    }
  },
  {
    persist: {
      key: 'app:store-app'
    }
  }
)
