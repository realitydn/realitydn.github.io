@echo off
title REALITY Poster Manager
color 0F

echo.
echo   REALITY Poster Manager
echo   ----------------------
echo.

where node >nul 2>&1
if errorlevel 1 goto nonode

cd /d "%~dp0tools\poster-manager"
if errorlevel 1 goto nodir

echo   Working directory: %cd%
echo.

if exist "node_modules\@img\sharp-win32-x64" goto skipinstall

echo   Installing dependencies (may take a minute)...
echo.
call npm install --include=optional
if errorlevel 1 goto installfail
echo.

:skipinstall

if not exist "originals" mkdir originals

echo   Starting server...
echo   Browser will open at http://localhost:4400
echo   Close this window to stop the server.
echo.

start "" cmd /c "ping -n 4 127.0.0.1 >nul && start http://localhost:4400"

node server.js

echo.
echo   Server stopped unexpectedly.
echo.
pause
goto end

:nonode
echo   ERROR: Node.js not found. Install it from https://nodejs.org
echo.
pause
goto end

:nodir
echo   ERROR: Could not find tools\poster-manager folder.
echo.
pause
goto end

:installfail
echo.
echo   ERROR: npm install failed.
echo.
pause
goto end

:end
