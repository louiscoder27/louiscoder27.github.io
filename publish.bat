@echo off
setlocal enabledelayedexpansion
rem Move to this script's own folder so git runs in the project regardless of where it's launched.
cd /d "%~dp0"

echo ============================================
echo   Publish blog to GitHub Pages
echo ============================================
echo.

rem Use text after the .bat as the message, or ask, or fall back to a default.
set "msg=%*"
if "%msg%"=="" set /p "msg=Commit message (press Enter for default): "
if "%msg%"=="" set "msg=Update content"

echo.
echo [1/3] Staging changes...
git add -A

echo [2/3] Committing...
git commit -m "%msg%"
if errorlevel 1 (
  echo    ^(Nothing new to commit - continuing to push anyway.^)
)

echo [3/3] Pushing to GitHub...
git push
if errorlevel 1 (
  echo.
  echo ***  Push FAILED. Check your internet or GitHub login, then run again.  ***
  echo.
  pause
  exit /b 1
)

echo.
echo Done. GitHub Actions will rebuild and deploy in ~1-2 minutes.
echo   Progress: https://github.com/louiscoder27/louiscoder27.github.io/actions
echo   Live site: https://louiscoder27.github.io
echo.
pause
