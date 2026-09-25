@echo off
title ContentFlow Stopper

echo Stopping ContentFlow servers...

REM Kill the project windows by title
taskkill /FI "WINDOWTITLE eq ContentFlow-Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ContentFlow-Frontend" /F >nul 2>&1

REM Fallback: kill anything listening on ports 8000 and 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1

echo All stopped.
pause
