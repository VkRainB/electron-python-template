# 使用流程

本章是「拿到一份打包安装包」之后的视角：从安装到卸载。

## 安装

### Windows

1. 双击 `momo_py-0.1.1-setup.exe`
2. NSIS 安装向导：选择安装目录、是否创建桌面快捷方式
3. 默认安装到 `%LOCALAPPDATA%\Programs\<productName>`
4. 完成后桌面会有「创工坊」图标

### macOS

1. 打开 `.dmg`
2. 把应用拖到 Applications
3. 首次启动时若提示「来自身份不明开发者」，到「系统设置 > 隐私与安全性」点「仍要打开」

### Linux

```bash
# AppImage
chmod +x momo_py-0.1.1.AppImage
./momo_py-0.1.1.AppImage

# deb（Ubuntu / Debian）
sudo dpkg -i momo_py_0.1.1_amd64.deb

# snap
sudo snap install --dangerous momo_py_0.1.1_amd64.snap
```

## 首次启动

启动后会发生：

1. Electron 主进程拉起
2. 检查 `%LOCALAPPDATA%\app_electron\` 下的 daemon 元数据
3. 没有元数据 → spawn `mo_server.exe`（Windows 单文件）或 `mo_server/mo_server`（macOS / Linux 目录形式）
4. 监听到 Python `/health` 返回 200 → 显示主窗口

约 1 秒（守护命中）到 5 秒（首次冷启动）。

## 数据与配置位置

| 项 | Windows | macOS / Linux |
| --- | --- | --- |
| daemon meta | `%LOCALAPPDATA%\app_electron\` | `~/.app_electron/` |
| 用户偏好 | localStorage（在 Electron 用户目录） | 同左 |
| 日志 | 暂时只 stdout，未落盘 | 同左 |

## 二次启动

如果上次没把 Python 强杀，二次启动会复用驻留进程，启动时间从 5 秒降到 1 秒以内。

如果驻留进程在 48 小时空闲后自动退出，下次启动重新冷启动。

## 退出

正常退出：关闭主窗口 → `before-quit` 钩子 → `bridge.disconnect()` → `pythonService.stop()` → app.quit()。

异常退出（强杀 Electron）：

- 守护模式下 Python 不一定立刻退出，等空闲软退出生效
- 元数据可能留下僵尸 PID，下次启动自动识别清理

## 升级

新版本安装包覆盖安装：

1. electron-builder 维护新旧版本的产物
2. 启动时检测 `daemon.version` 与当前不一致 → 主进程 kill 旧 Python，spawn 新版
3. 用户感知：第一次冷启动慢约 5 秒，之后正常

如果配置了 `electron-updater`（模板里 `electron-updater` 已安装但默认不开启）：

- 在线检查更新
- 下载差分包
- 重启应用应用更新

## 卸载

### Windows

控制面板 → 程序与功能 → 卸载，或安装目录下的 `Uninstall.exe`。

卸载完成后建议手动清理：

```
%LOCALAPPDATA%\app_electron\
```

### macOS

把 Applications 里的图标拖进废纸篓。手动清理：

```
~/.app_electron/
~/Library/Application Support/<productName>/
```

### Linux

```bash
# deb
sudo dpkg -r momo_py

# snap
sudo snap remove momo_py

# AppImage 直接删文件
```

清理：

```
~/.app_electron/
~/.config/<productName>/
```

## 排查表

| 现象 | 原因 / 处理 |
| --- | --- |
| 启动 5 秒还没出窗口 | Python 冷启动，等一下；日志看 `[main] === Electron starting ===` |
| 提示「端口被占用」 | 47821 起 50 个端口都被占，关掉占端口的进程或删 `daemon.port` |
| 升级后还连旧 Python | 关闭应用 → 删 `%LOCALAPPDATA%\app_electron\` → 重新打开 |
| 杀毒软件报警 | PyInstaller 单文件 exe 容易被识别为可疑；可以改用 onedir 形式或签名 |
| 重启 Python | 设置页里有「重启后端」按钮，调 `python:restart` |
| 显示「Bridge 未连接」 | WS 断开，等指数退避重连；或检查 Python 是否在跑 |
