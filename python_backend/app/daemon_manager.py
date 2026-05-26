"""守护进程管理：PID/版本/端口文件 + 活跃连接计数 + 端口探测。

文件目录：
- Windows: %LOCALAPPDATA%/app_electron/
- Unix:    ~/.app_electron/

三个元数据文件：
- daemon.pid     当前进程 PID
- daemon.version 进程版本号（与 APP_VERSION 一致）
- daemon.port    实际监听端口
"""

from __future__ import annotations

import json
import os
import socket
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import psutil

from app.app_config import get_daemon_dir_name
from app.logger import get_logger

logger = get_logger(__name__)


def _resolve_base_dir() -> Path:
    dir_name = get_daemon_dir_name()
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / dir_name
    return Path.home() / dir_name


def is_pid_alive(pid: int) -> bool:
    """跨平台 PID 存活检测。"""
    if pid <= 0:
        return False
    try:
        if not psutil.pid_exists(pid):
            return False
        proc = psutil.Process(pid)
        return proc.status() != psutil.STATUS_ZOMBIE
    except (psutil.NoSuchProcess, psutil.AccessDenied, Exception):
        return False


def _is_port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        try:
            s.bind((host, port))
            return False
        except OSError:
            return True


class DaemonManager:
    def __init__(self, base_dir: Optional[Path] = None) -> None:
        self.base_dir: Path = base_dir or _resolve_base_dir()
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.started_at: datetime = datetime.now(timezone.utc)
        self.current_port: Optional[int] = None
        self._clients: dict[str, datetime] = {}
        self._lock = threading.Lock()

    @property
    def pid_file(self) -> Path:
        return self.base_dir / "daemon.pid"

    @property
    def version_file(self) -> Path:
        return self.base_dir / "daemon.version"

    @property
    def port_file(self) -> Path:
        return self.base_dir / "daemon.port"

    # ---- 启动流程 ----
    def check_existing(self) -> Optional[dict]:
        """检查是否已有 daemon。返回 {pid, version, port} 或 None。

        判断逻辑：
        - 三个文件全部存在且 PID 存活 → 返回元数据
        - PID 不存活（僵尸锁） → 自动清理后返回 None
        """
        try:
            if not (self.pid_file.exists() and self.port_file.exists()):
                return None
            pid = int(self.pid_file.read_text(encoding="utf-8").strip())
            port = int(self.port_file.read_text(encoding="utf-8").strip())
            version = (
                self.version_file.read_text(encoding="utf-8").strip()
                if self.version_file.exists()
                else ""
            )
        except (ValueError, OSError) as e:
            logger.warning(f"[daemon] 解析元数据失败：{e}，清理重建")
            self._silent_unlink_all()
            return None

        if not is_pid_alive(pid):
            logger.warning(f"[daemon] 发现僵尸 PID 文件 pid={pid}，自动清理")
            self._silent_unlink_all()
            return None

        return {"pid": pid, "version": version, "port": port}

    def acquire_lock(self, current_pid: int, version: str, port: int) -> bool:
        try:
            self.pid_file.write_text(str(current_pid), encoding="utf-8")
            self.version_file.write_text(version, encoding="utf-8")
            self.port_file.write_text(str(port), encoding="utf-8")
            self.current_port = port
            logger.info(
                f"[daemon] 写入元数据：pid={current_pid} version={version} port={port} dir={self.base_dir}"
            )
            return True
        except OSError as e:
            logger.error(f"[daemon] 写入元数据失败：{e}")
            return False

    def release_lock(self) -> None:
        self._silent_unlink_all()
        logger.info("[daemon] 已清理元数据文件")

    def _silent_unlink_all(self) -> None:
        for p in (self.pid_file, self.version_file, self.port_file):
            try:
                if p.exists():
                    p.unlink()
            except OSError:
                pass

    # ---- 端口选择 ----
    def resolve_port(self, preferred: int | None = None, host: str | None = None) -> int:
        """按优先级选定可用端口。

        1. preferred 端口可用 → 直接用
        2. 不可用 → 从 preferred+1 起递增探测 portProbeRange 个端口
        """
        from app.app_config import get_backend

        backend = get_backend()
        if preferred is None:
            preferred = int(backend["defaultPort"])
        if host is None:
            host = backend["host"]
        probe_range = int(backend.get("portProbeRange", 50))

        if not _is_port_in_use(host, preferred):
            return preferred
        for offset in range(1, probe_range + 1):
            cand = preferred + offset
            if not _is_port_in_use(host, cand):
                logger.info(f"[daemon] 端口 {preferred} 占用，回退到 {cand}")
                return cand
        raise RuntimeError(f"无可用端口（探测了 {preferred}~{preferred + probe_range}）")

    # ---- 连接计数（任务 06 调用） ----
    def on_client_connect(self, session_id: str) -> None:
        with self._lock:
            self._clients[session_id] = datetime.now(timezone.utc)
        logger.info(f"[daemon] client connect session={session_id} total={len(self._clients)}")

    def on_client_disconnect(self, session_id: str) -> None:
        with self._lock:
            self._clients.pop(session_id, None)
        logger.info(f"[daemon] client disconnect session={session_id} total={len(self._clients)}")

    def active_count(self) -> int:
        with self._lock:
            return len(self._clients)

    def snapshot(self) -> dict:
        return {
            "pid": os.getpid(),
            "version_file": str(self.version_file),
            "port": self.current_port,
            "active_clients": self.active_count(),
            "started_at": self.started_at.isoformat(),
            "base_dir": str(self.base_dir),
        }
