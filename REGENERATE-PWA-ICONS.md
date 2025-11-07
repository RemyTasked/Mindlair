# Regenerate PWA Icons with Meet Cute Logo

## Quick Instructions

Your actual Meet Cute logo is located at:
`src/frontend/public/icons/meetcute-logo.png`

To update all PWA icons to use your logo:

### Option 1: PWA Builder (Recommended)
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload `src/frontend/public/icons/meetcute-logo.png`
3. Select these options:
   - ✅ iOS
   - ✅ Android
   - ✅ Windows
   - Padding: **10%** (recommended for rounded icons)
   - Background: **#6366f1** (indigo, matches your theme)
4. Click "Generate"
5. Download the zip file
6. Extract and copy these files to `src/frontend/public/icons/`:
   - `icon-72x72.png`
   - `icon-96x96.png`
   - `icon-128x128.png`
   - `icon-144x144.png`
   - `icon-152x152.png`
   - `icon-192x192.png`
   - `icon-384x384.png`
   - `icon-512x512.png`
   - `apple-touch-icon.png`

### Option 2: RealFaviconGenerator
1. Go to https://realfavicongenerator.net/
2. Upload `src/frontend/public/icons/meetcute-logo.png`
3. Configure iOS, Android, and Windows settings
4. Download the package
5. Copy the generated PNG files to `src/frontend/public/icons/`

### Option 3: Use ImageMagick (Command Line)
If you have ImageMagick installed:

```bash
cd "src/frontend/public/icons"

# Generate all required sizes from your logo
convert meetcute-logo.png -resize 72x72 icon-72x72.png
convert meetcute-logo.png -resize 96x96 icon-96x96.png
convert meetcute-logo.png -resize 128x128 icon-128x128.png
convert meetcute-logo.png -resize 144x144 icon-144x144.png
convert meetcute-logo.png -resize 152x152 icon-152x152.png
convert meetcute-logo.png -resize 192x192 icon-192x192.png
convert meetcute-logo.png -resize 384x384 icon-384x384.png
convert meetcute-logo.png -resize 512x512 icon-512x512.png
convert meetcute-logo.png -resize 180x180 apple-touch-icon.png
```

## After Regenerating Icons

1. Commit the new icons:
```bash
git add src/frontend/public/icons/*.png
git commit -m "feat: Update PWA icons with actual Meet Cute logo"
git push origin main
```

2. Railway will automatically rebuild and deploy

3. **Important**: Users who already installed the PWA will need to:
   - Remove the old app from their home screen
   - Reinstall it from the website
   - This is because iOS/Android cache the icons

## Current Icon Status
- ❌ PWA icons (icon-*.png) - Still using placeholder
- ✅ Logo on website (meetcute-logo.png) - Updated!
- ❌ Apple touch icon - Still using placeholder

## Files to Replace
All these files in `src/frontend/public/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png
- apple-touch-icon.png

