#!/usr/bin/env node
/**
 * 跨平台 Python 后端打包脚本。
 *
 * 优先级：
 *   1) <project>/venv 下的 python（Windows: venv/Scripts/python.exe；Unix: venv/bin/python）
 *   2) PATH 中的 python / python3 / py
 *
 * 始终以 `python -m PyInstaller --noconfirm --clean build.spec` 形式调用，
 * 因此不依赖 `pyinstaller.exe` 出现在 PATH。
 *
 * 用法：
 *   node scripts/build-python.mjs
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(__filename), '..')
const BACKEND_DIR = path.join(ROOT, 'python_backend')
const SPEC = 'build.spec'

const IS_WIN = process.platform === 'win32'

const _cfg = JSON.parse(readFileSync(path.join(ROOT, 'app.config.json'), 'utf8'))
const BINARY_NAME = _cfg.backend.binaryName

function venvPython() {
  const p = IS_WIN
    ? path.join(BACKEND_DIR, 'venv', 'Scripts', 'python.exe')
    : path.join(BACKEND_DIR, 'venv', 'bin', 'python')
  return existsSync(p) ? p : null
}

function systemPython() {
  const candidates = IS_WIN ? ['python', 'py', 'python3'] : ['python3', 'python']
  for (const c of candidates) {
    const r = spawnSync(c, ['--version'], { stdio: 'ignore', shell: false })
    if (r.status === 0) return c
  }
  return null
}

function hasPyInstaller(pythonCmd) {
  const r = spawnSync(pythonCmd, ['-c', 'import PyInstaller'], {
    stdio: 'ignore',
    shell: false
  })
  return r.status === 0
}

function pickPython() {
  const v = venvPython()
  if (v) {
    if (hasPyInstaller(v)) return { cmd: v, source: 'venv' }
    console.error(`[build-python] 检测到 venv：${v}`)
    console.error('[build-python] 但其中未安装 PyInstaller。请执行：')
    console.error(`  ${v} -m pip install -r python_backend/requirements.txt`)
    return null
  }
  const sys = systemPython()
  if (sys) {
    if (hasPyInstaller(sys)) return { cmd: sys, source: 'system' }
    console.error(`[build-python] 已找到系统 Python：${sys}`)
    console.error('[build-python] 但未安装 PyInstaller。请执行：')
    console.error(`  ${sys} -m pip install -r python_backend/requirements.txt`)
    return null
  }
  console.error('[build-python] 找不到任何 Python（既没有 venv 也没有 PATH 中的 python）。')
  console.error('请安装 Python ≥ 3.10，或在 python_backend 目录下创建虚拟环境后再试：')
  console.error('  cd python_backend')
  console.error('  python -m venv venv')
  console.error('  ./venv/Scripts/python.exe -m pip install -r requirements.txt')
  return null
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: false })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with code ${code}`))
    })
  })
}

async function main() {
  if (!existsSync(BACKEND_DIR)) {
    console.error(`[build-python] python_backend 目录不存在：${BACKEND_DIR}`)
    process.exit(2)
  }
  if (!existsSync(path.join(BACKEND_DIR, SPEC))) {
    console.error(`[build-python] 缺少 spec 文件：${path.join(BACKEND_DIR, SPEC)}`)
    process.exit(2)
  }

  const picked = pickPython()
  if (!picked) process.exit(3)

  console.log(`[build-python] 使用 Python：${picked.cmd}  (source=${picked.source})`)
  console.log(`[build-python] cwd=${BACKEND_DIR}`)
  try {
    await run(picked.cmd, ['-m', 'PyInstaller', '--noconfirm', '--clean', SPEC], BACKEND_DIR)
    const exe = IS_WIN
      ? path.join(BACKEND_DIR, 'dist', `${BINARY_NAME}.exe`)
      : path.join(BACKEND_DIR, 'dist', BINARY_NAME, BINARY_NAME)
    console.log(`[build-python] 完成：${exe}`)
  } catch (e) {
    console.error(`[build-python] 失败：${e.message}`)
    process.exit(1)
  }
}

main()
