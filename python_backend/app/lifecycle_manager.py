"""空闲超时管理。

策略：
- 每次 HTTP/WS 请求都调用 touch() 重置计时
- 没有任何活跃客户端 + 距离最后活跃 idle_seconds 后软退出
- WS/HTTP 中间件 + WS 连接钩子统一调用 touch()
"""

from __future__ import annotations

import asyncio
import os
import signal
from datetime import datetime, timezone
from typing import Optional

from app.daemon_manager import DaemonManager
from app.logger import get_logger

logger = get_logger(__name__)

DEFAULT_IDLE_SECONDS = 48 * 3600
CHECK_INTERVAL_SECONDS = 30


class LifecycleManager:
    def __init__(self, daemon: DaemonManager, idle_seconds: int = DEFAULT_IDLE_SECONDS) -> None:
        self.daemon = daemon
        self.idle_seconds = max(5, int(idle_seconds))
        self._last_active: datetime = datetime.now(timezone.utc)
        self._task: Optional[asyncio.Task] = None
        self._stopped = False

    def touch(self) -> None:
        self._last_active = datetime.now(timezone.utc)

    def start(self) -> None:
        if self._task is not None:
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            logger.warning("[lifecycle] no running loop, 跳过启动")
            return
        self._task = loop.create_task(self._watch_loop())
        logger.info(f"[lifecycle] 启动，idle_seconds={self.idle_seconds}")

    def stop(self) -> None:
        self._stopped = True
        if self._task is not None:
            self._task.cancel()
            self._task = None
        logger.info("[lifecycle] 停止")

    async def _watch_loop(self) -> None:
        try:
            while not self._stopped:
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)
                if self.daemon.active_count() > 0:
                    self.touch()
                    continue
                idle = (datetime.now(timezone.utc) - self._last_active).total_seconds()
                if idle >= self.idle_seconds:
                    logger.warning(
                        f"[lifecycle] 空闲 {idle:.0f}s ≥ {self.idle_seconds}s，触发软退出"
                    )
                    self._soft_exit()
                    return
        except asyncio.CancelledError:
            pass

    def _soft_exit(self) -> None:
        try:
            self.daemon.release_lock()
        except Exception as e:
            logger.warning(f"[lifecycle] release_lock 失败：{e}")
        if hasattr(signal, "SIGTERM"):
            try:
                os.kill(os.getpid(), signal.SIGTERM)
                return
            except OSError:
                pass
        os._exit(0)
