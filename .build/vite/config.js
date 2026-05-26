import { resolve } from 'node:path'
import process from 'node:process'

import { externalizeDepsPlugin } from 'electron-vite'

const root = process.cwd()
const pathResolve = (dir) => resolve(root, '.', dir)

export function createElectronConfig(entryPath) {
  return {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': pathResolve('electron/main')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: pathResolve(entryPath)
        }
      }
    }
  }
}

export function rendererBuildConfig() {
  return {
    rollupOptions: {
      input: {
        index: pathResolve('web/index.html')
      }
    }
  }
}
