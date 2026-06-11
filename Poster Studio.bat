@echo off
title REALITY Poster Studio
color 0F

echo.
echo   REALITY Poster Studio
echo   ---------------------
echo.

where node >nul 2>&1
if errorlevel 1 goto nonode

cd /d "%~dp0"

echo   Starting Poster Studio...
echo   Browser will open at http://localhost:4501
echo   Close this window to stop.
echo.

rem Free port 4501 if a previous server is still running.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":4501 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

rem Open the Studio once the server has had a moment to start.
start "" cmd /c "ping -n 3 127.0.0.1 >nul && start http://localhost:4501/"

node "tools\serve-studio.cjs"

echo.
echo   Server stopped.
echo.
pause
goto end

:nonode
echo   ERROR: Node.js not found. Install it from https://nodejs.org
echo.
pause
goto end

:end
