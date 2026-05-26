<script setup>
import Lottie from '@/components/common/Lottie.vue'
import welcomeOrbit from '@/assets/lottie/welcome-orbit.json'

defineProps({
  step: { type: Number, default: 0 },
  title: { type: String, required: true },
  appName: { type: String, required: true },
  subtitle: { type: String, default: '' },
  hint: { type: String, default: '' }
})

const lottieParams = {
  animationData: welcomeOrbit,
  loop: true,
  autoplay: true,
  renderer: 'svg'
}
</script>

<template>
  <div
    class="flex min-h-full flex-col items-center justify-center px-8 transition-opacity duration-700"
    :class="step >= 1 ? 'opacity-100' : 'opacity-0'"
  >
    <!-- Lottie Logo -->
    <div
      class="relative mb-10 transition-all duration-700 ease-out"
      :class="step >= 2 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'"
    >
      <span class="absolute inset-0 rounded-full bg-primary/25 blur-3xl" aria-hidden="true"></span>
      <Lottie :params="lottieParams" :width="180" :height="180" class="relative" />
    </div>

    <!-- Title -->
    <div
      class="space-y-1 text-center transition-all duration-700 ease-out"
      :class="step >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'"
    >
      <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {{ title }}
      </p>
      <h1 class="text-5xl font-light tracking-tight text-foreground">
        {{ appName }}
      </h1>
    </div>

    <!-- Subtitle -->
    <p
      class="mt-5 max-w-md text-center text-sm text-muted-foreground transition-all duration-700 ease-out"
      :class="step >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'"
    >
      {{ subtitle }}
    </p>

    <!-- Hint -->
    <div
      class="mt-12 transition-all duration-700 ease-out"
      :class="step >= 5 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'"
    >
      <span
        class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
      >
        <span class="size-1.5 animate-pulse rounded-full bg-primary"></span>
        {{ hint }}
      </span>
    </div>
  </div>
</template>
