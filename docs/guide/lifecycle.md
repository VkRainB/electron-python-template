# 守护与生命周期

后端有两个关键管理器：`DaemonManager` 与 `LifecycleManager`。

## DaemonManager

`app/daemon_manager.py`，职责：

- 维护 `daemon.pid` / `daemon.version` / `daemon.port` 三个元数据文件
- 启动前检测是否已有同版本守护进程
- 端口探测：默认 47821 被占用时按 +1 递增
- 客户端连接计数（WS / `/daemon/connect`）

### 元数据目录

```python
def _resolve_base_dir() -> Path:
    dir_name = get_daemon_dir_name()
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / dir_name
    return Path.home() / dir_name
```

- Windows：`%LOCALAPPDATA%\app_electron\`
- macOS / Linux：`~/.app_electron/`

目录名来自 `app.config.json.daemon.dirName`。

### 启动前检测

```python
def check_existing(self) -> Optional[dict]:
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
```

僵尸识别用 `psutil.Process.status()`：

```python
def is_pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        if not psutil.pid_exists(pid):
            return False
        proc = psutil.Process(pid)
        return proc.status() != psutil.STATUS_ZOMBIE
    except (psutil.NoSuchProcess, psutil.AccessDenied, Exception):
        return False
```

### 端口探测

```python
def resolve_port(self, preferred: int | None = None, host: str | None = None) -> int:
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
            return cand

    raise RuntimeError(f"无可用端口（探测了 {preferred}~{preferred + probe_range}）")
```

最多探测 50 个端口；都不通才报错。

### 客户端引用计数

```python
def on_client_connect(self, session_id: str) -> None: ...
def on_client_disconnect(self, session_id: str) -> None: ...
def active_count(self) -> int: ...
```

调用方：

- `/ws/electron` 接入与断开
- `/daemon/connect` / `/daemon/disconnect`（给 CLI 等非 WS 客户端用）

只要 `active_count > 0`，LifecycleManager 就会持续重置空闲计时。

### snapshot

```python
def snapshot(self) -> dict:
    return {
        "pid": os.getpid(),
        "version_file": str(self.version_file),
        "port": self.current_port,
        "active_clients": self.active_count(),
        "started_at": self.started_at.isoformat(),
        "base_dir": str(self.base_dir),
    }
```

经由 `/daemon/status` 暴露给主进程。

## LifecycleManager

`app/lifecycle_manager.py`，职责：

- 维持一个 `_last_active` 时间戳
- 启动一个 30s 周期的检查任务
- 没有活跃客户端 + 闲置超过阈值 → 软退出（SIGTERM 自己）

### 关键参数

```python
DEFAULT_IDLE_SECONDS = 48 * 3600      # 48 小时
CHECK_INTERVAL_SECONDS = 30
```

启动时可被覆盖：`python main.py --daemon --idle-timeout 60`。

### 检查循环

```python
async def _watch_loop(self) -> None:
    while not self._stopped:
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
        if self.daemon.active_count() > 0:
            self.touch()
            continue
        idle = (datetime.now(timezone.utc) - self._last_active).total_seconds()
        if idle >= self.idle_seconds:
            self._soft_exit()
            return
```

- 有客户端连着 → 强制 touch，永不超时
- 没有客户端 + 距上次活跃 >= 阈值 → 软退出

### 软退出实现

```python
def _soft_exit(self) -> None:
    try:
        self.daemon.release_lock()
    except Exception as e:
        logger.warning(f"[lifecycle] release_lock 失败：{e}")
    if hasattr(signal, "SIGTERM"):
        try:
            os.kill(os.getpid(), signal.SIGTERM)
            return
        except OSError:
            pass
    os._exit(0)
```

先释放元数据再 SIGTERM；这样下次启动会发现 meta 不存在直接 spawn 新进程。

### touch 来源

```python
# server.py 全局中间件
@fastapi_app.middleware("http")
async def _touch_lifecycle(request: Request, call_next):
    if lifecycle is not None:
        try:
            lifecycle.touch()
        except Exception:
            pass
    return await call_next(request)

# /ws/electron 接入 / 断开钩子也会 touch
```

HTTP 每个请求 touch；WS 长连接靠 `active_count > 0` 直接续期。

## 排查表

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 启动报 `RuntimeError: 无可用端口` | 47821 起 50 个端口全被占 | 关掉占端口的进程或调大 `portProbeRange` |
| 启动后立即退出 | `check_existing` 返回旧 daemon | 检查 meta 文件是否对应活进程 |
| daemon 一直不退出 | 有客户端没断开 | `GET /api/electron/stats` 看 WS；`GET /daemon/status` 看 active_clients |
| daemon 总是在 48 小时后死 | LifecycleManager 默认空闲软退出 | 在主进程里定时调用 `/health` 或保持 WS 长连 |
| meta 留下僵尸 | 进程被强杀 | 自动清理；手动可直接删 meta 目录 |
