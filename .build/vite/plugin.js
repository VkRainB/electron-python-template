import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export function createVitePlugins(/* cnf */) {
  return [vue(), tailwindcss()]
}
