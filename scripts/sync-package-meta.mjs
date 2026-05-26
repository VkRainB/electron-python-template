#!/usr/bin/env node
/**
 * 把 app.config.json 中 app 段的元数据同步到 package.json。
 *
 * 触发时机：prebuild 钩子（npm run build / build:python / build:win 等之前）
 * 仅在字段值不一致时写入，避免无意义的 git diff 抖动。
 *
 * 同步字段：name, version, description, author
 * （productName 不写入 package.json，由 electron-builder.config.cjs 直接读 app.config.json）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(__filename), '..')

const cfgPath = path.join(ROOT, 'app.config.json')
const pkgPath = path.join(ROOT, 'package.json')

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const target = cfg.app
const fields = ['name', 'version', 'description', 'author']

let changed = false
for (const k of fields) {
  if (target[k] !== undefined && pkg[k] !== target[k]) {
    console.log(`[sync-package-meta] ${k}: ${JSON.stringify(pkg[k])} → ${JSON.stringify(target[k])}`)
    pkg[k] = target[k]
    changed = true
  }
}

if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log('[sync-package-meta] package.json updated')
} else {
  console.log('[sync-package-meta] package.json already in sync')
}
