# Presenter 业务层

Presenter 是 Python 后端的**业务单元**。一个 presenter 是一个类，类的每个 public 方法都是一个可调用的端点。

## 内置示例

`app/presenters/echo_presenter.py`：

```python
class EchoPresenter:
    async def echo(self, message: str = "") -> str:
        return message

    async def add(self, a: int, b: int) -> int:
        return int(a) + int(b)

    def info(self) -> dict[str, Any]:
        return {"name": "EchoPresenter", "methods": ["echo", "add", "info"]}
```

注册在 `app/bridge_api.py`：

```python
def _register_builtins(self) -> None:
    self.register("echoPresenter", EchoPresenter())
```

调用：

```js
await pythonBridgeClient.call('echoPresenter', 'echo', ['hi'])
```

## 新增 presenter 的步骤

### 1. 写 presenter 类

`app/presenters/user_presenter.py`：

```python
from __future__ import annotations
from typing import Any

class UserPresenter:
    def __init__(self) -> None:
        self._db = {}  # 实际项目里换成连接池或 ORM

    async def get_profile(self, user_id: str) -> dict[str, Any]:
        if user_id not in self._db:
            raise LookupError(f"user '{user_id}' not found")
        return dict(self._db[user_id])

    async def update_profile(self, payload: dict[str, Any]) -> dict[str, Any]:
        user_id = payload.get("id")
        if not user_id:
            raise ValueError("id is required")
        self._db[user_id] = payload
        return {"ok": True}
```

### 2. 注册

```python
# app/bridge_api.py
from app.presenters import EchoPresenter, UserPresenter

def _register_builtins(self) -> None:
    self.register("echoPresenter", EchoPresenter())
    self.register("userPresenter", UserPresenter())
```

### 3. 暴露给 `from app.presenters import ...`

```python
# app/presenters/__init__.py
from .echo_presenter import EchoPresenter
from .user_presenter import UserPresenter

__all__ = ["EchoPresenter", "UserPresenter"]
```

### 4. 渲染端封装

```js
// web/src/services/user.js
import { pythonBridgeClient } from './bridge-client'

export const userService = {
  getProfile: (id) => pythonBridgeClient.call('userPresenter', 'get_profile', [id]),
  updateProfile: (payload) => pythonBridgeClient.call('userPresenter', 'update_profile', [payload])
}
```

完成。无需触碰路由、无需重启 watcher，热重载下立即可用。

## 设计建议

### 单一职责

一个 presenter 处理一个领域。复杂业务可以拆成多个 presenter：

- `userPresenter`：用户数据
- `authPresenter`：登录、登出
- `settingsPresenter`：偏好设置

### 错误用异常表达

```python
async def get_profile(self, user_id: str):
    user = self._db.get(user_id)
    if user is None:
        raise LookupError(f"user '{user_id}' not found")    # → 404 NOT_FOUND
    if not user["active"]:
        raise PermissionError(f"user '{user_id}' is disabled")
    return user
```

`LookupError` 自动映射成 404；其他异常映射成 500。需要更细的语义，可以扩展 `bridge_api.py` 加映射：

```python
class _BusinessError(Exception):
    code: str

try:
    ...
except _BusinessError as e:
    return JSONResponse(status_code=400, content={"status": "error", "code": e.code, "message": str(e)})
```

### 入参校验

简单类型直接靠 Python 类型提示就够了。复杂结构用 Pydantic：

```python
from pydantic import BaseModel

class UpdateProfilePayload(BaseModel):
    id: str
    name: str
    avatar_url: str | None = None

class UserPresenter:
    async def update_profile(self, payload: dict) -> dict:
        data = UpdateProfilePayload.model_validate(payload)  # 失败抛 ValidationError
        ...
```

### 长任务

`/api/bridge` 走 HTTP，建议响应在 10 秒内完成。需要长任务：

- **轮询**：返回 task_id，前端定时拉 status
- **WS 推送**：通过 `electron_api.call('progress.update', ...)` 把进度推回去
- **MCP / SSE**：未来扩展端点

## 异步与线程

Presenter 方法可同步可异步：

```python
class HeavyPresenter:
    async def quick_op(self):
        return "fast"

    def cpu_bound(self):
        # 同步、CPU 密集 → 会阻塞 event loop
        return sum(i * i for i in range(10_000_000))

    async def cpu_bound_safe(self):
        return await asyncio.to_thread(self._compute)

    def _compute(self):
        return sum(i * i for i in range(10_000_000))
```

IO 密集（数据库、HTTP）一律 `async def + await`；CPU 密集用 `asyncio.to_thread` 或 `loop.run_in_executor`。

## 调用 Electron 能力

Presenter 内部需要弹窗 / 读文件 / 显示通知时，用 `electron_api`：

```python
from app.electron_api.electron_api import electron_api

class FilePresenter:
    async def import_csv(self) -> dict:
        path = await electron_api.call('dialog.showOpenDialog', {
            'title': '选择 CSV 文件',
            'filters': [{'name': 'CSV', 'extensions': ['csv']}]
        }, timeout=30)
        if not path:
            return {'cancelled': True}

        content = await electron_api.read_file(path)
        rows = parse_csv(content)
        return {'rows_imported': len(rows)}
```

底层是通过 WebSocket 把请求发回 Electron 主进程，主进程执行后回写结果。完整流程见 [通信通道](/guide/communication)。
