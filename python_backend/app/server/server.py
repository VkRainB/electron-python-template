"""FastAPI 应用工厂。

任务 03 提供最小路由（/health /version），后续任务在此挂载：
- 任务 04：daemon 路由 + lifecycle middleware（本任务）
- 任务 05：/api/bridge
- 任务 06：/ws/electron
- 任务 07：完整 HTTP 端点 + CORS + 全局异常处理
"""

from __future__ import annotations

import os
import signal
import traceback
import uuid
from typing import Any, Literal, Optional

from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.bridge_api import BridgeApi
from app.electron_bridge.electron_client import electron_client
from app.electron_bridge.ws_manager import WSManager
from app.logger import get_logger
from app.server.responses import err, ok
from app.version import APP_VERSION

logger = get_logger(__name__)


class _BridgeRequest(BaseModel):
    presenter: str
    method: str
    args: list[Any] = []


class _ElectronBridgeReq(BaseModel):
    action: str
    params: dict[str, Any] = {}
    timeout: float = 10


class _ControlReq(BaseModel):
    target: Literal["workspace", "tab", "window"]
    op: str
    params: dict[str, Any] = {}


def build_app(
    daemon_mode: bool = False,
    daemon: Optional[Any] = None,
    lifecycle: Optional[Any] = None,
) -> FastAPI:
    fastapi_app = FastAPI(
        title="Electron Python Backend",
        version=APP_VERSION,
        docs_url="/__docs",
        redoc_url=None,
    )
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    bridge = BridgeApi()
    fastapi_app.state.bridge = bridge
    ws_manager = WSManager.instance()
    fastapi_app.state.ws_manager = ws_manager

    @fastapi_app.middleware("http")
    async def _log_requests(request: Request, call_next):
        logger.debug(f"-> {request.method} {request.url.path}")
        try:
            resp = await call_next(request)
        except Exception:
            logger.exception(f"[middleware] unhandled {request.method} {request.url.path}")
            raise
        logger.debug(f"<- {request.method} {request.url.path} {resp.status_code}")
        return resp

    @fastapi_app.middleware("http")
    async def _touch_lifecycle(request: Request, call_next):
        if lifecycle is not None:
            try:
                lifecycle.touch()
            except Exception:
                pass
        return await call_next(request)

    @fastapi_app.get("/health")
    async def health() -> dict[str, Any]:
        return {"status": "ok"}

    @fastapi_app.get("/version")
    async def version() -> dict[str, str]:
        return {"version": APP_VERSION}

    @fastapi_app.post("/api/bridge")
    async def bridge_api(req: _BridgeRequest) -> JSONResponse:
        try:
            data = await bridge.async_invoke(
                "presenter:call", req.presenter, req.method, *req.args
            )
            return JSONResponse({"status": "success", "data": data})
        except LookupError as e:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "code": "NOT_FOUND", "message": str(e)},
            )
        except Exception as e:
            logger.exception("[/api/bridge] internal error")
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error",
                    "code": "INTERNAL",
                    "message": str(e),
                    "traceback": traceback.format_exc(),
                },
            )

    @fastapi_app.get("/api/bridge/presenters")
    async def list_presenters() -> dict[str, list[str]]:
        return {"presenters": bridge.list_presenters()}

    @fastapi_app.websocket("/ws/electron")
    async def electron_bridge_ws(websocket: WebSocket) -> None:
        session_tag = "ws"

        def _on_connect() -> None:
            if daemon is not None:
                daemon.on_client_connect(session_tag)
            if lifecycle is not None:
                lifecycle.touch()

        def _on_disconnect() -> None:
            if daemon is not None:
                daemon.on_client_disconnect(session_tag)

        await ws_manager.handle_connection(websocket, _on_connect, _on_disconnect)

    @fastapi_app.get("/api/electron/stats")
    async def electron_stats() -> dict[str, Any]:
        return ws_manager.snapshot()

    @fastapi_app.get("/api/electron/pending")
    async def electron_pending() -> dict[str, list[str]]:
        return {"pending": ws_manager.callbacks.pending_ids()}

    @fastapi_app.post("/api/electron_bridge")
    async def electron_bridge(req: _ElectronBridgeReq):
        try:
            data = await electron_client.call(req.action, req.params, timeout=req.timeout)
            return ok(data)
        except ConnectionError as e:
            return err("WS_NOT_CONNECTED", str(e), http=503)
        except TimeoutError as e:
            return err("TIMEOUT", str(e), http=504)
        except Exception as e:
            logger.exception("[/api/electron_bridge]")
            return err("INTERNAL", str(e), http=500)

    @fastapi_app.post("/api/electron_control")
    async def electron_control(req: _ControlReq):
        action = f"{req.target}.{req.op}"
        proxied = _ElectronBridgeReq(action=action, params=req.params, timeout=10)
        return await electron_bridge(proxied)

    @fastapi_app.post("/api/mcp/start")
    async def mcp_start(_body: Optional[dict] = None):
        return err("NOT_IMPLEMENTED", "MCP 暂未启用", http=501)

    @fastapi_app.get("/daemon/status")
    async def daemon_status() -> JSONResponse:
        if daemon is None:
            return JSONResponse(
                {
                    "pid": os.getpid(),
                    "version": APP_VERSION,
                    "port": None,
                    "active_clients": 0,
                    "daemon_mode": False,
                }
            )
        snap = daemon.snapshot()
        snap["version"] = APP_VERSION
        snap["daemon_mode"] = daemon_mode
        return JSONResponse(snap)

    @fastapi_app.post("/daemon/connect")
    async def daemon_connect(body: Optional[dict] = None) -> dict[str, Any]:
        session_id = (body or {}).get("session_id") or str(uuid.uuid4())
        if daemon is not None:
            daemon.on_client_connect(session_id)
        return {"session_id": session_id, "status": "connected"}

    @fastapi_app.post("/daemon/disconnect")
    async def daemon_disconnect(body: Optional[dict] = None) -> dict[str, Any]:
        sid = (body or {}).get("session_id", "")
        if daemon is not None and sid:
            daemon.on_client_disconnect(sid)
        return {"status": "disconnected"}

    @fastapi_app.post("/shutdown_evol")
    async def shutdown_evol() -> dict[str, str]:
        logger.warning("[server] 收到强制退出请求 /shutdown_evol")
        try:
            if daemon is not None:
                daemon.release_lock()
        except Exception:
            pass
        if hasattr(signal, "SIGTERM"):
            try:
                os.kill(os.getpid(), signal.SIGTERM)
            except OSError:
                os._exit(0)
        else:
            os._exit(0)
        return {"status": "shutting_down"}

    @fastapi_app.on_event("startup")
    async def _on_startup() -> None:
        logger.info(f"[server] FastAPI ready (daemon_mode={daemon_mode})")
        if lifecycle is not None:
            try:
                lifecycle.start()
            except Exception as e:
                logger.warning(f"[server] lifecycle.start 失败：{e}")

    @fastapi_app.on_event("shutdown")
    async def _on_shutdown() -> None:
        logger.info("[server] FastAPI shutting down")
        if lifecycle is not None:
            try:
                lifecycle.stop()
            except Exception:
                pass

    @fastapi_app.exception_handler(Exception)
    async def _unhandled(_request: Request, exc: Exception):
        logger.exception("unhandled exception")
        return err("INTERNAL", str(exc), http=500)

    return fastapi_app
