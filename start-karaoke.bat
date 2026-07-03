@echo off
title 🎤 Karaoke Auto Launcher
color 0A

echo ================================
echo 🚀 STARTING KARAOKE SYSTEM...
echo ================================

:: ✅ STEP 1 — START SERVER
echo Starting Node server...
start cmd /k "node server.js"

:: ⏳ WAIT FOR SERVER TO BOOT
timeout /t 3 >nul

:: ✅ STEP 2 — START NGROK
echo Starting ngrok...
start cmd /k "ngrok http 3001"

:: ⏳ WAIT FOR NGROK
timeout /t 5 >nul

:: ✅ STEP 3 — OPEN LOCAL PAGES
echo Opening app pages...

start http://localhost:3001/chat.html
start http://localhost:3001/control.html
start http://localhost:3001/overlay.html

echo ================================
echo ✅ SYSTEM READY
echo ================================

pause