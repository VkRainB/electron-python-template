import MainLayout from '@/layouts/MainLayout.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        meta: { title: '首页', icon: 'home' },
        component: () => import('@/pages/home/index.vue')
      },
      {
        path: 'app',
        name: 'App',
        meta: { title: '应用', icon: 'layout-grid' },
        component: () => import('@/pages/app/index.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        meta: { title: '设置', icon: 'settings' },
        component: () => import('@/pages/settings/index.vue')
      }
    ]
  }
]

export default routes
