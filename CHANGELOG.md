# Changelog

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
