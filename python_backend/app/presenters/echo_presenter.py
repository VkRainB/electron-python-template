"""示例 presenter：仅用于验证调用链。

新增 presenter：
- 创建 module 暴露类
- 在 app/bridge_api.py 的 _register_builtins 中实例化 + register
"""

from __future__ import annotations

from typing import Any


class EchoPresenter:
    async def echo(self, message: str = "") -> str:
        return message

    async def add(self, a: int, b: int) -> int:
        return int(a) + int(b)

    def info(self) -> dict[str, Any]:
        return {"name": "EchoPresenter", "methods": ["echo", "add", "info"]}
