"""上层 API：调用 Electron 的能力。

提供两种调用方式：
- call(action, params, timeout): 带 callback 等待响应
- notify(action, params):        fire-and-forget
"""

from __future__ import annotations

from typing import Any, Optional

from app.logger import get_logger

from .models import ElectronRequest
from .ws_manager import WSManager

logger = get_logger(__name__)


class ElectronClient:
    def __init__(self) -> None:
        self._ws = WSManager.instance()

    async def call(
        self,
        action: str,
        params: Optional[dict] = None,
        timeout: float = 30.0,
    ) -> Any:
        if not self._ws.is_connected():
            raise ConnectionError("electron not connected")
        cid, fut = self._ws.callbacks.create(timeout)
        req = ElectronRequest(
            callback_id=cid,
            action=action,
            params=params or {},
            timeout=int(timeout),
        )
        await self._ws.send_payload(req.model_dump())
        return await fut

    async def notify(self, action: str, params: Optional[dict] = None) -> None:
        if not self._ws.is_connected():
            logger.warning(f"[ElectronClient] notify {action} 失败：未连接")
            return
        req = ElectronRequest(callback_id=None, action=action, params=params or {})
        await self._ws.send_payload(req.model_dump())


electron_client = ElectronClient()
