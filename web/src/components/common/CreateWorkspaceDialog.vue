<script setup>
import { ref, computed } from 'vue'
import { X, MoreVertical } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useWorkspaceStore, PRESET_COLORS } from '@/stores/workspace'
import * as dialogApi from '@/api/ipc/dialog'

defineProps({
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['update:open'])

const store = useWorkspaceStore()

const name = ref('')
const color = ref(PRESET_COLORS[0])
const location = ref('')
const description = ref('')

const canSubmit = computed(() => name.value.trim().length > 0)

function reset() {
  name.value = ''
  color.value = PRESET_COLORS[0]
  location.value = ''
  description.value = ''
}

function close() {
  emit('update:open', false)
}

function submit() {
  if (!canSubmit.value) return
  store.addWorkspace({
    name: name.value,
    color: color.value,
    location: location.value,
    description: description.value
  })
  reset()
  close()
}

async function pickLocation() {
  const resp = await dialogApi.selectDirectory({
    title: '选择工作空间位置'
  })
  if (resp?.ok && !resp.data?.canceled && resp.data?.path) {
    location.value = resp.data.path
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="
      (v) => {
        emit('update:open', v)
        if (!v) reset()
      }
    "
  >
    <DialogContent class="sm:max-w-[480px]" :show-close-button="false">
      <DialogHeader>
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <DialogTitle>创建工作空间</DialogTitle>
            <DialogDescription> 创建一个新的工作空间,你的资源都汇总到这里 </DialogDescription>
          </div>
          <button
            type="button"
            aria-label="关闭"
            class="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            @click="close"
          >
            <X class="size-4" />
          </button>
        </div>
      </DialogHeader>

      <!-- 名称 + 颜色 -->
      <div class="space-y-2">
        <Label for="ws-name">空间名称</Label>
        <div class="flex items-center gap-3">
          <Input
            id="ws-name"
            v-model="name"
            placeholder="请输入工作空间名称"
            class="flex-1"
            @keydown.enter="submit"
          />
          <Popover>
            <PopoverTrigger as-child>
              <button
                type="button"
                aria-label="选择颜色"
                class="size-9 shrink-0 cursor-pointer rounded-full shadow-sm transition-transform hover:scale-105"
                :style="{ backgroundColor: color }"
              ></button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-3" align="end">
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="c in PRESET_COLORS"
                  :key="c"
                  type="button"
                  :aria-label="c"
                  class="size-8 cursor-pointer rounded-full transition-transform hover:scale-110"
                  :class="c === color ? 'ring-2 ring-offset-2 ring-offset-background' : ''"
                  :style="
                    c === color
                      ? { backgroundColor: c, '--tw-ring-color': c }
                      : { backgroundColor: c }
                  "
                  @click="color = c"
                ></button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <!-- 存放位置 -->
      <div class="space-y-2">
        <Label for="ws-location">存放位置</Label>
        <div class="flex items-center gap-2">
          <Input
            id="ws-location"
            v-model="location"
            placeholder="设置空间所在文件夹"
            readonly
            class="flex-1 cursor-pointer"
            @click="pickLocation"
          />
          <button
            type="button"
            aria-label="选择文件夹"
            class="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            @click="pickLocation"
          >
            <MoreVertical class="size-4" />
          </button>
        </div>
      </div>

      <!-- 描述 -->
      <div class="space-y-2">
        <Label for="ws-desc">描述</Label>
        <Textarea
          id="ws-desc"
          v-model="description"
          placeholder="输入描述"
          class="min-h-[80px] resize-none"
        />
      </div>

      <!-- 创建按钮 -->
      <Button :disabled="!canSubmit" size="lg" class="mt-2 w-full" @click="submit"> 创建 </Button>
    </DialogContent>
  </Dialog>
</template>
