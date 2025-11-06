# 🎬 Meet Cute PWA Setup Guide

This guide will help you set up Meet Cute as a Progressive Web App (PWA) that can be installed on iPhones and Android devices.

## ✅ What's Been Implemented

### 1. **PWA Manifest** (`src/frontend/public/manifest.json`)
- App name, description, and branding
- Display mode: `standalone` (looks like a native app)
- Theme colors matching Meet Cute's indigo/purple gradient
- Icon definitions for all required sizes
- Shortcuts for quick access to Dashboard and Settings

### 2. **Service Worker** (`src/frontend/public/service-worker.js`)
- **Offline Support**: Cache critical assets for offline use
- **Network-First Strategy**: Always fetch fresh data when online
- **Cache Fallback**: Serve cached content when offline
- **Background Sync**: Ready for syncing offline reflections (future)
- **Push Notifications**: Ready for meeting reminders (future)

### 3. **Service Worker Registration** (`src/frontend/src/serviceWorkerRegistration.ts`)
- Automatic registration on page load
- Update detection and user notification
- Localhost development support

### 4. **iOS-Specific Meta Tags** (in `index.html`)
- Apple touch icons for home screen
- Status bar styling (black-translucent for immersive feel)
- Splash screens for various iPhone sizes
- Web app capable mode

### 5. **Icon Base** (`src/frontend/public/icons/icon-base.svg`)
- Cinematic film reel design with gradient
- Ready to be converted to PNG in multiple sizes

---

## 🚀 Next Steps: Generate Icons

You need to generate PNG icons from the SVG base. Choose one of these methods:

### **Option 1: Online Tool (Easiest - Recommended)**

1. Visit: [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload: `src/frontend/public/icons/icon-base.svg`
3. Download all generated icons
4. Place them in: `src/frontend/public/icons/`

Required icon sizes:
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `apple-touch-icon.png` (180x180)

### **Option 2: Use Sharp (Node.js)**

```bash
# Install sharp
npm install sharp

# Edit generate-icons.js and uncomment the sharp code section
# Then run:
node generate-icons.js
```

### **Option 3: Manual (Figma/Photoshop)**

Export the SVG at each required size as PNG with transparent background.

---

## 📱 How to Install on iPhone

### For Users:

1. **Open in Safari** (must use Safari, not Chrome)
   - Visit: `https://www.meetcuteai.com`

2. **Tap the Share Button** (square with arrow pointing up)
   - Located at the bottom of Safari

3. **Scroll down and tap "Add to Home Screen"**
   - You'll see the Meet Cute icon and name

4. **Tap "Add"** in the top right
   - The app icon will appear on your home screen

5. **Open Meet Cute from your home screen**
   - It will launch in full-screen mode like a native app
   - No browser UI, just your app

### What Users Will Experience:

✅ **Native-like appearance**: No Safari UI, just your app  
✅ **Home screen icon**: Tap to launch instantly  
✅ **Splash screen**: Beautiful loading screen on startup  
✅ **Offline support**: Core features work without internet  
✅ **Fast loading**: Cached assets load instantly  
✅ **Push notifications**: (Coming soon) Meeting reminders  

---

## 🧪 Testing PWA Locally

### 1. **Build the Production Version**

```bash
cd src/frontend
npm run build
npm run preview
```

### 2. **Test in Chrome DevTools**

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Check **Manifest** section:
   - Verify all icons load
   - Check theme colors
   - Test "Add to home screen" button

4. Check **Service Workers** section:
   - Verify service worker is registered
   - Test offline mode (toggle "Offline" checkbox)
   - Check cache storage

### 3. **Test on iPhone (via ngrok or similar)**

```bash
# Install ngrok
npm install -g ngrok

# Run your app
npm run preview

# In another terminal, expose it
ngrok http 4173
```

Then visit the ngrok URL on your iPhone and test installation.

---

## 🔧 Customization Options

### Change Theme Colors

Edit `src/frontend/public/manifest.json`:

```json
{
  "background_color": "#1e1b4b",  // App background
  "theme_color": "#6366f1"        // Status bar color
}
```

Also update in `index.html`:

```html
<meta name="theme-color" content="#6366f1" />
```

### Change App Icon

1. Replace `src/frontend/public/icons/icon-base.svg`
2. Regenerate all PNG sizes
3. Rebuild the app

### Modify Offline Behavior

Edit `src/frontend/public/service-worker.js`:

- **Cache more assets**: Add to `PRECACHE_ASSETS` array
- **Change caching strategy**: Modify the `fetch` event handler
- **Add offline page**: Create custom offline experience

---

## 📊 PWA Features Roadmap

### ✅ Implemented
- [x] Manifest with app metadata
- [x] Service worker with offline support
- [x] iOS-specific meta tags
- [x] Icon base design
- [x] Installable on home screen

### 🚧 Coming Soon
- [ ] Push notifications for meeting reminders
- [ ] Background sync for offline reflections
- [ ] Share target (share meetings to Meet Cute)
- [ ] Shortcuts for quick actions
- [ ] Periodic background sync for calendar

### 🎯 Future Enhancements
- [ ] Native app shortcuts (3D Touch on iOS)
- [ ] Badge API for unread notifications
- [ ] File handling for calendar imports
- [ ] Contact picker integration

---

## 🐛 Troubleshooting

### Service Worker Not Registering

**Issue**: Console shows "Service worker registration failed"

**Fix**:
1. Ensure you're on HTTPS (or localhost)
2. Check `public/service-worker.js` exists
3. Clear browser cache and reload

### Icons Not Showing

**Issue**: Default icon appears instead of Meet Cute icon

**Fix**:
1. Verify all PNG icons exist in `public/icons/`
2. Check file names match `manifest.json`
3. Clear browser cache
4. Uninstall and reinstall PWA

### "Add to Home Screen" Not Appearing (iOS)

**Issue**: Option doesn't show in Safari share menu

**Fix**:
1. Must use Safari (not Chrome or other browsers)
2. Visit the site at least once
3. Ensure manifest.json is accessible
4. Check iOS version (requires iOS 11.3+)

### App Not Working Offline

**Issue**: Blank screen when offline

**Fix**:
1. Visit the app while online first (to cache assets)
2. Check service worker is registered (DevTools → Application)
3. Verify cache storage has assets
4. Check console for errors

---

## 📚 Resources

- [PWA Builder](https://www.pwabuilder.com/) - Test and improve your PWA
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Audit PWA quality
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/) - Comprehensive PWA documentation
- [iOS PWA Support](https://medium.com/@firt/progressive-web-apps-on-ios-are-here-d00430dee3a7) - iOS-specific considerations

---

## 🎉 Success Checklist

Before launching your PWA, verify:

- [ ] All icons generated and placed in `public/icons/`
- [ ] Manifest.json accessible at `/manifest.json`
- [ ] Service worker registered successfully
- [ ] App installs on iPhone Safari
- [ ] App installs on Android Chrome
- [ ] Offline mode works (cached pages load)
- [ ] Theme colors match brand
- [ ] Splash screen appears on iOS
- [ ] Status bar styled correctly
- [ ] Lighthouse PWA score > 90

---

## 🚀 Deployment Notes

When deploying to production:

1. **Ensure HTTPS**: PWAs require secure context
2. **Set correct start_url**: Update in manifest.json if needed
3. **Configure CSP**: Allow service worker scripts
4. **Test on real devices**: iOS Safari and Android Chrome
5. **Monitor service worker**: Check for update errors

Your PWA is ready to provide a native-like experience! 🎬✨

