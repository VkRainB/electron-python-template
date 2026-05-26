<script setup>
import { ref } from 'vue'
import { Send, Info as InfoIcon, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineProps({
  isLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['echo', 'info', 'missing'])

const input = ref('hello from vue')
const triggerEcho = () => emit('echo', input.value)
</script>

<template>
  <section class="rounded-lg border border-border bg-card">
    <header class="border-b border-border px-5 py-4">
      <h2 class="text-base font-semibold">Try a Bridge Call</h2>
      <p class="mt-0.5 text-xs text-muted-foreground">
        把消息发到 Python presenter,验证 HTTP → presenter dispatch → 响应回路。
      </p>
    </header>
    <div class="space-y-4 p-5">
      <label class="block space-y-1.5">
        <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Payload
        </span>
        <input
          v-model="input"
          type="text"
          spellcheck="false"
          placeholder="输入要回显的字符串"
          class="h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          @keydown.enter="triggerEcho"
        />
      </label>
      <div class="flex flex-wrap items-center gap-2">
        <Button :disabled="isLoading" @click="triggerEcho">
          <Send class="size-4" />
          <span>{{ isLoading ? 'Calling...' : 'Call echo' }}</span>
        </Button>
        <Button variant="secondary" :disabled="isLoading" @click="emit('info')">
          <InfoIcon class="size-4" />
          <span>Call info()</span>
        </Button>
        <Button variant="ghost" :disabled="isLoading" @click="emit('missing')">
          <X class="size-4" />
          <span>Call missing</span>
        </Button>
      </div>
    </div>
  </section>
</template>
