@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 goto node_missing
node -e "if(process.versions.node.split('.')[0]!=='24')process.exit(1)"
if errorlevel 1 goto node_missing
if exist node_modules goto prepare
echo Installing dependencies. Internet is required for this step.
call npm ci
if errorlevel 1 goto failed
:prepare
call npm run db:init
if errorlevel 1 goto failed
call npm run demo:seed
if errorlevel 1 goto failed
echo.
echo Open http://localhost:3000 in your browser after Ready appears.
echo Keep this window open. Press Ctrl+C to stop.
call npm run dev
goto end
:node_missing
echo Node.js 24.x is required. Install it from https://nodejs.org/
pause
exit /b 1
:failed
echo The application could not start. Copy the error shown above.
pause
exit /b 1
:end
endlocal
