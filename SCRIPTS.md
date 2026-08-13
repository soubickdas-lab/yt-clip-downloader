# Scripts Guide

## mac/

| Script | Kya karta hai |
|---|---|
| `setup.command` | Zaroori tools download karta hai: Node.js (agar system par nahi), yt-dlp, ffmpeg, ffprobe, deno. Sirf pehli baar chalana hai. Dobara chalane par jo already hai use skip karta hai. |
| `start-local.command` | App server start karta hai aur browser mein http://localhost:3777 khol deta hai. Terminal window band = app band. |
| `update.command` | GitHub se latest version laa kar app ko update karta hai. Aapki downloaded clips aur tools safe rehte hain. |

## windows/

| Script | Kya karta hai |
|---|---|
| `setup.bat` | Zaroori tools download karta hai: Node.js (agar system par nahi), yt-dlp.exe, ffmpeg.exe, ffprobe.exe, deno.exe. Sirf pehli baar chalana hai. |
| `start-local.bat` | App server start karta hai aur browser mein http://localhost:3777 khol deta hai. Command window band = app band. |
| `update.bat` | GitHub se latest version laa kar app ko update karta hai. Aapki downloaded clips aur tools safe rehte hain. |

## Andar kya hai

- `app/server.js` — Node.js server (zero dependencies, npm install ki zaroorat nahi)
- `app/public/index.html` — browser UI
- `app/bin/` — downloaded tools (yt-dlp, ffmpeg, ffprobe, deno)
- `app/cache/` — speed ke liye full-video cache (delete karna safe hai)
- `app/runtime/` — portable Node.js (sirf tab jab system par Node nahi tha)

## Clips kahan save hoti hain

App folder ke andar **nahi** — system ke apne Downloads folder mein:

- **Windows** — `C:\Users\<naam>\Downloads\YT Clip Downloader\Folder N\`
- **macOS** — `~/Downloads/YT Clip Downloader/Folder N/`

Windows par agar aapne Downloads folder kahin aur move kiya hai, app registry se asli path khud dhoondh leta hai. App ke andar exact path bhi dikhta hai (Downloads section mein).

## Port change karna ho?

`app/server.js` mein `PORT = 3777` edit karo.
