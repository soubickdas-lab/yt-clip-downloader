# YT Clip Downloader 🎬

YouTube videos se **sirf timestamp wala clip** Full HD (1080p) mein download karo — bulk mein, numbered folders ke saath. Windows aur macOS dono par chalta hai.

## Quick Start

### macOS
1. `mac/setup.command` double-click karo (sirf pehli baar — tools download hote hain)
2. `mac/start-local.command` double-click karo
3. Browser mein app khul jayega: http://localhost:3777

> Agar "unidentified developer" warning aaye: file par **right-click → Open** karo.
> Agar "permission denied" aaye: Terminal mein `chmod +x mac/*.command` chalao.

### Windows
1. `windows\setup.bat` double-click karo (sirf pehli baar — tools download hote hain)
2. `windows\start-local.bat` double-click karo
3. Browser mein app khul jayega: http://localhost:3777

> Windows 10/11 chahiye (curl aur tar built-in hote hain).
> SmartScreen warning aaye to **More info → Run anyway**.

## Update Kaise Karein

Naya version aane par app ko dobara download karne ki zaroorat nahi:

- **macOS** — `mac/update.command` double-click karo
- **Windows** — `windows\update.bat` double-click karo

GitHub se latest version aa jayega. Aapki **clips** bilkul safe hain — wo system ke Downloads folder mein hoti hain, app folder ke andar nahi. **Tools** (`app/bin/`) bhi waise ke waise rehte hain — sirf app ki files update hoti hain.

## Features

- **Clip download**: Link + timestamp (`1:20-2:45`) daalo — sirf wohi hissa download hota hai, poora video nahi
- **Bulk paste**: Excel/Sheets se table copy-paste karo (SN column, header, en-dash sab auto-handle)
- **Total time**: Table aur bulk box mein clips ka total duration live dikhta hai
- **Numbered folders**: Har batch apne folder mein (`Folder 1`, `Folder 2`...) — "+ New Folder" se naya
- **Proper naming**: Files `1.mp4`, `2.mp4`, `3.mp4`... row number ke hisaab se
- **Direct mode**: stream copy, koi re-encode nahi — sabse fast (default). Exact timestamp chahiye to **Precise** mode chuno
- **Live status**: Downloads ke top-right par `✓ Downloaded 12/70 · ⟳ 2 running · ✕ 3 failed`
- **Parallel downloads**: 1-10 ek saath (default 5)
- **Smart speed**: Same video ke multiple clips = ek hi download, baaki instant local cut
- **Auto-retry**: YouTube 403/bot-check errors par khud retry — Chrome cookies fallback ke saath
- **Full control**: Har clip ka individual error, edit, retry + Stop/Start/Clear All/Retry All Failed

## Timestamp Formats

| Format | Matlab |
|---|---|
| `1:20-2:45` | 1:20 se 2:45 tak |
| `0:05-0:30` | 5 sec se 30 sec tak |
| `1:20` | 1:20 se video end tak |
| (khali) | poora video |

## Files Kahan Milti Hain

Aapke **system ke Downloads folder** mein — app folder ke andar nahi:

- **Windows** — `C:\Users\<naam>\Downloads\YT Clip Downloader\Folder N\`
- **macOS** — `~/Downloads/YT Clip Downloader/Folder N/`

Ya app ke andar **"Open in Finder/Explorer"** button dabao — seedha wahi folder khul jayega. Exact path app mein Downloads section ke neeche bhi likha rehta hai.

## Troubleshooting

- **"Sign in to confirm you're not a bot"**: App khud Chrome cookies se retry karta hai. Chrome installed hona chahiye aur usme YouTube khula ho (login zaroori nahi). Cookies dropdown se browser change kar sakte ho.
- **Downloads slow/fail**: Retry All Failed dabao — YouTube ke temporary blocks aksar dusri koshish mein nikal jaate hain.
- **Space kam**: `app/cache/` folder delete kar sakte ho — yeh sirf speed ke liye full videos cache karta hai.
