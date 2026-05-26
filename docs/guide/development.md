# 开发流程

本章把日常开发的循环画清楚：拉代码 → 起开发态 → 改业务 → 校验 → 提交。

## 一次性准备

```bash
git clone <repo>
cd new-template
npm install

cd python_backend
python -m venv venv

# Windows
./venv/Scripts/python.exe -m pip install -r requirements.txt

# macOS / Linux
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

完成后你的工程里会有：

- `node_modules/` Node 依赖
- `python_backend/venv/` Python 虚拟环境
- 三端代码就绪

## 启动开发模式

```bash
npm run dev
```

`electron-vite dev` 会同时跑三件事：

| 进程 | 角色 |
| --- | --- |
| Vite Dev Server | 提供渲染端的 HMR |
| `tsc -w` / esbuild | 监听主进程与 preload，触发重启 Electron |
| Electron 主进程 | spawn Python 子进程、开窗、装配 IPC |

约定：

- 改 `web/src/*` 不重启 Electron，纯 HMR
- 改 `electron/main/*` 或 `electron/preload/*` → Electron 重启
- 改 `python_backend/**` → 不会自动重启 Python，要手动 `python:restart` 或重启 Electron

## 日常循环

### 添加一个 Python 业务方法

1. 在 `python_backend/app/presenters/` 新增 presenter 类
2. 在 `bridge_api.py` 的 `_register_builtins` 里注册
3. 在 `python_backend/app/presenters/__init__.py` 暴露
4. 重启 Python：渲染端调用 `pythonApi.restart()`，或重启 Electron
5. 在渲染端测试调用

### 添加一个主进程 IPC

1. 新建 `electron/main/ipc/modules/<域>/<feature>.module.js`，导出 default
2. `import.meta.glob` 会自动扫描，无需在任何地方手动 import
3. 在 `web/src/api/ipc/<域>.js` 加封装
4. 在组件里调用

### 添加一个页面

1. 新建 `web/src/pages/<feature>/index.vue`
2. 在 `web/src/router/index.js` 加路由
3. （可选）在 `MainLayout.vue` 加导航项

## 代码风格与校验

```bash
npm run lint        # ESLint
npm run format      # Prettier 全量
```

模板自带：

- `eslint.config.mjs` 走 `@electron-toolkit/eslint-config` + `eslint-plugin-vue`
- `.prettierrc.yaml` 与 `.editorconfig` 同步缩进、行宽

Python 侧没强制 linter；推荐自加 `ruff` 或 `black`。

## 调试技巧

### 主进程

```bash
npm run dev -- --inspect=9229
```

或在 VSCode 里用 `launch.json`：

```json
{
  "type": "node",
  "request": "attach",
  "name": "Electron Main",
  "port": 9229
}
```

### 渲染端

Ctrl + Shift + I（macOS：Cmd + Opt + I）打开 DevTools。

### Python

```bash
cd python_backend
./venv/Scripts/python.exe main.py
```

直接前台跑，浏览器访问 `http://127.0.0.1:47821/__docs` 测 OpenAPI；Electron 不连也行。

VSCode 调试：

```json
{
  "type": "python",
  "request": "launch",
  "name": "Python Backend",
  "program": "${workspaceFolder}/python_backend/main.py",
  "args": ["--port", "47821"],
  "python": "${workspaceFolder}/python_backend/venv/Scripts/python.exe"
}
```

## 日志

| 端 | 位置 |
| --- | --- |
| 主进程 | `Logger.getInstance()` 写到 stdout，开发态由 electron-vite 转发到终端 |
| 渲染端 | `console.*`，DevTools 控制台 |
| Python | `get_logger(name).*`，stdout，开发态被主进程捕获 |

## 提交规范

模板没有强制 commit 规范，建议：

- 子模块前缀：`feat(web): ...`、`fix(python): ...`、`chore(build): ...`
- 一次提交聚焦一件事

## 与其他工程协作

后端可以独立运行后挂别的客户端。`/api/bridge` 也支持 curl / Postman / Python 自身：

```python
import httpx

resp = httpx.post('http://127.0.0.1:47821/api/bridge', json={
    'presenter': 'echoPresenter',
    'method': 'echo',
    'args': ['hi']
})
print(resp.json())
```

这意味着 Python 业务在写好 presenter 之后，自然就有了一份不依赖 Electron 的对外 API。
