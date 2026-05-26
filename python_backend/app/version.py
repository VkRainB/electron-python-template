"""应用版本号。

来源：app.config.json 中的 app.version 字段。
保留 APP_VERSION 常量以便调用方不需修改。
"""

from app.app_config import get_app

APP_VERSION: str = get_app()["version"]
