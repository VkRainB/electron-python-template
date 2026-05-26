<script setup>
import WelcomeBanner from './components/WelcomeBanner.vue'
import { useWelcomeAnimation } from './composables/useWelcomeAnimation'
import { APP_NAME, WELCOME_TITLE, WELCOME_SUBTITLE, WELCOME_HINT } from './utils'

const { step } = useWelcomeAnimation()
</script>

<template>
  <div class="relative h-full overflow-hidden">
    <!-- Gradient mesh backdrop (DESIGN.md 信号色) -->
    <div class="pointer-events-none absolute inset-0 -z-10">
      <div
        class="absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      ></div>
      <div
        class="absolute bottom-0 right-1/4 size-[360px] rounded-full bg-fuchsia-300/20 blur-3xl"
      ></div>
      <div
        class="absolute bottom-1/4 left-1/4 size-[300px] rounded-full bg-amber-200/20 blur-3xl"
      ></div>
    </div>

    <WelcomeBanner
      :step="step"
      :title="WELCOME_TITLE"
      :app-name="APP_NAME"
      :subtitle="WELCOME_SUBTITLE"
      :hint="WELCOME_HINT"
    />
  </div>
</template>
