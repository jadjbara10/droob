@echo off
chcp 65001 >nul
echo === Build Dashboard ===
cd /d D:\trans_app\droob\dashboard
call npx tsc --noEmit
if errorlevel 1 (
    echo TypeScript errors found! Aborting.
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo Build failed! Aborting.
    pause
    exit /b 1
)
echo.
echo === Push to GitHub (triggers Vercel auto-deploy) ===
cd /d D:\trans_app\droob
git add -A
set /p MSG="Commit message: "
git commit -m "%MSG%"
git push origin main
echo.
echo Done! Vercel will auto-deploy from GitHub.
pause
