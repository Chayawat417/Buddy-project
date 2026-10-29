@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Buddy needs Node.js and npm to run.
  echo Install Node.js 22.12 or later, then open this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Preparing Buddy for first use. This may take a few minutes.
  call npm install
  if errorlevel 1 (
    echo Setup did not finish. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo Keep this window open while using Buddy.
echo Close this window when you want to stop Buddy.
call npm run dev -- --host 127.0.0.1 --open

if errorlevel 1 (
  echo Buddy could not start. Check the messages above.
  pause
)

endlocal
