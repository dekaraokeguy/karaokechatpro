@echo off

title Karaoke Startup System

cd /d "C:\Users\calde\Desktop\MAY 2 OVERLAY AND HEARTS WORKING NO DOWNLOAD VERSION 10"

echo ============================
echo STARTING KARAOKE SERVER
echo ============================

call "C:\Users\calde\AppData\Roaming\npm\pm2.cmd" restart karaoke

echo.
echo WAITING...
timeout /t 3

echo.
echo ============================
echo STARTING CLOUDFLARE TUNNEL
echo ============================

call "C:\Cloudflared\cloudflared.exe" tunnel --url http://localhost:3001

echo.
echo ============================
echo SYSTEM CLOSED
echo ============================

pause