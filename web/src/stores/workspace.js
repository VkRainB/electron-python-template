import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const PRESET_COLORS = [
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444'
]

const DEFAULT_WORKSPACES = [
  {
    id: 'default',
    name: 'MomoPy',
    color: PRESET_COLORS[0],
    location: '',
    description: '',
    createdAt: Date.now()
  }
]

export const useWorkspaceStore = defineStore(
  'workspace',
  () => {
    const workspaces = ref(DEFAULT_WORKSPACES.slice())
    const currentId = ref(workspaces.value[0]?.id ?? null)

    const current = computed(
      () => workspaces.value.find((w) => w.id === currentId.value) ?? workspaces.value[0] ?? null
    )

    function addWorkspace(data) {
      const ws = {
        id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: (data.name || '').trim(),
        color: data.color || PRESET_COLORS[0],
        location: (data.location || '').trim(),
        description: (data.description || '').trim(),
        createdAt: Date.now()
      }
      workspaces.value.push(ws)
      currentId.value = ws.id
      return ws
    }

    function setCurrent(id) {
      if (workspaces.value.some((w) => w.id === id)) {
        currentId.value = id
      }
    }

    return {
      workspaces,
      currentId,
      current,
      addWorkspace,
      setCurrent
    }
  },
  {
    persist: {
      key: 'app:store-workspace',
      pick: ['workspaces', 'currentId']
    }
  }
)
