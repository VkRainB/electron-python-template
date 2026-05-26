import { createRouter, createWebHashHistory } from 'vue-router'
import basicRoutes from './routes/base'

const router = createRouter({
  history: createWebHashHistory(),
  routes: basicRoutes,
  scrollBehavior: () => ({ left: 0, top: 0 })
})

export default router
