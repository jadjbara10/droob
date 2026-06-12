@echo off
chcp 65001 >nul
echo ============================================
echo   WARNING: This will ROLLBACK all code
echo   to the last known stable version!
echo ============================================
echo.
set /p CONFIRM="Type YES to confirm rollback: "
if not "%CONFIRM%"=="YES" (
    echo Cancelled.
    pause
    exit /b 0
)
cd /d D:\trans_app\droob
git reset --hard v6.1.0-stable
git push origin main --force
echo.
echo Rollback complete! All services need redeployment.
pause
