@echo off
chcp 65001 > nul
echo ========================================================
echo  LYRICPHONICS - BYTEDANCE PIANO AI SERVICE (PORT 8000)
echo ========================================================

cd /d "%~dp0"

if not exist "pyenv\Scripts\python.exe" (
    echo [!] Chưa tìm thấy môi trường Python. Đang tiến hành cài đặt...
    call setup.bat
)

echo [*] Khởi động ByteDance High-Resolution Piano AI Service...
pyenv\Scripts\python.exe main.py
pause
