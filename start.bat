@echo off
REM BossBot Startup Script for Windows

echo 🚀 Starting BossBot...

REM Check if .env exists
if not exist .env (
    echo ❌ Error: .env file not found!
    echo Please copy .env.example to .env and configure it.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies...
    call npm install
)

REM Start the bot
echo 🎉 Starting BossBot...
node index.js

pause
