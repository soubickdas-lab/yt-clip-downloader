#!/bin/bash
# YT Clip Downloader — macOS setup
# Yeh script zaroori tools download karta hai: node, yt-dlp, ffmpeg, ffprobe, deno
set -e
cd "$(dirname "$0")/.."

BIN="app/bin"
mkdir -p "$BIN"

ARCH=$(uname -m)
echo "==> macOS setup shuru ($ARCH)..."

# ---- Node.js (agar system par nahi hai to portable copy) ----
if command -v node >/dev/null 2>&1; then
  echo "==> Node.js mil gaya: $(node -v)"
elif [ -x "app/runtime/node/bin/node" ]; then
  echo "==> Bundled Node.js already installed"
else
  echo "==> Node.js download ho raha hai..."
  if [ "$ARCH" = "arm64" ]; then
    NODE_URL="https://nodejs.org/dist/v22.14.0/node-v22.14.0-darwin-arm64.tar.gz"
  else
    NODE_URL="https://nodejs.org/dist/v22.14.0/node-v22.14.0-darwin-x64.tar.gz"
  fi
  mkdir -p app/runtime
  curl -L --progress-bar -o /tmp/ytcd-node.tar.gz "$NODE_URL"
  tar -xzf /tmp/ytcd-node.tar.gz -C app/runtime
  rm -f /tmp/ytcd-node.tar.gz
  mv app/runtime/node-v22.14.0-* app/runtime/node
  echo "==> Node.js installed (bundled)"
fi

# ---- yt-dlp ----
if [ ! -x "$BIN/yt-dlp" ]; then
  echo "==> yt-dlp download ho raha hai..."
  curl -L --progress-bar -o "$BIN/yt-dlp" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
  chmod +x "$BIN/yt-dlp"
fi
echo "==> yt-dlp: $("$BIN/yt-dlp" --version)"

# ---- ffmpeg + ffprobe ----
if [ ! -x "$BIN/ffmpeg" ]; then
  echo "==> ffmpeg download ho raha hai..."
  curl -L --progress-bar -o /tmp/ytcd-ffmpeg.zip "https://evermeet.cx/ffmpeg/getrelease/zip"
  unzip -oq /tmp/ytcd-ffmpeg.zip -d "$BIN"
  rm -f /tmp/ytcd-ffmpeg.zip
  chmod +x "$BIN/ffmpeg"
fi
if [ ! -x "$BIN/ffprobe" ]; then
  echo "==> ffprobe download ho raha hai..."
  curl -L --progress-bar -o /tmp/ytcd-ffprobe.zip "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip"
  unzip -oq /tmp/ytcd-ffprobe.zip -d "$BIN"
  rm -f /tmp/ytcd-ffprobe.zip
  chmod +x "$BIN/ffprobe"
fi
echo "==> ffmpeg/ffprobe ready"

# ---- deno (YouTube n-challenge solver) ----
if [ ! -x "$BIN/deno" ]; then
  echo "==> deno download ho raha hai..."
  if [ "$ARCH" = "arm64" ]; then
    DENO_URL="https://github.com/denoland/deno/releases/latest/download/deno-aarch64-apple-darwin.zip"
  else
    DENO_URL="https://github.com/denoland/deno/releases/latest/download/deno-x86_64-apple-darwin.zip"
  fi
  curl -L --progress-bar -o /tmp/ytcd-deno.zip "$DENO_URL"
  unzip -oq /tmp/ytcd-deno.zip -d "$BIN"
  rm -f /tmp/ytcd-deno.zip
  chmod +x "$BIN/deno"
fi
echo "==> deno ready"

echo ""
echo "✅ Setup complete! Ab 'start-local.command' double-click karke app chalao."
