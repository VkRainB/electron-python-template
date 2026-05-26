<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, RouterLink, RouterView } from 'vue-router'
import {
  Home,
  LayoutGrid,
  Settings,
  HelpCircle,
  PanelLeft,
  Plus
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import WorkspaceSwitcher from '@/components/common/WorkspaceSwitcher.vue'

const route = useRoute()
const appStore = useAppStore()
const { sidebarCollapsed } = storeToRefs(appStore)

const nav = [
  { to: '/home', label: '首页', icon: Home },
  { to: '/app', label: '应用', icon: LayoutGrid },
  { to: '/settings', label: '设置', icon: Settings }
]

const isActive = (to) => computed(() => route.path === to || route.path.startsWith(to + '/'))
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-background text-foreground">
    <!-- Sidebar -->
    <aside
      v-if="!sidebarCollapsed"
      class="flex w-[260px] shrink-0 flex-col border-r border-border bg-card"
    >
      <!-- Brand -->
      <div class="flex items-center gap-2 px-3 pt-3 pb-2">
        <WorkspaceSwitcher />
        <button
          type="button"
          aria-label="收起侧栏"
          title="收起侧栏"
          class="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          @click="appStore.toggleSidebar()"
        >
          <PanelLeft class="size-4" />
        </button>
      </div>

      <!-- Main nav -->
      <nav class="flex flex-col gap-0.5 px-3 py-2">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="group flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors"
          :class="
            isActive(item.to).value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground/80 hover:bg-accent hover:text-foreground'
          "
        >
          <component :is="item.icon" class="size-4 shrink-0" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Folders section -->
      <div class="px-3 pt-3 pb-2">
        <div class="flex items-center justify-between px-2 py-1.5">
          <span class="text-xs font-medium text-muted-foreground">文件夹 (0)</span>
          <button
            type="button"
            aria-label="新建文件夹"
            class="grid size-5 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus class="size-3.5" />
          </button>
        </div>
        <div class="px-2 py-2 text-xs text-muted-foreground/70">
          <!-- 空状态 -->
        </div>
      </div>

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Help footer -->
      <div class="border-t border-border px-3 py-3">
        <button
          type="button"
          class="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <HelpCircle class="size-4" />
          <span>帮助与支持</span>
        </button>
      </div>
    </aside>

    <!-- Main column (topbar + content) -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Topbar:仅在 sidebar 折叠时显示,提供展开入口 -->
      <header
        v-if="sidebarCollapsed"
        class="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-3"
      >
        <button
          type="button"
          aria-label="展开侧栏"
          title="展开侧栏"
          class="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          @click="appStore.toggleSidebar()"
        >
          <PanelLeft class="size-4" />
        </button>
      </header>

      <!-- Main scroll area -->
      <main class="flex-1 overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
