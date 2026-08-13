@echo off
REM YT Clip Downloader - Windows start
REM Server start karke browser mein app khol deta hai. Is window ko band karne se app band ho jayega.
setlocal
cd /d "%~dp0.."

set NODE=node
where node >nul 2>nul
if not %errorlevel%==0 (
  if exist app\runtime\node\node.exe (
    set NODE=app\runtime\node\node.exe
  ) else (
    echo [X] Node.js nahi mila. Pehle setup.bat chalao.
    pause
    exit /b 1
  )
)

if not exist app\bin\yt-dlp.exe (
  echo [X] Tools missing hain. Pehle setup.bat chalao.
  pause
  exit /b 1
)

echo YT Clip Downloader start ho raha hai - http://localhost:3777
echo    (Is window ko band karne se app band ho jayega)
start "" cmd /c "timeout /t 3 >nul & start "" http://localhost:3777"
"%NODE%" app\server.js
pause
