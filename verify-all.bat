@echo off
chcp 65001 >nul
echo ===================================
echo   Droob - Verify All Services
echo ===================================
echo.
echo [1] Website (droob-jo.com)...
curl -s -o nul -w "  Result: HTTP %%{http_code}" https://droob-jo.com
echo.
echo.
echo [2] API Health...
curl -s https://api.droob-jo.com/health
echo.
echo [3] API Routes (count)...
curl -s "https://api.droob-jo.com/api/v1/routes?limit=500" > %TEMP%\routes.json
powershell -Command "(Get-Content %TEMP%\routes.json | ConvertFrom-Json).Count"
echo.
echo [4] OSRM Routing...
curl -s -o nul -w "  Result: HTTP %%{http_code}" "https://droob-osrm.fly.dev/route/v1/driving/35.9106,31.9539;35.9335,31.9516?overview=false"
echo.
echo [5] Dashboard...
curl -s -o nul -w "  Result: HTTP %%{http_code}" https://admin.droob-jo.com
echo.
echo [6] APK Download...
curl -s -o nul -w "  Result: HTTP %%{http_code}" -L https://droob-jo.com/download
echo.
echo.
echo ===================================
echo   Verification Complete
echo ===================================
pause
