@echo off
setlocal
cd /d %~dp0
call venv\Scripts\activate.bat
pyinstaller --noconfirm --clean build.spec
echo Built (see dist/, name driven by app.config.json backend.binaryName)
endlocal
