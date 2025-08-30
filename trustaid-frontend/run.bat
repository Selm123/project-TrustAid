@echo off
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Please install Node.js and npm first: https://nodejs.org/
  exit /b 1
)
call npm install
call npm run dev