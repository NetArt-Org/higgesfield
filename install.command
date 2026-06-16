#!/usr/bin/env bash
# Higgesfield installer (macOS)
# - Enables CEP PlayerDebugMode so the unsigned panel will load
# - Copies the panel into ~/Library/Application Support/Adobe/CEP/extensions
# - Optionally captures core API keys into ~/.higgesfield/config.json
# Run:  bash install.command      (or: chmod +x install.command, then double-click in Finder)
set -euo pipefail

EXT="com.higgesfield"
SRC="$(cd "$(dirname "$0")" && pwd)"
DST="$HOME/Library/Application Support/Adobe/CEP/extensions/$EXT"

echo ""
echo "  Higgesfield - Premiere Pro plugin installer (macOS)"
echo "  ---------------------------------------------------"

# 1) Enable unsigned CEP extensions for Premiere 2022..2025+ (CSXS 9-12)
for v in 9 10 11 12; do
  defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1 >/dev/null 2>&1 || true
done
killall cfprefsd >/dev/null 2>&1 || true
echo "  [1/3] Enabled PlayerDebugMode (CSXS 9-12)"

# 2) Install files (exclude git/build/runtime dirs)
rm -rf "$DST"
mkdir -p "$DST"
rsync -a --exclude '.git' --exclude 'node_modules' --exclude 'store' --exclude '*.zxp' "$SRC/" "$DST/"
echo "  [2/3] Installed to $DST"

# 3) Optional: capture core API keys
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

printf "  Set up API keys now? Core keys power the four pillars. (y/N) "
read -r ANS
if [ "$ANS" = "y" ] || [ "$ANS" = "Y" ] || [ "$ANS" = "yes" ]; then
  printf "    Flux (BFL) - create images | key (blank = skip): ";              read -r K_FLUX
  printf "    Kling - animate (accessKey:secretKey, blank = skip): ";          read -r K_KLING
  printf "    Seedance (BytePlus ModelArk) (blank = skip): ";                  read -r K_SEEDANCE
  printf "    ElevenLabs - SFX (blank = skip): ";                              read -r K_ELEVEN
  printf "    ffmpeg path for Auto-Cut (blank = 'ffmpeg'): ";                  read -r FFMPEG
  [ -z "${FFMPEG:-}" ] && FFMPEG="ffmpeg"

  ENTRIES=()
  add() { [ -n "${2:-}" ] && ENTRIES+=("\"$1\": \"$(esc "$2")\""); }
  add flux       "${K_FLUX:-}"
  add kling      "${K_KLING:-}"
  add seedance   "${K_SEEDANCE:-}"
  add elevenlabs "${K_ELEVEN:-}"
  OLDIFS="$IFS"; IFS=','; KEYS_JSON="${ENTRIES[*]:-}"; IFS="$OLDIFS"

  mkdir -p "$HOME/.higgesfield"
  cat > "$HOME/.higgesfield/config.json" <<EOF
{
  "keys": { $KEYS_JSON },
  "defaults": { "ffmpegPath": "$(esc "$FFMPEG")", "project": "default" }
}
EOF
  echo "  [3/3] Saved keys to ~/.higgesfield/config.json"
else
  echo "  [3/3] Skipped - add keys in the panel's Setup wizard or Settings tab."
fi

echo ""
echo "  Done. Restart Premiere Pro  ->  Window  ->  Extensions  ->  Higgesfield"
echo ""
