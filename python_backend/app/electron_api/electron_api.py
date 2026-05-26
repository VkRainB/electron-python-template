"""业务友好封装：把常用 Electron 能力包装成 Python 函数。

用法：
  from app.electron_api import electron_api
  await electron_api.show_notification(title='hi', body='from python')
"""

from __future__ import annotations

from typing import Any, Optional

from app.electron_bridge.electron_client import electron_client


class ElectronAPI:
    async def show_notification(self, title: str, body: str = "") -> Any:
        return await electron_client.call(
            "show_notification", {"title": title, "body": body}
        )

    async def open_url(self, url: str) -> Any:
        return await electron_client.call("open_url", {"url": url})

    async def read_file(self, path: str) -> str:
        return await electron_client.call("read_file", {"path": path})

    async def write_file(self, path: str, content: str) -> Any:
        return await electron_client.call(
            "write_file", {"path": path, "content": content}
        )

    async def window_minimize(self) -> Any:
        return await electron_client.call("window.minimize", {})

    async def window_close(self) -> Any:
        return await electron_client.call("window.close", {})

    async def log_to_electron(
        self, message: str, level: str = "info", extra: Optional[dict] = None
    ) -> None:
        await electron_client.notify(
            "log", {"message": message, "level": level, "extra": extra or {}}
        )

    async def call(
        self,
        action: str,
        params: Optional[dict] = None,
        timeout: float = 30.0,
    ) -> Any:
        return await electron_client.call(action, params, timeout)


electron_api = ElectronAPI()
