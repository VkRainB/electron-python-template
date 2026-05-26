<script setup>
defineProps({
  label: { type: String, required: true }
})
</script>

<template>
  <div class="flex min-h-[48px] items-center justify-between gap-4 py-3">
    <span class="text-base text-foreground/80">{{ label }}</span>
    <div class="flex items-center gap-3 text-base text-foreground">
      <slot />
    </div>
  </div>
</template>
