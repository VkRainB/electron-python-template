# Bridge API

`POST /api/bridge` 是 Python 给渲染端的**业务总入口**，按 `presenter:method` 动态分发。

## 协议

请求体：

```json
{
  "presenter": "echoPresenter",
  "method": "echo",
  "args": ["hello"]
}
```

成功响应：

```json
{
  "status": "success",
  "data": "hello"
}
```

错误响应：

```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "presenter 'missing' not found"
}
```

## 错误模型

| 异常 | code | HTTP |
| --- | --- | --- |
| `LookupError` | `NOT_FOUND` | 404 |
| 其他 | `INTERNAL` | 500 |

500 响应额外带 `traceback` 字段，方便开发调试。生产环境如果不希望暴露，可以在 `server.py` 的处理函数里过滤掉。

## 服务端实现

```python
# app/server/server.py
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
```

入参用 Pydantic 校验：

```python
class _BridgeRequest(BaseModel):
    presenter: str
    method: str
    args: list[Any] = []
```

任意非 string 的 presenter / method 会被拒绝；args 类型由 presenter 自己负责。

## BridgeApi 分发

`app/bridge_api.py`：

```python
class BridgeApi:
    def __init__(self) -> None:
        self._registry: dict[str, Any] = {}
        self._register_builtins()

    def _register_builtins(self) -> None:
        self.register("echoPresenter", EchoPresenter())

    def register(self, name: str, instance: Any) -> None:
        if name in self._registry:
            logger.warning(f'[BridgeApi] presenter "{name}" 已注册，将被覆盖')
        self._registry[name] = instance
        logger.info(f"[BridgeApi] register presenter: {name}")

    async def async_invoke(self, op: str, presenter: str, method: str, *args) -> Any:
        if op != "presenter:call":
            raise ValueError(f"unsupported op: {op}")

        instance = self._registry.get(presenter)
        if instance is None:
            raise LookupError(f"presenter '{presenter}' not found")

        fn = getattr(instance, method, None)
        if fn is None or not callable(fn):
            raise LookupError(f"method '{method}' not found on '{presenter}'")

        result = fn(*args)
        if inspect.iscoroutine(result):
            result = await result
        return result

    def list_presenters(self) -> list[str]:
        return sorted(self._registry.keys())
```

要点：

1. **支持同步与异步方法混用**：`inspect.iscoroutine(result)` 判断
2. **找不到 presenter / method 都抛 LookupError**，统一转 404
3. **方法以 `_` 开头不做特殊保护**：业务自己控制可见性（也可以增加白名单机制）

## 列出可调用 presenter

```
GET /api/bridge/presenters
```

```json
{
  "presenters": ["echoPresenter"]
}
```

调试时可以从这里看注册情况。

## 实际调用例子

### 渲染端

```js
import { pythonBridgeClient } from '@/services/bridge-client'

const out = await pythonBridgeClient.call('echoPresenter', 'echo', ['hi'])
// out === 'hi'

const sum = await pythonBridgeClient.call('echoPresenter', 'add', [1, 2])
// sum === 3

const meta = await pythonBridgeClient.call('echoPresenter', 'info')
// { name: 'EchoPresenter', methods: ['echo', 'add', 'info'] }
```

### curl

```bash
curl -X POST http://127.0.0.1:47821/api/bridge \
  -H "Content-Type: application/json" \
  -d '{"presenter":"echoPresenter","method":"echo","args":["hi"]}'
```

## 性能与并发

- 每个 HTTP 请求都跑在 uvicorn 的 asyncio 事件循环上
- 同步方法走 `await asyncio.to_thread()` 包裹更稳妥（默认不包裹，避免阻塞要业务自觉）
- 高频调用建议在前端做去抖或合并

## 安全建议

- presenter / method 名称完全由前端传，**不要暴露危险操作**（如 `os` 模块）
- 校验在 presenter 内部完成，bridge 只负责分发
- 生产构建里建议把 `traceback` 字段从错误响应里去掉
