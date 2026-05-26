"""WebSocket 连接管理：单连接、心跳、发送队列、消息分发。"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any, Callable, Optional

from fastapi import WebSocket, WebSocketDisconnect

from app.logger import get_logger

from .callback_manager import CallbackManager
from .models import HelloAck

logger = get_logger(__name__)

HEARTBEAT_INTERVAL_SECONDS = 10


class WSManager:
    _instance: Optional["WSManager"] = None

    def __init__(self) -> None:
        self._websocket: Optional[WebSocket] = None
        self._send_lock = asyncio.Lock()
        self._heartbeat_task: Optional[asyncio.Task] = None
        self.callbacks = CallbackManager()
        self.client_info: dict[str, str] = {}
        self._connected_at: Optional[float] = None

    @classmethod
    def instance(cls) -> "WSManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ---------- 连接生命周期 ----------
    async def handle_connection(
        self,
        websocket: WebSocket,
        on_connect: Optional[Callable[[], None]] = None,
        on_disconnect: Optional[Callable[[], None]] = None,
    ) -> None:
        # 单连接独占：已有连接则拒绝
        if self._websocket is not None:
            logger.warning("[WSManager] 已有连接，拒绝第二个 ws 客户端")
            await websocket.close(code=1013, reason="already connected")
            return

        await websocket.accept()
        self._websocket = websocket
        self._connected_at = time.time()
        self.callbacks.attach_loop(asyncio.get_running_loop())
        logger.info("[WSManager] electron connected")
        if on_connect is not None:
            try:
                on_connect()
            except Exception:
                logger.exception("[WSManager] on_connect 回调异常")

        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

        try:
            async for raw in websocket.iter_text():
                await self._dispatch(raw)
        except WebSocketDisconnect:
            logger.info("[WSManager] electron disconnected")
        except Exception:
            logger.exception("[WSManager] dispatch error")
        finally:
            await self._cleanup()
            if on_disconnect is not None:
                try:
                    on_disconnect()
                except Exception:
                    logger.exception("[WSManager] on_disconnect 回调异常")

    async def _cleanup(self) -> None:
        if self._heartbeat_task is not None:
            self._heartbeat_task.cancel()
            self._heartbeat_task = None
        self._websocket = None
        self._connected_at = None
        self.client_info.clear()
        self.callbacks.cancel_all(reason="ws disconnected")

    # ---------- 消息分发 ----------
    async def _dispatch(self, raw: str) -> None:
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning(f"[WSManager] 非 JSON 消息已丢弃: {raw[:100]}")
            return

        mtype = msg.get("type")
        if mtype == "hello":
            self.client_info = {
                "client": str(msg.get("client", "unknown")),
                "version": str(msg.get("version", "0.0.0")),
            }
            await self._send(HelloAck().model_dump())
        elif mtype == "ping":
            await self._send({"type": "pong", "timestamp": msg.get("timestamp")})
        elif mtype == "pong":
            pass
        elif mtype == "response":
            self.callbacks.resolve(
                cid=str(msg.get("callback_id", "")),
                success=bool(msg.get("success", False)),
                result=msg.get("result"),
                error=msg.get("error"),
            )
        else:
            logger.warning(f"[WSManager] 未识别消息类型: {mtype}")

    # ---------- 发送 ----------
    async def _send(self, payload: dict) -> None:
        ws = self._websocket
        if ws is None:
            raise ConnectionError("electron not connected")
        async with self._send_lock:
            await ws.send_text(json.dumps(payload, ensure_ascii=False))

    async def send_payload(self, payload: dict) -> None:
        await self._send(payload)

    def is_connected(self) -> bool:
        return self._websocket is not None

    def snapshot(self) -> dict[str, Any]:
        return {
            "connected": self.is_connected(),
            "client_info": dict(self.client_info),
            "pending_callbacks": self.callbacks.pending_count(),
            "connected_at": self._connected_at,
        }

    # ---------- 心跳 ----------
    async def _heartbeat_loop(self) -> None:
        try:
            while self._websocket is not None:
                await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
                if self._websocket is None:
                    break
                try:
                    await self._send({"type": "ping", "timestamp": int(time.time() * 1000)})
                except Exception:
                    logger.exception("[WSManager] heartbeat send failed")
                    break
        except asyncio.CancelledError:
            pass
