@echo off
setlocal EnableDelayedExpansion
title Gatekeepr Launcher

set "BACKEND_PID="
set "FRONTEND_PID="

:menu
echo.
echo =========================
echo  GATEKEEPR LAUNCHER
echo =========================
echo 1. Start Services
echo 2. Stop Services
echo 3. Exit
echo.

set /p choice=Select: 

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto exit_launcher

echo Invalid selection.
goto menu

:start

if defined BACKEND_PID (
    tasklist /FI "PID eq !BACKEND_PID!" | find "!BACKEND_PID!" >nul
    if not errorlevel 1 (
        echo.
        echo Services are already running.
        goto menu
    )
)

echo.
echo Starting backend...

for /f %%p in ('
    powershell -NoProfile -Command "$p=Start-Process cmd -ArgumentList '/c cd /d D:\LOCAL-GATEKEEPR\gatekeepr-backend && venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000' -WindowStyle Minimized -PassThru; $p.Id"
') do set BACKEND_PID=%%p

echo Backend PID: !BACKEND_PID!

echo.
echo Starting frontend...

for /f %%p in ('
    powershell -NoProfile -Command "$p=Start-Process cmd -ArgumentList '/c cd /d D:\LOCAL-GATEKEEPR\frontend-gatekeepr && npm run dev' -WindowStyle Minimized -PassThru; $p.Id"
') do set FRONTEND_PID=%%p

echo Frontend PID: !FRONTEND_PID!

echo.
echo Opening Gatekeepr...
timeout /t 5 /nobreak >nul

start "" "http://localhost:5173/"

echo.
echo Gatekeepr started successfully.
goto menu

:stop
echo.
echo Stopping services...

if defined BACKEND_PID (
    taskkill /PID !BACKEND_PID! /T /F >nul 2>&1
    echo Backend stopped.
    set "BACKEND_PID="
) else (
    echo Backend not running.
)

if defined FRONTEND_PID (
    taskkill /PID !FRONTEND_PID! /T /F >nul 2>&1
    echo Frontend stopped.
    set "FRONTEND_PID="
) else (
    echo Frontend not running.
)

echo Services stopped.
goto menu

:exit_launcher
echo.
echo Stopping services before exit...

if defined BACKEND_PID (
    taskkill /PID !BACKEND_PID! /T /F >nul 2>&1
    echo Backend stopped.
)

if defined FRONTEND_PID (
    taskkill /PID !FRONTEND_PID! /T /F >nul 2>&1
    echo Frontend stopped.
)

echo.
echo Goodbye.
exit