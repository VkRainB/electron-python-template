"""WS 通信报文模型。

报文类型：
- hello / hello_ack: 握手
- ping / pong: 心跳
- electron_request: Python → Electron 请求（带 callback_id）
- response:        Electron → Python 响应
"""

from __future__ import annotations

import time
from typing import Any, Optional

from pydantic import BaseModel, Field


def _now_ms() -> int:
    return int(time.time() * 1000)


class ElectronRequest(BaseModel):
    type: str = "electron_request"
    callback_id: Optional[str] = None
    action: str
    params: dict[str, Any] = Field(default_factory=dict)
    timeout: int = 30


class ElectronResponse(BaseModel):
    type: str = "response"
    callback_id: str
    success: bool
    result: Any = None
    error: Optional[str] = None
    timestamp: int = Field(default_factory=_now_ms)


class HelloMessage(BaseModel):
    type: str = "hello"
    client: str
    version: str


class HelloAck(BaseModel):
    type: str = "hello_ack"
    message: str = "connected"
