<script setup>
import { storeToRefs } from 'pinia'
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { useThemeStore } from '@/stores/theme'

const store = useThemeStore()
const { mode } = storeToRefs(store)

const options = [
  { value: 'light', label: '亮色', icon: Sun },
  { value: 'dark', label: '暗色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor }
]
</script>

<template>
  <div class="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
      :class="
        mode === opt.value
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      "
      @click="store.setMode(opt.value)"
    >
      <component :is="opt.icon" class="size-3.5" />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>
