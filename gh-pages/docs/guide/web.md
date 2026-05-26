# Vue 渲染端

渲染端是一份完整的 Vue 3 应用，运行在 BrowserWindow 里。除了能调用 `window.electron` 与 `window.ipc` 之外，跟普通前端工程没有区别。

## 技术栈

| 依赖 | 版本 | 角色 |
| --- | --- | --- |
| `vue` | ^3.5 | 视图层 |
| `vue-router` | ^4.6 | 路由（hash 模式，兼容打包后协议） |
| `pinia` | ^3.0 | 状态管理 |
| `pinia-plugin-persistedstate` | ^4.7 | Pinia 持久化插件 |
| `@vueuse/core` | ^14.3 | 组合式工具 |
| `axios` | ^1.16 | HTTP 客户端 |
| `tailwindcss` | ^4.3 | 原子化样式 |
| `tw-animate-css` | ^1.4 | Tailwind 动画扩展 |
| `lucide-vue-next` | ^1.0 | 图标 |
| `reka-ui` | ^2.9 | shadcn-vue 底层 primitive |
| `class-variance-authority` | ^0.7 | 组件变体 |
| `lottie-web` | ^5.13 | 启动动画 |
| `zod` | ^4.4 | 表单与运行时校验 |
| `ws` | ^8.20 | 调试用（浏览器场景较少） |

## 工程入口

```js
// web/src/main.js
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './stores'

async function bootstrap() {
  const app = createApp(App)

  app.use(store)
  app.use(router)

  await router.isReady()
  app.mount('#app')
}

bootstrap()
```

## App.vue

```vue
<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>
```

刻意做得很轻：所有布局都在 `layouts/MainLayout.vue` 里完成。这样调试时可以直接换一个根路由测试 UI 片段。

## 路由

```js
// web/src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import basicRoutes from './routes/base'

const router = createRouter({
  history: createWebHashHistory(),
  routes: basicRoutes,
  scrollBehavior: () => ({ left: 0, top: 0 })
})

export default router
```

路由表定义在 `router/routes/base.js`，结构如下：

```js
import MainLayout from '@/layouts/MainLayout.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    children: [
      { path: 'home',     name: 'Home',     meta: { title: '首页', icon: 'home' },        component: () => import('@/pages/home/index.vue') },
      { path: 'app',      name: 'App',      meta: { title: '应用', icon: 'layout-grid' }, component: () => import('@/pages/app/index.vue') },
      { path: 'settings', name: 'Settings', meta: { title: '设置', icon: 'settings' },    component: () => import('@/pages/settings/index.vue') }
    ]
  }
]
```

为什么用 hash 模式：Electron 加载 `file://` 协议下的打包产物，BrowserHistory 会被路径鉴定为不存在而 404，hash 模式没这个问题。

## 别名

`electron.vite.config.mjs` 里：

```js
renderer: {
  root: 'web',
  publicDir: 'web/public',
  resolve: {
    alias: { '@': pathResolve('web/src') }
  }
}
```

业务代码统一用 `@/...` 引用：

```js
import { pythonBridgeClient } from '@/services/bridge-client'
import { useAppStore } from '@/stores/app'
```

## 与主进程的边界

| 想做 | 走哪 |
| --- | --- |
| 拿 Python URL | `import * as python from '@/api/ipc/python'` |
| 调 Python 业务 | `pythonBridgeClient.call(...)` |
| 打开系统对话框 | `import * as dialog from '@/api/ipc/dialog'` |
| 订阅 Bridge 连接事件 | `bridge.onConnected(cb)` |
| 拿 app 元信息 | `import * as system from '@/api/ipc/system'` |

详见 [API 调用](/guide/web-api)。

## 主题与持久化

`stores/theme.js` 提供三个模式：`light` / `dark` / `system`，通过 `pinia-plugin-persistedstate` 自动持久化。`stores/app.js` 管理侧边栏折叠、局域网开关等全局状态，同样通过持久化插件自动存储。

## 在浏览器里调试

虽然渲染端依赖 `window.electron`，但 90% UI 不需要它。模板鼓励：

1. `npm run dev` 跑 Electron 调真实通路
2. 单独编辑 Vue 组件时，在浏览器直接打开 `http://localhost:5173`（`electron-vite` 的 Vite 服务）
3. 渲染层在 IPC 不可用时降级（`if (window.electron) { ... }`），方便纯前端调试
