"""Bridge API：将 HTTP 请求动态分发到 presenter.method(*args)。

错误模型：
- LookupError    → presenter / method 未找到（HTTP 404, code NOT_FOUND）
- 其他异常      → 业务执行异常（HTTP 500, code INTERNAL）
"""

from __future__ import annotations

import inspect
from typing import Any

from app.logger import get_logger
from app.presenters import EchoPresenter

logger = get_logger(__name__)


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
