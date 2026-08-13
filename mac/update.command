#!/bin/bash
# YT Clip Downloader — ek click me latest version le aao (Mac)
# GitHub se zip download → overwrite → purani version file delete.

REPO="soubickdas-lab/yt-clip-downloader"
BRANCH="master"

# Script khud ko /tmp me copy karke wahan se chalta hai — taaki update ke
# dauran yeh file overwrite hone par script beech me kharab na ho.
if [ "$(basename "$0")" != "ytcd-update-runner.sh" ]; then
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    cp "$0" /tmp/ytcd-update-runner.sh
    chmod +x /tmp/ytcd-update-runner.sh
    exec /tmp/ytcd-update-runner.sh "$ROOT"
fi

ROOT="$1"
cd "$ROOT" || exit 1

die() {
    echo ""
    echo "❌ $1"
    echo ""
    echo "Koi bhi key dabakar window band karein..."
    read -n 1 -s
    exit 1
}

echo "============================================================"
echo "  YT Clip Downloader — Update"
echo "============================================================"
echo ""
echo "⬇️  GitHub se latest version download ho raha hai..."

TMP="$(mktemp -d)"
curl -L --fail -o "$TMP/update.zip" "https://codeload.github.com/$REPO/zip/refs/heads/$BRANCH" \
    || die "Download fail ho gaya. Internet connection check karein."

unzip -q "$TMP/update.zip" -d "$TMP" || die "Zip extract nahi ho paya."

# Purani version file delete karo
rm -f "$ROOT"/version\ *.txt

# Nayi files copy karo. --delete use NAHI kar rahe — isliye aapke
# app/bin (tools), app/downloads (clips) aur app/runtime safe rehte hain.
rsync -a --exclude node_modules --exclude .git \
    "$TMP/yt-clip-downloader-$BRANCH/" "$ROOT/" || die "Files copy nahi ho payi."

rm -rf "$TMP"
chmod +x "$ROOT"/mac/*.command 2>/dev/null

echo ""
VER_FILE="$(ls "$ROOT"/version\ *.txt 2>/dev/null | head -1)"
if [ -n "$VER_FILE" ]; then
    VER_NAME="$(basename "$VER_FILE")"
    echo "✅ Update complete! Ab aap \"${VER_NAME%.txt}\" par ho."
else
    echo "✅ Update complete!"
fi
echo ""
echo "Ab 'start-local.command' double-click karke app chalao."
echo ""
echo "Koi bhi key dabakar window band karein..."
read -n 1 -s
