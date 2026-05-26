<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' }
})
</script>

<template>
  <section class="space-y-3">
    <header class="flex items-baseline gap-2 px-1">
      <h2 class="text-sm font-medium text-muted-foreground">{{ title }}</h2>
      <span v-if="description" class="text-xs text-muted-foreground/70">
        ({{ description }})
      </span>
    </header>
    <div class="rounded-lg border border-border bg-card px-6 py-2">
      <slot />
    </div>
  </section>
</template>
