# 路由与中间件

FastAPI 应用通过 `build_app()` 工厂函数创建：

```python
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
    ...
    return fastapi_app
```

工厂模式的好处：单测时可以传 mock 的 daemon / lifecycle；生产 / 守护 / 单独运行三种场景共用同一份代码。

## CORS

```python
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

打开是因为渲染端的 `fetch` 来源是 `file://` 或 `http://localhost:5173`。生产环境如果后端也想对外暴露，需要收紧。

## 全局中间件

### 日志中间件

```python
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
```

进入与离开各记一行，异常时还会带上完整 traceback。

### 生命周期 touch

```python
@fastapi_app.middleware("http")
async def _touch_lifecycle(request: Request, call_next):
    if lifecycle is not None:
        try:
            lifecycle.touch()
        except Exception:
            pass
    return await call_next(request)
```

每个 HTTP 请求都重置空闲计时器。WS 在自身连接钩子里也调用 `touch()`。

## 全局异常处理

```python
@fastapi_app.exception_handler(Exception)
async def _unhandled(_request: Request, exc: Exception):
    logger.exception("unhandled exception")
    return err("INTERNAL", str(exc), http=500)
```

`err`/`ok` 是统一响应壳：

```python
# app/server/responses.py
def ok(data: Any = None) -> dict[str, Any]:
    return {"status": "success", "data": data}

def err(code: str, message: str, http: int = 400, **extra: Any) -> JSONResponse:
    payload: dict[str, Any] = {"status": "error", "code": code, "message": message}
    payload.update(extra)
    return JSONResponse(content=payload, status_code=http)
```

模板里所有业务端点都用这两个函数返回，前端 `BridgeClient` 也按这个壳解包。

## 启动与关闭钩子

```python
@fastapi_app.on_event("startup")
async def _on_startup() -> None:
    logger.info(f"[server] FastAPI ready (daemon_mode={daemon_mode})")
    if lifecycle is not None:
        lifecycle.start()

@fastapi_app.on_event("shutdown")
async def _on_shutdown() -> None:
    logger.info("[server] FastAPI shutting down")
    if lifecycle is not None:
        lifecycle.stop()
```

注意：`lifecycle.start()` 需要拿到正在运行的 event loop，必须放在 startup 钩子里，不能在工厂函数里直接调。

## 全部端点速查

```
GET    /health
GET    /version
POST   /api/bridge
GET    /api/bridge/presenters
WS     /ws/electron
GET    /api/electron/stats
GET    /api/electron/pending
POST   /api/electron_bridge
POST   /api/electron_control
POST   /api/mcp/start            # NOT_IMPLEMENTED 占位
GET    /daemon/status
POST   /daemon/connect
POST   /daemon/disconnect
POST   /shutdown_evol
GET    /__docs                   # Swagger UI
```

## 自定义业务路由

直接在 `server.py` 里加是最简单的：

```python
@fastapi_app.post("/api/my-feature")
async def my_feature(req: MyReq):
    try:
        data = do_something(req)
        return ok(data)
    except ValueError as e:
        return err("BAD_INPUT", str(e), http=400)
```

如果业务很多，建议拆 router：

```python
# app/server/routers/feature.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/feature", tags=["feature"])

@router.get("")
async def list_feature():
    ...
```

然后在 `build_app` 中 `fastapi_app.include_router(feature_router)`。
