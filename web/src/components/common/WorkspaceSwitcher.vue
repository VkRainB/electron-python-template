<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Check, ChevronsUpDown, Plus, Gem } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useWorkspaceStore } from '@/stores/workspace'
import CreateWorkspaceDialog from './CreateWorkspaceDialog.vue'

const store = useWorkspaceStore()
const { workspaces, current } = storeToRefs(store)

const createDialogOpen = ref(false)

function openCreate() {
  createDialogOpen.value = true
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="flex flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
      >
        <span
          class="grid h-8 w-8 place-items-center rounded-md text-white"
          :style="{ backgroundColor: current?.color || '#8b5cf6' }"
        >
          <span class="block h-3 w-3 rounded-full border-2 border-white"></span>
        </span>
        <span class="flex flex-1 flex-col items-start leading-tight">
          <span class="text-sm font-semibold">{{ current?.name || 'MomoPy' }}</span>
          <span class="text-[11px] text-muted-foreground">Basic</span>
        </span>
        <ChevronsUpDown class="size-3.5 text-muted-foreground" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" :side-offset="6" class="w-[244px]">
      <DropdownMenuItem
        v-for="ws in workspaces"
        :key="ws.id"
        class="flex items-center gap-2"
        @select="store.setCurrent(ws.id)"
      >
        <span class="size-3 shrink-0 rounded-full" :style="{ backgroundColor: ws.color }"></span>
        <span class="flex-1 truncate">{{ ws.name }}</span>
        <Check v-if="ws.id === current?.id" class="size-4 text-foreground" />
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem class="flex items-center gap-2" @select="openCreate">
        <Plus class="size-4" />
        <span>创建工作空间</span>
      </DropdownMenuItem>
      <DropdownMenuItem class="flex items-center gap-2" disabled>
        <Gem class="size-4" />
        <span>升级 Memo Pro</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <CreateWorkspaceDialog v-model:open="createDialogOpen" />
</template>
