#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
source venv/bin/activate
pyinstaller --noconfirm --clean build.spec
echo "Built: dist/app_python"
