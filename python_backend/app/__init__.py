"""app 业务包根。

模块结构：
- logger.py: 统一日志入口
- version.py: 版本号
- bridge_api.py: presenter 动态调度（任务 05）
- server/: FastAPI 路由（任务 03/07）
- daemon_manager.py / lifecycle_manager.py: 守护进程（任务 04）
- electron_bridge/: WS 反向通信（任务 06）
- electron_api/: 上层封装（任务 06）
"""
