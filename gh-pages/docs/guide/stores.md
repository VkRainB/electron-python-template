# 状态管理

模板用 Pinia 3 + `pinia-plugin-persistedstate` + 组合式风格。每个 store 自治、按业务域拆分。

## 现有 store

| store | 文件 | 关注点 |
| --- | --- | --- |
| `app` | `stores/app.js` | 侧边栏折叠、局域网开关等全局开关 |
| `theme` | `stores/theme.js` | 主题模式（light / dark / system） |
| `workspace` | `stores/workspace.js` | 当前工作区、最近文件 |

## 共同约定

### 持久化键统一前缀

各 store 通过 `persist` 配置声明自己的 key：

| store | persist key |
| --- | --- |
| `app` | `app:store-app` |
| `theme` | `app:store-theme` |
| `workspace` | `app:store-workspace` |

所有 key 以 `app:store-` 起头，方便清缓存与排查。持久化由 `pinia-plugin-persistedstate` 自动管理。

### 用 persist 配置自动持久化

模板通过 `pinia-plugin-persistedstate` 实现持久化，不需要手动读写 localStorage：

```js
export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  // ...
  return { sidebarCollapsed, /* ... */ }
}, {
  persist: { key: 'app:store-app' }
})
```

组件不需要显式 `save()`，状态变更自动同步到 localStorage。`stores/index.js` 创建 Pinia 实例并注册持久化插件。

## theme store 详解

主题处理两个场景：用户手动选择 vs 系统跟随。

```js
const STORAGE_KEY = 'app:store-theme'
const VALID_MODES = ['light', 'dark', 'system']

export const useThemeStore = defineStore('theme', () => {
  const mode = ref('system')
  const systemDark = ref(systemPrefersDark())

  const isDark = computed(() => {
    if (mode.value === 'dark') return true
    if (mode.value === 'light') return false
    return systemDark.value
  })

  watch(isDark, (val) => applyDark(val), { immediate: true })

  function setMode(val) {
    if (VALID_MODES.includes(val)) mode.value = val
  }

  return { mode, isDark, setMode }
}, {
  persist: {
    key: STORAGE_KEY,
    pick: ['mode']
  }
})
```

要点：

1. mode 默认值为 `'system'`，首次加载时通过 `systemPrefersDark()` 读取系统偏好，配合 `watch(isDark, ..., { immediate: true })` 立即应用 `.dark` class
2. mode 通过 `pinia-plugin-persistedstate` 持久化（`pick: ['mode']`），刷新后自动恢复用户选择
3. mode === 'system' 时 `isDark` 跟随 `systemDark`；mode === 'light'/'dark' 时锁死

## workspace store

存放工作区列表与当前激活工作区。通过 `pinia-plugin-persistedstate` 持久化 `workspaces` 和 `currentId`。

暴露：

- `workspaces` — 工作区数组（含 id、name、color、location、description、createdAt）
- `currentId` — 当前激活工作区 id
- `current` — computed，当前工作区对象
- `addWorkspace(data)` — 新增并自动切换
- `setCurrent(id)` — 切换当前工作区

## 跨 store 协作

避免互相 import store 实例形成隐式依赖。需要联动的场景：

- 用事件总线（在 main 层是 EventBus，在渲染层可以用 `mitt`）
- 或者让组件层串起来：

```vue
<script setup>
const app = useAppStore()
const theme = useThemeStore()

watch(() => app.lanAccessEnabled, (on) => {
  if (on) theme.setMode('system')
})
</script>
```

把组合逻辑放在 page-level 组件里，store 各自保持纯净。

## SSR / 测试

Pinia 自身支持 SSR，模板没启用 SSR，但 store 都保留了 SSR-safe 模式：

- 持久化由 `pinia-plugin-persistedstate` 统一管理，内部处理 SSR 安全
- `systemPrefersDark()` 包了 `typeof window === 'undefined'` 守卫，SSR 环境不会报错

这样写出来的 store 在 Vitest 里 import 就能跑，不需要 mock 浏览器 API。
