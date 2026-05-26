<script setup>
defineProps({
  result: { type: Object, default: null },
  fallback: { type: String, default: '' }
})
</script>

<template>
  <section
    v-if="result || fallback"
    class="overflow-hidden rounded-lg border border-border bg-card"
  >
    <header class="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3">
      <span
        class="rounded border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider"
        :class="
          result?.ok
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
            : result
              ? 'border-red-500/30 bg-red-500/10 text-red-600'
              : 'border-border bg-muted text-muted-foreground'
        "
      >
        {{ result ? (result.ok ? 'SUCCESS' : 'ERROR') : 'INFO' }}
      </span>
      <span class="font-mono text-xs text-muted-foreground">
        {{ result?.label || 'Initialization' }}
      </span>
      <span v-if="result" class="ml-auto font-mono text-xs text-muted-foreground">
        {{ result.duration }}ms
      </span>
    </header>
    <pre
      class="max-h-[320px] overflow-auto whitespace-pre-wrap break-words bg-zinc-950 px-5 py-4 font-mono text-xs leading-relaxed text-zinc-50"
    >{{ result?.payload || fallback }}</pre>
  </section>
</template>
