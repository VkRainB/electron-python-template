<script setup>
import StatusCard from './components/StatusCard.vue'
import BridgeCallPanel from './components/BridgeCallPanel.vue'
import CallResultPanel from './components/CallResultPanel.vue'
import { useBridge } from './composables/useBridge'

const {
  pythonReady,
  bridgeConnected,
  backendUrl,
  initialMessage,
  lastCall,
  isLoading,
  bridgeStatus,
  bridgeState,
  callBridge
} = useBridge()
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6 px-10 py-8">
    <header class="space-y-1">
      <h1 class="text-xl font-semibold tracking-tight">应用 · Python Bridge</h1>
      <p class="text-sm text-muted-foreground">
        Vue 3 渲染层 ↔ FastAPI 后端 · 三通道复合通信
      </p>
    </header>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <StatusCard
        label="Python Service"
        :value="pythonReady ? 'Ready' : 'Starting'"
        meta="spawn + daemon"
        :state="pythonReady ? 'ok' : 'pending'"
      />
      <StatusCard
        label="WebSocket Bridge"
        :value="bridgeStatus"
        meta="/ws/electron"
        :state="bridgeState"
      />
      <StatusCard
        label="Backend URL"
        :value="backendUrl || '—'"
        meta="HTTP /api/bridge"
        mono
      />
    </div>

    <BridgeCallPanel
      :is-loading="isLoading"
      @echo="(payload) => callBridge('echoPresenter', 'echo', [payload], 'echoPresenter.echo')"
      @info="callBridge('echoPresenter', 'info', [], 'echoPresenter.info')"
      @missing="callBridge('missing', 'x', [], 'missing.x')"
    />

    <CallResultPanel :result="lastCall" :fallback="initialMessage" />
  </div>
</template>
