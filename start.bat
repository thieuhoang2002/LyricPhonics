@echo off
title LyricPhonics - Full-Stack Launcher
echo ===================================================
echo   Starting LyricPhonics (.NET 8 Backend + Next.js)
echo ===================================================
echo.

echo [1/2] Starting Backend (.NET 8 Web API on http://localhost:5000)...
start "LyricPhonics Backend (.NET 8)" cmd /k "cd /d %~dp0backend\src\LyricPhonics.Api && dotnet run"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (Next.js on http://localhost:3000)...
start "LyricPhonics Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   Both services are launching!
echo   - Backend:  http://localhost:5000 (Swagger: /swagger)
echo   - Frontend: http://localhost:3000
echo ===================================================
echo.
pause
