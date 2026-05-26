# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec：从 app.config.json 读取产物名，三平台统一输出 binaryName。

- Win: onefile  → dist/<binaryName>.exe
- Mac/Linux: onedir → dist/<binaryName>/<binaryName>

并把 app.config.json 嵌入产物（datas），供运行时通过 sys._MEIPASS 读取。
"""
import json
import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

# spec 执行时 cwd = python_backend/，项目根在上一级
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

# 把 app.config.json 嵌入产物根目录
datas = [(str(_CFG_PATH), '.')]

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    runtime_hooks=[],
    excludes=['tkinter', 'unittest', 'PIL', 'numpy', 'scipy', 'pandas'],
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

if IS_WIN:
    # Windows: onefile
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
else:
    # macOS / Linux: onedir
    exe = EXE(
        pyz,
        a.scripts,
        [],
        exclude_binaries=True,
        name=NAME,
        debug=False,
        strip=False,
        upx=False,
        console=True,
    )
    coll = COLLECT(
        exe,
        a.binaries,
        a.zipfiles,
        a.datas,
        strip=False,
        upx=False,
        name=NAME,
    )
