<script setup>
import { computed } from 'vue'
import { Switch } from '@/components/ui/switch'
import SettingsSection from './SettingsSection.vue'
import SettingsRow from './SettingsRow.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
</script>

<template>
  <SettingsSection
    title="允许局域网访问"
    description="允许局域网内的其他设备访问本应用"
  >
    <SettingsRow label="启用">
      <Switch v-model="value" />
    </SettingsRow>
    <p class="border-t border-border/50 py-3 text-xs text-muted-foreground">
      切换后需要重启应用生效。开启后后端服务将监听 0.0.0.0 而非 127.0.0.1。
    </p>
  </SettingsSection>
</template>
