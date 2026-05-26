<script setup>
import SettingsSection from './SettingsSection.vue'
import SettingsRow from './SettingsRow.vue'
import ThemeSwitcher from '@/components/common/ThemeSwitcher.vue'
</script>

<template>
  <SettingsSection title="外观" description="主题模式与显示偏好">
    <SettingsRow label="主题">
      <ThemeSwitcher />
    </SettingsRow>
  </SettingsSection>
</template>
