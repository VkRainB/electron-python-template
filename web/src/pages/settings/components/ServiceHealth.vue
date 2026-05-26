<script setup>
import { computed } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SettingsSection from './SettingsSection.vue'
import SettingsRow from './SettingsRow.vue'
import { formatTime, formatLatency } from '../utils'

const props = defineProps({
  healthy: { type: Boolean, default: false },
  latencyMs: { type: Number, default: 0 },
  lastCheck: { type: Date, default: null },
  wsConnected: { type: Boolean, default: false },
  isChecking: { type: Boolean, default: false }
})

defineEmits(['refresh'])

const checked = computed(() => props.lastCheck instanceof Date)

const healthDotClass = computed(() => {
  if (!checked.value) return 'bg-zinc-300'
  return props.healthy ? 'bg-emerald-500' : 'bg-red-500'
})

const healthTextClass = computed(() => {
  if (!checked.value) return 'text-muted-foreground'
  return props.healthy ? 'text-emerald-600' : 'text-red-600'
})

const healthText = computed(() => {
  if (!checked.value) return '检测中…'
  return props.healthy ? '正常' : '异常'
})
</script>

<template>
  <SettingsSection title="服务状态" description="后端服务健康状态监控">
    <SettingsRow label="健康状态">
      <span class="flex items-center gap-1.5">
        <span class="size-2 rounded-full" :class="healthDotClass"></span>
        <span :class="healthTextClass">{{ healthText }}</span>
      </span>
      <Button
        variant="outline"
        size="sm"
        :disabled="isChecking"
        @click="$emit('refresh')"
      >
        <RefreshCw class="size-3.5" :class="{ 'animate-spin': isChecking }" />
        刷新
      </Button>
    </SettingsRow>
    <SettingsRow label="响应延迟">{{ formatLatency(latencyMs) }}</SettingsRow>
    <SettingsRow label="WS Bridge">
      <span class="flex items-center gap-1.5">
        <span
          class="size-2 rounded-full"
          :class="wsConnected ? 'bg-emerald-500' : 'bg-zinc-300'"
        ></span>
        <span :class="wsConnected ? 'text-emerald-600' : 'text-muted-foreground'">
          {{ wsConnected ? '在线' : '离线' }}
        </span>
      </span>
    </SettingsRow>
    <SettingsRow label="上次检查">
      {{ lastCheck ? formatTime(lastCheck) : '-' }}
    </SettingsRow>
  </SettingsSection>
</template>
