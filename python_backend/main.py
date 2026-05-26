"""Electron-Python 后端启动入口。

用法：
  python main.py --host 127.0.0.1 --port 47821
  python main.py --daemon                       # 守护模式
  python main.py --daemon --idle-timeout 30     # 测试用短超时

守护模式下：
- 启动前检查同目录 PID 文件，存在且存活则拒绝启动
- 写入 daemon.pid / daemon.version / daemon.port
- 进程退出（正常或异常）会自动清理三个文件
"""

from __future__ import annotations

import argparse
import atexit
import os
import signal
import sys
from pathlib import Path

# 确保从任意路径都能 import app 包
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import uvicorn  # noqa: E402

from app.app_config import get_backend  # noqa: E402
from app.daemon_manager import DaemonManager  # noqa: E402
from app.lifecycle_manager import DEFAULT_IDLE_SECONDS, LifecycleManager  # noqa: E402
from app.logger import get_logger  # noqa: E402
from app.server.server import build_app  # noqa: E402
from app.version import APP_VERSION  # noqa: E402

logger = get_logger(__name__)

_BACKEND_CFG = get_backend()
DEFAULT_PORT = int(_BACKEND_CFG["defaultPort"])
DEFAULT_HOST = _BACKEND_CFG["host"]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Python backend for Electron app")
    p.add_argument("--host", default=os.environ.get("APP_BACKEND_HOST", DEFAULT_HOST))
    p.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("APP_BACKEND_PORT", DEFAULT_PORT)),
    )
    p.add_argument("--daemon", action="store_true", help="以守护进程模式启动")
    p.add_argument(
        "--idle-timeout",
        type=int,
        default=int(os.environ.get("APP_IDLE_TIMEOUT", DEFAULT_IDLE_SECONDS)),
        help="守护模式下空闲多少秒后软退出（默认 48h）",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    logger.info(f"=== Python backend starting (v{APP_VERSION}) ===")
    logger.info(
        f"host={args.host} port={args.port} daemon={args.daemon} idle_timeout={args.idle_timeout}"
    )

    daemon: DaemonManager | None = None
    lifecycle: LifecycleManager | None = None

    if args.daemon:
        daemon = DaemonManager()
        existing = daemon.check_existing()
        if existing:
            logger.warning(
                f"[main] 已有守护进程 pid={existing['pid']} port={existing['port']} version={existing['version']}，本进程退出"
            )
            return 1
        port = daemon.resolve_port(args.port, host=args.host)
        ok = daemon.acquire_lock(os.getpid(), APP_VERSION, port)
        if not ok:
            logger.error("[main] 写入元数据失败，无法继续")
            return 2
        atexit.register(daemon.release_lock)
        lifecycle = LifecycleManager(daemon, idle_seconds=args.idle_timeout)
    else:
        port = args.port

    app_instance = build_app(daemon_mode=args.daemon, daemon=daemon, lifecycle=lifecycle)

    def _on_signal(signum, _frame):
        logger.info(f"received signal {signum}, shutting down...")
        if daemon is not None:
            try:
                daemon.release_lock()
            except Exception:
                pass
        sys.exit(0)

    signal.signal(signal.SIGINT, _on_signal)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _on_signal)

    try:
        uvicorn.run(
            app_instance,
            host=args.host,
            port=port,
            log_level="info",
            access_log=False,
        )
    finally:
        if daemon is not None:
            try:
                daemon.release_lock()
            except Exception:
                pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
