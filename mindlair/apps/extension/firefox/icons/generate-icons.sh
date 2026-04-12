#!/bin/bash
# Generate placeholder extension icons from an SVG
# Requires: Inkscape or ImageMagick (convert)
#
# For production, replace with proper brand icons.
# These are simple green-circle placeholders.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Create a simple SVG icon
cat > "$SCRIPT_DIR/icon.svg" << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="60" fill="#0f0e0c" stroke="#a3c47a" stroke-width="3"/>
  <circle cx="45" cy="55" r="10" fill="#a3c47a" opacity="0.7"/>
  <circle cx="80" cy="50" r="13" fill="#a3c47a"/>
  <circle cx="70" cy="80" r="8" fill="#a3c47a" opacity="0.5"/>
  <line x1="53" y1="58" x2="70" y2="53" stroke="#a3c47a" stroke-width="1.5" opacity="0.4"/>
  <line x1="76" y1="62" x2="72" y2="74" stroke="#a3c47a" stroke-width="1.5" opacity="0.4"/>
</svg>
SVG

# If ImageMagick is available, generate PNGs
if command -v convert &> /dev/null; then
  for SIZE in 16 32 48 128; do
    convert -background none -resize ${SIZE}x${SIZE} "$SCRIPT_DIR/icon.svg" "$SCRIPT_DIR/icon${SIZE}.png"
    echo "Generated icon${SIZE}.png"
  done
elif command -v rsvg-convert &> /dev/null; then
  for SIZE in 16 32 48 128; do
    rsvg-convert -w $SIZE -h $SIZE "$SCRIPT_DIR/icon.svg" > "$SCRIPT_DIR/icon${SIZE}.png"
    echo "Generated icon${SIZE}.png"
  done
else
  echo "No SVG-to-PNG converter found (install ImageMagick or librsvg)."
  echo "SVG source saved to icon.svg — convert manually."
fi
