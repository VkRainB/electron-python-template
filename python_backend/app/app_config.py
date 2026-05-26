"""统一配置读取器。

加载优先级（三层 fallback）：
1. 生产态：可执行文件同目录的外部 app.config.json（允许热修复）
2. 生产态：PyInstaller 内嵌的 sys._MEIPASS/app.config.json
3. 开发态：python_backend/../app.config.json（项目根）
"""

from __future__ import annotations

import json
import sys
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def load_config() -> dict:
    candidates: list[Path] = []
    if getattr(sys, "frozen", False):
        exe_dir = Path(sys.executable).parent
        candidates.append(exe_dir / "app.config.json")
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            candidates.append(Path(meipass) / "app.config.json")
        # extraResources 目录（Electron 打包后 app_python.exe 与 app.config.json 同在 resources/）
        candidates.append(exe_dir / ".." / "app.config.json")
    else:
        candidates.append(Path(__file__).resolve().parents[2] / "app.config.json")

    for p in candidates:
        try:
            if p.exists():
                return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
    raise FileNotFoundError(
        "app.config.json not found in any of: " + ", ".join(str(p) for p in candidates)
    )


def get_backend() -> dict:
    return load_config()["backend"]


def get_app() -> dict:
    return load_config()["app"]


def get_daemon_dir_name() -> str:
    cfg = load_config()
    return cfg["daemon"]["dirName"]["win32" if sys.platform == "win32" else "unix"]


if __name__ == "__main__":
    print(json.dumps(load_config(), indent=2, ensure_ascii=False))
