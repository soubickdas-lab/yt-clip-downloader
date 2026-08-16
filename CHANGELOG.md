# Changelog

## v2.4 (2026-08-13)

- **Bot-check fix**: pehle bot-check aate hi seedha Chrome cookies try hote the. Chalu Chrome ki cookie DB locked/encrypted hoti hai, to wo fail ho jata tha aur user ko *"Could not copy Chrome cookie database"* dikhta tha — asli wajah (bot-check) chhup jati thi
- Naya retry ladder: **normal → alternate player clients → cookies**. Alternate clients (`default,android,tv`) bina kisi cookie ke bot-check nikal dete hain, aur `default` saath hone se 1080p bhi bana rehta hai
- Cookie step fail ho to ab **asli error** dikhta hai, saath me kya karna hai wo bhi
- **`app/cookies.txt`** support: file rakh do to wo hamesha use hogi (browser se cookies padhne se zyada reliable)

## v2.3 (2026-08-13)

- **Remote access key**: app ab Cloudflare tunnel ke peeche safely chal sakta hai. Localhost par kuch nahi badla (koi key nahi), par remote request (CF-Connecting-IP) par key maangi jaati hai
- Key pehli baar apne aap generate hoti hai (`app/access-key.txt`), startup par print hoti hai
- `/api/*` aur `/files/*` dono protected — clips bhi bina key ke download nahi hoti
- Key cookie me save hoti hai, to `<a download>` links bhi kaam karte hain

## v2.2 (2026-08-13)

- **Direct mode (naya default)**: clip ab stream-copy hoti hai, koi re-encode nahi — cut step ~9-12x fast. Start nearest keyframe par snap hota hai (milliseconds ka farak)
- **Precise mode** ab bhi available hai (Mode dropdown) — exact frame-accurate timestamp chahiye to
- **H.264 (avc1) preferred**: YouTube aksar AV1 deta tha jo decode karne mein bahut slow hai. Ab avc1+AAC pehle try hota hai — direct mode mein zero transcode
- **Section download ab parallel fragments** (`--concurrent-fragments 8`) — pehle sirf full-video path par tha
- **Live status counter** Downloads ke top-right mein: `✓ Downloaded 12/70`, `⟳ 2 running`, `✕ 3 failed`

## v2.1 (2026-08-13)

- **Downloads ab system ke Downloads folder mein**: clips `~/Downloads/YT Clip Downloader/Folder N/` mein jaati hain, app folder ke andar nahi — update/reinstall par files apni jagah rehti hain
- Windows par relocated Downloads folder registry se auto-detect hota hai
- Full-video cache `app/downloads/.cache/` se `app/cache/` mein shift — user ke Downloads folder mein sirf clips dikhti hain
- App mein exact save path dikhta hai (Downloads section ke neeche)

## v2.0 (2026-08-13)

- **Cross-platform**: Windows + macOS support, setup/start scripts dono ke liye
- **One-click update**: `update.bat` / `update.command` — GitHub se latest version, clips aur tools safe
- **Fast clip engine**: section stream-copy + frame-accurate local cut (198x network speed, 53dB PSNR verified)
- **Shared video cache**: same video ke multiple clips = ek download, baaki instant cut
- **Bot-check fix**: deno n-challenge solver + Chrome cookies auto-retry
- **403 fix**: 3-level retry ladder — section → cached-full-video fallback (guaranteed download)
- **Numbered folders**: Folder 1/2/3... with "+ New Folder", files named 1.mp4, 2.mp4...
- **Job controls**: individual edit/retry/error, Stop/Start All, Retry All Failed, Clear Queue
- **Bulk paste**: SN column, header row, en-dash auto-handling; live total duration
- **Parallel setting**: 1-10 concurrent downloads (default 5)

## v1.0 (2026-08-13)

- Basic clip downloader: link + timestamp table, bulk paste, 1080p MP4 output
