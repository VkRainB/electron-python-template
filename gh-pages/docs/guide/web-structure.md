# 目录结构

```
web/
├── index.html
└── src/
    ├── main.js                    # 应用挂载
    ├── App.vue                    # 根组件
    ├── assets/                    # 全局样式、字体、图片、Lottie
    │   └── main.css               # Tailwind 主题、CSS 变量
    ├── api/                       # 与主进程交互
    │   └── ipc/
    │       ├── index.js           # 命名空间聚合（python / bridge / dialog / system）
    │       ├── python.js
    │       ├── bridge.js
    │       ├── dialog.js
    │       └── system.js
    ├── services/                  # 业务客户端
    │   └── bridge-client.js       # HTTP /api/bridge 客户端 + 错误类
    ├── stores/                    # Pinia
    │   ├── index.js               # 实例创建 + 持久化插件注册
    │   ├── app.js                 # 侧边栏、局域网开关
    │   ├── theme.js               # light/dark/system 主题
    │   └── workspace.js           # 工作区元数据
    ├── router/                    # Vue Router
    │   ├── index.js
    │   └── routes/
    │       └── base.js            # 路由表定义
    ├── layouts/                   # 页面布局
    │   └── MainLayout.vue
    ├── pages/                     # 业务页（按目录拆 chunk）
    │   ├── home/
    │   ├── app/
    │   └── settings/
    ├── components/                # 可复用组件
    ├── composables/               # 组合式函数（占位）
    └── lib/                       # 工具函数
```

## 各目录约定

### `api/ipc/`

只对接主进程，不包含业务逻辑。每个文件对应主进程一个域：

```js
// web/src/api/ipc/python.js
const ipc = window.electron.ipcRenderer

export const getBackendUrl = () => ipc.invoke('python:get-backend-url')
export const getStatus = () => ipc.invoke('python:get-status')
export const restart = () => ipc.invoke('python:restart')

export function onReady(cb) {
  const wrapped = () => cb()
  ipc.on('python-ready', wrapped)
  return () => ipc.removeListener('python-ready', wrapped)
}
```

**返回订阅取消函数**是这里的关键约定：方便 `onUnmounted(unsubscribe)` 清理。

### `services/`

放业务客户端，不直接接触 `window.electron`。例如：

```js
// web/src/services/bridge-client.js
export class PythonBridgeClient {
  async call(presenter, method, args = [], config = {}) {
    const baseUrl = await this._resolveBaseUrl()
    const url = `${baseUrl}/api/bridge`
    // ... fetch + 错误处理
  }
}

export const pythonBridgeClient = new PythonBridgeClient()
```

`_resolveBaseUrl` 内部调 `api/ipc/python.getBackendUrl()`，缓存到内存，断开时清空。

### `stores/`

Pinia 全部用组合式风格：

```js
// web/src/stores/app.js
export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const lanAccessEnabled = ref(false)

  function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }

  return { sidebarCollapsed, lanAccessEnabled, toggleSidebar }
}, {
  persist: { key: 'app:store-app' }
})
```

约定：

- 持久化键统一以 `app:store-` 前缀，通过 `pinia-plugin-persistedstate` 自动管理
- store 聚合入口 `stores/index.js` 创建 Pinia 实例并注册持久化插件

### `pages/<feature>/`

按业务目录组织，目录内自带：

```
pages/home/
├── index.vue                 # 页面入口
├── components/               # 仅页面内用的组件
├── composables/              # 页面内的状态封装（可选）
└── styles.css                # 可选
```

页面级懒加载（`() => import('@/pages/home/index.vue')`）让 Vite 自动拆 chunk，启动只加载 home。

### `components/`

跨页面复用组件。带变体的组件用 `class-variance-authority`：

```js
import { cva } from 'class-variance-authority'

export const buttonVariants = cva('inline-flex items-center justify-center rounded-md', {
  variants: {
    intent: { primary: 'bg-primary text-white', ghost: 'hover:bg-accent' },
    size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4', lg: 'h-12 px-6 text-lg' }
  },
  defaultVariants: { intent: 'primary', size: 'md' }
})
```

### `lib/`

只放纯函数、不依赖框架。例如 `cn` 工具：

```js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

## Tailwind 4 设置

Tailwind 4 走 Vite 插件方式（`@tailwindcss/vite`），不需要 `tailwind.config.js`。主题变量在 `src/assets/main.css` 用原生 CSS 自定义属性定义：

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* ... 其余颜色同理引用 CSS 变量 */
}

:root {
  --primary: oklch(0.78 0.11 265);
  --background: oklch(1 0 0);
  /* ... */
}

.dark {
  --primary: oklch(0.78 0.11 265);
  --background: oklch(0 0 0);
  /* ... */
}
```

后续配色调整都在 CSS 一份文件搞定。设计令牌见 `DESIGN.md` / `DESIGN-UNIFIED.md`。
