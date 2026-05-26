<script setup>
import SettingsSection from './SettingsSection.vue'
import SettingsRow from './SettingsRow.vue'

defineProps({
  appVersion: { type: String, default: '-' },
  serviceVersion: { type: String, default: '-' }
})
</script>

<template>
  <SettingsSection title="版本信息">
    <SettingsRow label="应用版本号">{{ appVersion }}</SettingsRow>
    <SettingsRow label="服务版本号">{{ serviceVersion }}</SettingsRow>
  </SettingsSection>
</template>
