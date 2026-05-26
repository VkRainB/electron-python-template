import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'electron-vite'
import { createElectronConfig, createVitePlugins, rendererBuildConfig } from './.build/vite'

const root = process.cwd()
const pathResolve = (dir) => resolve(root, '.', dir)

export default defineConfig((cnf) => ({
  main: createElectronConfig('electron/main/index.js'),
  preload: createElectronConfig('electron/preload/index.js'),
  renderer: {
    root: 'web',
    publicDir: 'web/public',
    resolve: {
      alias: {
        '@': pathResolve('web/src')
      }
    },
    plugins: createVitePlugins(cnf),
    build: rendererBuildConfig()
  }
}))
