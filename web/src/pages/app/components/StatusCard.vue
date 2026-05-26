<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  meta: { type: String, default: '' },
  state: {
    type: String,
    default: 'idle',
    validator: (v) => ['ok', 'pending', 'idle'].includes(v)
  },
  mono: { type: Boolean, default: false }
})

const dotClass = {
  ok: 'bg-emerald-500',
  pending: 'bg-amber-500',
  idle: 'bg-zinc-300'
}
</script>

<template>
  <div class="rounded-lg border border-border bg-card p-4">
    <div
      class="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
    >
      <span class="size-2 rounded-full" :class="dotClass[state]"></span>
      {{ label }}
    </div>
    <div class="mt-2 truncate text-base font-semibold" :class="{ 'font-mono text-sm': mono }">
      {{ value }}
    </div>
    <div v-if="meta" class="mt-1 text-xs text-muted-foreground">{{ meta }}</div>
  </div>
</template>
