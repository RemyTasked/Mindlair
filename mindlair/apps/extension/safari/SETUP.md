# Safari Web Extension — Setup Guide

Safari Web Extensions require an Xcode project that wraps the extension files.
Apple provides a tool to convert an existing web extension into an Xcode project.

## Step 1: Generate the Xcode project

Run this from the repository root:

```bash
# First, copy shared files into the Safari Resources directory
cp shared/background.js safari/Resources/
cp shared/content-filter.js safari/Resources/
cp shared/content.js safari/Resources/
cp shared/popup.html safari/Resources/
cp shared/popup.js safari/Resources/
mkdir -p safari/Resources/images
cp icons/icon*.png safari/Resources/images/

# Convert to Xcode project (macOS + iOS)
xcrun safari-web-extension-converter safari/Resources \
  --project-location safari/xcode \
  --app-name "Mindlair" \
  --bundle-identifier com.mindlair.safari-extension \
  --swift \
  --macos-only  # Remove this flag to also target iOS
```

## Step 2: Open in Xcode

```bash
open safari/xcode/Mindlair/Mindlair.xcodeproj
```

## Step 3: Configure signing

1. Select the project in Xcode
2. Under "Signing & Capabilities", select your Apple Developer team
3. The extension has two targets: the container app and the extension itself
4. Both need valid signing identities

## Step 4: Build and run

1. Select the "Mindlair" scheme
2. Build and run (Cmd+R)
3. Safari will launch with the extension available
4. Go to Safari → Settings → Extensions → Enable "Mindlair"

## iOS Support

To also support iOS Safari:
1. Remove the `--macos-only` flag when generating the project
2. The same extension code runs on both macOS and iOS Safari
3. Users enable it in Settings → Safari → Extensions

## Notes

- The extension JavaScript (background.js, content.js, popup.js) is identical
  to the Chrome/Firefox versions — no platform-specific code needed.
- Safari Web Extensions on iOS work passively (capture every URL in Safari)
  just like the desktop version. This is the ONE way to get passive capture on iOS.
- The container app can be minimal — it just needs to exist for the extension.
