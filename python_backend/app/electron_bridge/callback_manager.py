"""异步回调管理：callback_id ↔ Future。

每次 Python 主动请求 Electron 时创建一个 Future，等待对端响应或超时。
WS 断开时统一取消所有 pending（避免业务侧泄漏）。
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Any, Optional

from app.logger import get_logger

logger = get_logger(__name__)


class CallbackManager:
    def __init__(self) -> None:
        self._pending: dict[str, asyncio.Future] = {}
        self._timers: dict[str, asyncio.TimerHandle] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def create(self, timeout: float = 30.0) -> tuple[str, asyncio.Future]:
        cid = str(uuid.uuid4())
        loop = self._loop or asyncio.get_event_loop()
        fut = loop.create_future()
        self._pending[cid] = fut

        def _on_timeout() -> None:
            self._timers.pop(cid, None)
            if not fut.done():
                fut.set_exception(TimeoutError(f"callback {cid} timeout after {timeout}s"))
            self._pending.pop(cid, None)

        self._timers[cid] = loop.call_later(timeout, _on_timeout)
        return cid, fut

    def resolve(
        self,
        cid: str,
        success: bool,
        result: Any = None,
        error: Optional[str] = None,
    ) -> None:
        fut = self._pending.pop(cid, None)
        timer = self._timers.pop(cid, None)
        if timer is not None:
            try:
                timer.cancel()
            except Exception:
                pass
        if not fut or fut.done():
            logger.debug(f"[CallbackManager] callback {cid} 已过期或不存在")
            return
        if success:
            fut.set_result(result)
        else:
            fut.set_exception(RuntimeError(error or "unknown error"))

    def cancel_all(self, reason: str = "ws disconnected") -> None:
        for cid, fut in list(self._pending.items()):
            if not fut.done():
                fut.set_exception(ConnectionError(reason))
            timer = self._timers.pop(cid, None)
            if timer is not None:
                try:
                    timer.cancel()
                except Exception:
                    pass
        self._pending.clear()

    def pending_count(self) -> int:
        return len(self._pending)

    def pending_ids(self) -> list[str]:
        return list(self._pending.keys())
