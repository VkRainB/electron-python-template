"""统一响应包装。

约定：
- ok(data) → {"status":"success","data":...}
- err(code, message, http, **extra) → JSONResponse 带统一 error 结构
"""

from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse


def ok(data: Any = None) -> dict[str, Any]:
    return {"status": "success", "data": data}


def err(code: str, message: str, http: int = 400, **extra: Any) -> JSONResponse:
    payload: dict[str, Any] = {"status": "error", "code": code, "message": message}
    payload.update(extra)
    return JSONResponse(content=payload, status_code=http)
