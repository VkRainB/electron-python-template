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
