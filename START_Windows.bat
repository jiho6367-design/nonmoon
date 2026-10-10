@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 goto error

node -e "if(Number(process.versions.node.split('.')[0])!==24){console.error('Node.js 24.x is required.');process.exit(1);}"
if errorlevel 1 goto error
node -e "if(require('./package.json').name!=='nonmoon-personal-improvement'){console.error('Open this launcher from the extracted project root.');process.exit(1);}"
if errorlevel 1 goto error

echo [1/3] Installing dependencies in the project root...
call npm ci
if errorlevel 1 goto error

echo [2/3] Building the application...
call npm run build
if errorlevel 1 goto error

echo [3/3] Starting Nonmoon...
echo Open http://localhost:4000 after the server startup message appears.
echo Keep this window open. Press Ctrl+C to stop.
call npm start
if errorlevel 1 goto error
exit /b 0

:error
echo.
echo Startup failed. Please share the error shown above.
pause
exit /b 1
