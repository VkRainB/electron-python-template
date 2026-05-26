# 常见问题

## 启动相关

### Q：`npm run dev` 起来后白屏不动

排查顺序：

1. 终端是否有报错？`Python failed to start` → 看 Python 这边
2. `Vite Dev Server` 是否成功？打开 `http://localhost:5173` 单独看
3. 主进程异常？看 `out/` 是否生成、是否报 preload 加载失败
4. CSP 拦截？模板已经主动剥 CSP 头，如果改过这里又出现白屏，先复原

### Q：Python 找不到 venv

```
[build-python] 找不到任何 Python（既没有 venv 也没有 PATH 中的 python）
```

```bash
cd python_backend
python -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt
```

注意：venv 路径必须是 `python_backend/venv/`，不是 `new-template/venv/`。

### Q：端口 47821 被占用

模板会自动 +1 探测最多 50 个端口。如果都占满：

```bash
# Windows
netstat -ano | findstr "47821"
taskkill /PID <PID> /F

# macOS / Linux
lsof -i :47821
kill -9 <PID>
```

或者改 `app.config.json`：

```json
{
  "backend": {
    "defaultPort": 50000,
    "portProbeRange": 100
  }
}
```

### Q：电脑里有多份 daemon 残留

```
%LOCALAPPDATA%\app_electron\
```

直接删除该目录即可。模板下次启动会重建。

## 开发相关

### Q：改了 Python 但热重载没生效

`electron-vite dev` 不监听 Python 文件。改 Python 之后：

- 在设置页点「重启后端」（调 `python:restart`）
- 或重启 Electron（`Ctrl + C` 然后再 `npm run dev`）

### Q：渲染端调用 IPC 报 `electron is not defined`

preload 没有正确加载，常见原因：

- 在 BrowserWindow 配置里 `contextIsolation: false` 导致 `window.electron` 不暴露 → 应该保持默认 true
- preload 路径错了 → 默认 `join(__dirname, '../preload/index.js')`
- Vite Dev Server 注入了 CSP → 模板已剥离 CSP，如果不生效再检查

### Q：DI 容器拿不到 mainWindow

`mainWindow` 是在 `createWindow()` 里 `container.register('mainWindow', mainWindow)` 写入的。如果 handler 报「mainWindow undefined」：

- `setupIpc` 是否在 `createWindow` 之后调用？（默认顺序是对的）
- activate 重建窗口后是否同步刷新？（容器引用自动刷新）

### Q：Bridge 一直 disconnected

- Python 是否在跑？`curl http://127.0.0.1:47821/health`
- 端口对不上？看 `daemon.port` 与主进程日志 `[main] python ready` 后的 URL
- WS 路径错？应该是 `/ws/electron`，固定的

## 打包相关

### Q：`build:win` 失败：找不到 PyInstaller

```bash
./python_backend/venv/Scripts/python.exe -m pip install pyinstaller
```

`requirements.txt` 已经把 `pyinstaller` 列为依赖，但如果你 `pip install` 时跳过了或装了别的 venv，需要补上。

### Q：打包后体积过大

排查方向：

1. PyInstaller excludes 是否漏了？默认排除了 numpy、scipy、pandas、PIL
2. Electron resources 是否带了不该带的？看 `electron-builder.config.js` 的 `files`
3. asar unpack 太多？默认只 unpack `resources/**`

### Q：杀毒软件报警

PyInstaller 单文件 exe 用 Python 解释器 + zipapp，行为像「自解压加载器」，容易被启发式判定。缓解办法：

- 改用 onedir 形式：在 spec 的 Windows 分支也用 COLLECT
- 给 exe 做代码签名
- 提交免误报到杀软白名单

### Q：macOS 提示「来自身份不明开发者」

未公证的应用都会有这个提示。处理：

- 用户手动放行：右键 → 打开
- 开发者公证：申请 Apple Developer 账号、签名、提交 notarize

### Q：自动更新失败

模板已经装了 `electron-updater` 但默认不启用。需要业务自己：

1. 在 `electron-builder.config.js` 配置 `publish.url`
2. 把每次 build 的产物上传到该 URL
3. 主进程里 `autoUpdater.checkForUpdatesAndNotify()`

## 文档相关

### Q：如何本地预览这份文档？

```bash
cd gh-pages
npm install
npm run docs:dev
```

打开 `http://localhost:5173` 即可。

### Q：如何编译静态产物？

```bash
cd gh-pages
npm run docs:build
```

产物在 `gh-pages/docs/.vitepress/dist/`，可以直接挂到 GitHub Pages、Cloudflare Pages、Vercel、Netlify。

### Q：如何修改导航与侧边栏？

`gh-pages/docs/.vitepress/config.mjs`：

```js
themeConfig: {
  nav: [...],
  sidebar: { '/guide/': [...], ... }
}
```
