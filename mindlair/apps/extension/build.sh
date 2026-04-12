#!/bin/bash
# Build Mindlair browser extension for Chrome and Firefox
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED="$SCRIPT_DIR/shared"

echo "Building Mindlair extension..."

# ── Chrome build ──────────────────────────────────────────────────
CHROME_DIR="$SCRIPT_DIR/chrome"
cp "$SHARED/background.js" "$CHROME_DIR/"
cp "$SHARED/content-filter.js" "$CHROME_DIR/"
cp "$SHARED/content.js" "$CHROME_DIR/"
cp "$SHARED/popup.html" "$CHROME_DIR/"
cp "$SHARED/popup.js" "$CHROME_DIR/"
cp -r "$SCRIPT_DIR/icons" "$CHROME_DIR/" 2>/dev/null || true
echo "✓ Chrome extension built → $CHROME_DIR"

# ── Firefox build ─────────────────────────────────────────────────
FIREFOX_DIR="$SCRIPT_DIR/firefox"
cp "$SHARED/background.js" "$FIREFOX_DIR/"
cp "$SHARED/content-filter.js" "$FIREFOX_DIR/"
cp "$SHARED/content.js" "$FIREFOX_DIR/"
cp "$SHARED/popup.html" "$FIREFOX_DIR/"
cp "$SHARED/popup.js" "$FIREFOX_DIR/"
cp -r "$SCRIPT_DIR/icons" "$FIREFOX_DIR/" 2>/dev/null || true
echo "✓ Firefox extension built → $FIREFOX_DIR"

echo ""
echo "To load in Chrome: chrome://extensions → Load unpacked → select $CHROME_DIR"
echo "To load in Firefox: about:debugging → This Firefox → Load Temporary Add-on → select $FIREFOX_DIR/manifest.json"
