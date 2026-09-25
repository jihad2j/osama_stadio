@echo off
title ContentFlow Launcher
cd /d "%~dp0"

echo ============================================
echo   ContentFlow - Starting...
echo ============================================
echo.

REM --- 1) Backend ---
if not exist "backend\venv\Scripts\python.exe" (
  echo [ERROR] Python venv not found: backend\venv
  pause
  exit /b 1
)
echo [1/3] Starting backend on http://localhost:8000 ...
start "ContentFlow-Backend" /d "%~dp0backend" cmd /k venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

REM --- 2) Frontend deps (first run only) ---
if not exist "frontend\node_modules" (
  echo [2/3] Installing frontend packages - first run only, may take minutes...
  pushd "%~dp0frontend"
  call npm install
  popd
) else (
  echo [2/3] Frontend packages found, skipping install.
)

REM --- 3) Frontend ---
echo [3/3] Starting frontend on http://localhost:3000 ...
start "ContentFlow-Frontend" /d "%~dp0frontend" cmd /k npm run dev

echo.
echo Waiting for servers to boot...
timeout /t 12 /nobreak >nul
start http://localhost:3000

echo.
echo ============================================
echo   Done! Frontend: http://localhost:3000
echo   Backend docs : http://localhost:8000/docs
echo   To stop everything: run stop.bat
echo ============================================
pause
