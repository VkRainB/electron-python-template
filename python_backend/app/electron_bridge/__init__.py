"""WebSocket 反向通信模块。

公开导出：WSManager / electron_client。
内部子模块：models、callback_manager、ws_manager、electron_client。
"""

from .electron_client import electron_client
from .ws_manager import WSManager

__all__ = ["WSManager", "electron_client"]
