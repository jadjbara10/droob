@echo off
chcp 65001 >nul
echo === Deploy API Proxy Worker (droob-api-proxy) ===
cd /d D:\trans_app\droob\docs\api-worker
npx wrangler deploy
echo.
echo === Verify ===
curl -s https://api.droob-jo.com/health
echo.
pause
