@echo off
chcp 65001 > nul
echo ========================================================
echo  LYRICPHONICS - BYTEDANCE PIANO AI SERVICE SETUP
echo ========================================================

cd /d "%~dp0"

if not exist "pyenv" (
    echo [*] Đang khởi tạo môi trường Python (pyenv)...
    python -m venv pyenv
)

echo [*] Đang cài đặt thư viện cần thiết...
call pyenv\Scripts\python.exe -m pip install --upgrade pip
call pyenv\Scripts\python.exe -m pip install -r requirements.txt

echo [✓] Cài đặt hoàn tất! Bạn có thể chạy 'run.bat' để khởi động dịch vụ.
pause
