@echo off
setlocal
rem Script khud ko TEMP me copy karke wahan se chalta hai - taaki update ke
rem dauran yeh file overwrite hone par script beech me kharab na ho.
if /i not "%~nx0"=="ytcd-update-runner.bat" (
    copy /y "%~f0" "%TEMP%\ytcd-update-runner.bat" >nul
    "%TEMP%\ytcd-update-runner.bat" "%~dp0.."
    exit /b
)

title YT Clip Downloader - Update
set "ROOT=%~f1"
cd /d "%ROOT%"

set "REPO=soubickdas-lab/yt-clip-downloader"
set "BRANCH=master"
set "TMP=%TEMP%\ytcd-update"

echo ============================================================
echo   YT Clip Downloader - Update
echo ============================================================
echo.
echo GitHub se latest version download ho raha hai...

if exist "%TMP%" rd /s /q "%TMP%"
mkdir "%TMP%"

curl -L --fail -o "%TMP%\update.zip" "https://codeload.github.com/%REPO%/zip/refs/heads/%BRANCH%"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Download fail ho gaya. Internet connection check karein.
    echo.
    pause
    exit /b 1
)

tar -xf "%TMP%\update.zip" -C "%TMP%"
if %errorlevel% neq 0 (
    echo ERROR: Zip extract nahi ho paya.
    pause
    exit /b 1
)

rem Purani version file delete karo
del /q "version *.txt" >nul 2>nul

rem Nayi files copy karo. /PURGE use NAHI kar rahe - isliye aapke
rem app\bin (tools), app\cache aur app\runtime safe rehte hain.
rem (Clips waise bhi system ke Downloads folder mein hoti hain, yahan nahi.)
robocopy "%TMP%\yt-clip-downloader-%BRANCH%" "%ROOT%" /E /XD node_modules .git >nul
if %errorlevel% geq 8 (
    echo ERROR: Files copy nahi ho payi.
    pause
    exit /b 1
)

rd /s /q "%TMP%"

echo.
if exist "version *.txt" (
    for %%f in ("version *.txt") do echo   Update complete! Ab aap "%%~nf" par ho.
) else (
    echo   Update complete!
)
echo.
echo   Ab 'start-local.bat' double-click karke app chalao.
echo.
pause
