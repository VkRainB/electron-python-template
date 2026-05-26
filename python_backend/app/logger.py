"""统一日志入口。

约定：
- 文件目录：Windows %LOCALAPPDATA%/app_electron/logs/；Unix ~/.app_electron/logs/
- 格式：时间戳 | 等级 | 模块名 | 消息
- 用法：from app.logger import get_logger; logger = get_logger(__name__)
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

_INITIALIZED = False
_LOG_DIR: Path | None = None


def _resolve_log_dir() -> Path:
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / "app_electron" / "logs"
    return Path.home() / ".app_electron" / "logs"


def get_log_dir() -> Path:
    _init_logging()
    assert _LOG_DIR is not None
    return _LOG_DIR


def _init_logging() -> None:
    global _INITIALIZED, _LOG_DIR
    if _INITIALIZED:
        return
    _LOG_DIR = _resolve_log_dir()
    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    fmt = logging.Formatter("%(asctime)s | %(levelname)-5s | %(name)s | %(message)s")

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    fh = logging.FileHandler(_LOG_DIR / "python_backend.log", encoding="utf-8")
    fh.setFormatter(fmt)
    root.addHandler(fh)

    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    root.addHandler(sh)

    _INITIALIZED = True


def get_logger(name: str) -> logging.Logger:
    _init_logging()
    return logging.getLogger(name)
