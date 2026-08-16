#!/bin/bash
# Rebuilds docs/images from the source photo folders.
# Add, remove or replace photos in SRC, run this, commit, push. Idempotent.
set -euo pipefail

SRC="${1:-$HOME/Downloads/venta}"
OUT="$(cd "$(dirname "$0")" && pwd)/docs/images"

rm -rf "$OUT"
mkdir -p "$OUT"

shopt -s nullglob nocaseglob
for dir in "$SRC"/*/; do
  slug=$(basename "$dir" | tr 'A-Z' 'a-z' | tr ' ' '-')
  mkdir -p "$OUT/$slug"
  n=1
  for f in "$dir"*.jpg "$dir"*.jpeg "$dir"*.png "$dir"*.heic; do
    sips -Z 1600 -s format jpeg -s formatOptions 80 "$f" --out "$OUT/$slug/$n.jpg" >/dev/null
    n=$((n+1))
  done
  rmdir "$OUT/$slug" 2>/dev/null || true   # drop folders that had no images
done

echo "$(find "$OUT" -name '*.jpg' | wc -l | tr -d ' ') images -> $OUT ($(du -sh "$OUT" | cut -f1))"
