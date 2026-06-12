@echo off
chcp 65001 >nul
echo === Deploy Website Worker (droob-site) ===
cd /d D:\trans_app\droob\docs\worker
npx wrangler deploy
echo.
echo === Verify ===
curl -s -o nul -w "HTTP %%{http_code}" https://droob-jo.com
echo.
pause
