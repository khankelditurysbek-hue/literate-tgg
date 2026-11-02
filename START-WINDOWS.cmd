@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 goto node_missing
node -e "if(process.versions.node.split('.')[0]!=='24')process.exit(1)"
if errorlevel 1 goto node_missing
node -e "const fs=require('fs'),c=require('crypto');try{const a=c.createHash('sha256').update(fs.readFileSync('package-lock.json')).digest('hex');process.exit(fs.readFileSync('node_modules/.qarjy-lock.sha256','utf8')===a?0:1)}catch{process.exit(1)}"
if not errorlevel 1 goto prepare
echo Installing dependencies. Internet is required for this step.
call npm ci
if errorlevel 1 goto failed
node -e "const fs=require('fs'),c=require('crypto');fs.writeFileSync('node_modules/.qarjy-lock.sha256',c.createHash('sha256').update(fs.readFileSync('package-lock.json')).digest('hex'))"
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
