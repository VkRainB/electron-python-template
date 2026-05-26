# Python 打包配置

Python 后端通过 PyInstaller 打包为独立可执行文件，配置在 `python_backend/build.spec`。产物名由 [应用配置](/guide/config) 的 `app.config.json` 动态决定。

## 产物形式

| 平台 | 形式 | 产物路径 |
| --- | --- | --- |
| Windows | onefile | `python_backend/dist/<binaryName>.exe` |
| macOS | onedir | `python_backend/dist/<binaryName>/<binaryName>` |
| Linux | onedir | `python_backend/dist/<binaryName>/<binaryName>` |

`binaryName` 来自 `app.config.json.backend.binaryName`，默认 `mo_server`。

Windows 用 onefile（单 exe，分发简单）；macOS / Linux 用 onedir（目录形式，兼容性更好）。

## 完整 spec

```python
import json, sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules

_HERE = Path(SPECPATH).resolve()
_ROOT = _HERE.parent
_CFG_PATH = _ROOT / 'app.config.json'

with open(_CFG_PATH, 'r', encoding='utf-8') as f:
    _cfg = json.load(f)

NAME = _cfg['backend']['binaryName']
IS_WIN = sys.platform == 'win32'

hidden_imports = []
hidden_imports += collect_submodules('uvicorn')
hidden_imports += collect_submodules('websockets')
hidden_imports += collect_submodules('fastapi')
hidden_imports += collect_submodules('pydantic')

datas = [(str(_CFG_PATH), '.')]
```

## 配置来源

spec 文件在执行时 `cwd = python_backend/`，项目根在上一级。通过 `SPECPATH` 定位 `app.config.json` 并读取 `backend.binaryName`。

`app.config.json` 同时作为 `datas` 嵌入产物，运行时通过 `sys._MEIPASS` 读取，保证内嵌产物与 Electron 主进程引用同一份配置。

## 隐式 import

PyInstaller 静态分析会漏掉部分动态加载的子模块，需手动收集：

```python
hidden_imports += collect_submodules('uvicorn')
hidden_imports += collect_submodules('websockets')
hidden_imports += collect_submodules('fastapi')
hidden_imports += collect_submodules('pydantic')
```

缺少这些会导致运行时报 `ModuleNotFoundError`。

## 排除大依赖

```python
excludes=['tkinter', 'unittest', 'PIL', 'numpy', 'scipy', 'pandas']
```

默认排除项，控制产物大小。如果业务用到 numpy 等库，从 `excludes` 中移除即可。

## Windows onefile

```python
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name=NAME,
    debug=False,
    strip=False,
    upx=False,
    console=True,
    onefile=True,
)
```

所有依赖打进单个 exe。启动时自解压到临时目录，首次启动约 5 秒，守护模式下二次启动复用驻留进程可降到 1 秒。

## macOS / Linux onedir

```python
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=NAME,
    ...
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    name=NAME,
)
```

产物为目录，包含可执行文件与依赖的 `.so` / `.dylib`。electron-builder 通过 `extraResources` 把整个目录复制到安装包的 `resources/python_build/<binaryName>/`。

## 构建入口

`scripts/build-python.mjs` 是平台自适应的构建脚本：

```
1. 优先用 python_backend/venv/Scripts/python.exe（或 venv/bin/python）
2. 没有 venv 就找 PATH 里的 python / python3 / py
3. 用 python -m PyInstaller --noconfirm --clean build.spec 触发打包
4. 校验产物存在
```

```bash
npm run build:python    # 单独打 Python
npm run build:win       # 完整流程：Python + Electron
```

## 产物与 Electron 的衔接

主进程通过 `process.resourcesPath` 定位 Python 二进制：

```js
function resolvePythonExecutable() {
  if (app.isPackaged) {
    if (process.platform === 'win32') {
      return path.join(process.resourcesPath, `${BINARY_NAME}.exe`)
    }
    return path.join(process.resourcesPath, 'python_build', BINARY_NAME, BINARY_NAME)
  }
  // 开发态走 venv
}
```

`electron-builder.config.js` 的 `extraResources` 路径与此函数对齐。
