@echo off
REM YT Clip Downloader - Windows setup
REM Yeh script zaroori tools download karta hai: node, yt-dlp, ffmpeg, ffprobe, deno
setlocal
cd /d "%~dp0.."

if not exist app\bin mkdir app\bin
if not exist app\downloads mkdir app\downloads

echo ==^> Windows setup shuru...

REM ---- Node.js (agar system par nahi hai to portable copy) ----
where node >nul 2>nul
if %errorlevel%==0 (
  for /f "delims=" %%v in ('node -v') do echo ==^> Node.js mil gaya: %%v
  goto :ytdlp
)
if exist app\runtime\node\node.exe (
  echo ==^> Bundled Node.js already installed
  goto :ytdlp
)
echo ==^> Node.js download ho raha hai...
curl -L -o "%TEMP%\ytcd-node.zip" "https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip"
if not exist app\runtime mkdir app\runtime
tar -xf "%TEMP%\ytcd-node.zip" -C app\runtime
del "%TEMP%\ytcd-node.zip"
ren "app\runtime\node-v22.14.0-win-x64" node
echo ==^> Node.js installed (bundled)

:ytdlp
REM ---- yt-dlp ----
if not exist app\bin\yt-dlp.exe (
  echo ==^> yt-dlp download ho raha hai...
  curl -L -o app\bin\yt-dlp.exe "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
)
echo ==^> yt-dlp ready

REM ---- ffmpeg + ffprobe ----
if exist app\bin\ffmpeg.exe goto :deno
echo ==^> ffmpeg download ho raha hai (thoda bada hai, wait karo)...
curl -L -o "%TEMP%\ytcd-ffmpeg.zip" "https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip"
if exist "%TEMP%\ytcd-ffx" rmdir /s /q "%TEMP%\ytcd-ffx"
mkdir "%TEMP%\ytcd-ffx"
tar -xf "%TEMP%\ytcd-ffmpeg.zip" -C "%TEMP%\ytcd-ffx"
copy /y "%TEMP%\ytcd-ffx\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe" app\bin\ >nul
copy /y "%TEMP%\ytcd-ffx\ffmpeg-master-latest-win64-gpl\bin\ffprobe.exe" app\bin\ >nul
del "%TEMP%\ytcd-ffmpeg.zip"
rmdir /s /q "%TEMP%\ytcd-ffx"
echo ==^> ffmpeg/ffprobe ready

:deno
REM ---- deno (YouTube n-challenge solver) ----
if not exist app\bin\deno.exe (
  echo ==^> deno download ho raha hai...
  curl -L -o "%TEMP%\ytcd-deno.zip" "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip"
  tar -xf "%TEMP%\ytcd-deno.zip" -C app\bin
  del "%TEMP%\ytcd-deno.zip"
)
echo ==^> deno ready

echo.
echo [OK] Setup complete! Ab 'start-local.bat' double-click karke app chalao.
pause
