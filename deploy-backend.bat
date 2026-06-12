@echo off
chcp 65001 >nul
echo === Deploy Backend to Fly.io ===
cd /d D:\trans_app\droob\backend
fly deploy -a droob-api --remote-only
echo.
echo === Verify ===
curl -s https://api.droob-jo.com/health
echo.
pause
