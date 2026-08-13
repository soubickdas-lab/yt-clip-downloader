#!/bin/bash
# YT Clip Downloader — macOS start
# Server start karke browser mein app khol deta hai. Is window ko band karne se app band ho jayega.
cd "$(dirname "$0")/.."

if command -v node >/dev/null 2>&1; then
  NODE="node"
elif [ -x "app/runtime/node/bin/node" ]; then
  NODE="app/runtime/node/bin/node"
else
  echo "❌ Node.js nahi mila. Pehle setup.command chalao."
  read -r -p "Enter dabao band karne ke liye..."
  exit 1
fi

if [ ! -x "app/bin/yt-dlp" ]; then
  echo "❌ Tools missing hain. Pehle setup.command chalao."
  read -r -p "Enter dabao band karne ke liye..."
  exit 1
fi

echo "🚀 YT Clip Downloader start ho raha hai — http://localhost:3777"
echo "   (Is window ko band karne se app band ho jayega)"
( sleep 2; open "http://localhost:3777" ) &
exec "$NODE" app/server.js
