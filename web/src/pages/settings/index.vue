<script setup>
import { storeToRefs } from 'pinia'
import VersionInfo from './components/VersionInfo.vue'
import ServiceHealth from './components/ServiceHealth.vue'
import LanAccessToggle from './components/LanAccessToggle.vue'
import AppearanceSection from './components/AppearanceSection.vue'
import { useSystemInfo } from './composables/useSystemInfo'
import { useServiceHealth } from './composables/useServiceHealth'
import { useAppStore } from '@/stores/app'

const { appVersion, serviceVersion, loadServiceVersion } = useSystemInfo()
const { healthy, latencyMs, lastCheck, wsConnected, isChecking, check } =
  useServiceHealth({ autoRefreshMs: 30_000 })

const appStore = useAppStore()
const { lanAccessEnabled } = storeToRefs(appStore)

function refresh() {
  check()
  loadServiceVersion()
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-8 px-10 py-8">
    <header class="space-y-1">
      <h1 class="text-xl font-semibold tracking-tight">设置</h1>
    </header>

    <AppearanceSection />

    <VersionInfo :app-version="appVersion" :service-version="serviceVersion" />

    <ServiceHealth
      :healthy="healthy"
      :latency-ms="latencyMs"
      :last-check="lastCheck"
      :ws-connected="wsConnected"
      :is-checking="isChecking"
      @refresh="refresh"
    />

    <LanAccessToggle v-model="lanAccessEnabled" />
  </div>
</template>
