@echo off
rem Move to this script's folder so npm runs in the project.
cd /d "%~dp0"

echo ============================================
echo   Local preview (khong can deploy)
echo ============================================
echo.
echo   Dia chi: http://localhost:4321
echo   Trinh duyet se tu mo khi san sang.
echo.
echo   -^> De DUNG xem: bam Ctrl + C, hoac dong cua so nay.
echo.

rem Start the Astro dev server and open the browser automatically.
call npm run dev -- --open
