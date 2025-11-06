# 🔔 Push Notifications Setup Guide

## ✅ What's Already Implemented

Your PWA already has complete push notification infrastructure:

### Backend (✅ Complete)
- VAPID key configuration
- Push subscription management
- Notification sending service
- API endpoints for subscribe/unsubscribe/test
- Integration with meeting reminders, Presley Flow, and wellness reminders

### Frontend (✅ Complete)
- Push notification manager component
- Service worker with push event handlers
- Subscription management UI in Settings
- Permission request flow

### Service Worker (✅ Complete)
- Push event listener
- Notification click handler
- Background sync support

---

## 🔐 VAPID Keys Generated

Your VAPID keys have been generated and added to `.env`:

```
VAPID_PUBLIC_KEY=BHkqXEjB7r3g0vCKX6tel4nAzO_G5v_FF25TnJ3-SmsejEfEI8w1d3aFmC1r2vmIJNWILKgvWnBX66aiwM0G1hE
VAPID_PRIVATE_KEY=KmLMJ7cM_2GG1nASFcpuSOyzqgYmfDg0DBv4aYVjWos
VAPID_SUBJECT=mailto:support@meetcuteai.com
```

⚠️ **IMPORTANT**: These keys are in your local `.env` file but need to be added to Railway!

---

## 🚀 Deploy to Railway (REQUIRED)

### Step 1: Add Environment Variables to Railway

1. Go to Railway dashboard: https://railway.app
2. Select your `meet-cute` project
3. Click on your service
4. Go to **Variables** tab
5. Click **+ New Variable** and add each of these:

```
VAPID_PUBLIC_KEY=BHkqXEjB7r3g0vCKX6tel4nAzO_G5v_FF25TnJ3-SmsejEfEI8w1d3aFmC1r2vmIJNWILKgvWnBX66aiwM0G1hE
VAPID_PRIVATE_KEY=KmLMJ7cM_2GG1nASFcpuSOyzqgYmfDg0DBv4aYVjWos
VAPID_SUBJECT=mailto:support@meetcuteai.com
```

### Step 2: Redeploy

Railway will automatically redeploy once you add the variables. If not, trigger a manual redeploy.

---

## 📱 How Users Will Enable Notifications

### On iPhone (Safari iOS 16.4+)

1. Install Meet Cute PWA (Add to Home Screen)
2. Open the app from home screen
3. Go to Settings
4. Scroll to "Push Notifications" section
5. Tap "🔔 Enable Notifications"
6. Allow notifications when prompted
7. Tap "📬 Send Test" to verify it works

### On Android (Chrome)

1. Visit www.meetcuteai.com
2. Install the PWA when prompted (or Add to Home Screen)
3. Go to Settings in the app
4. Enable Push Notifications
5. Allow notifications when prompted

### On Desktop (Chrome, Firefox, Edge)

1. Visit www.meetcuteai.com
2. Go to Settings
3. Enable Push Notifications
4. Allow notifications in browser prompt

---

## 🔔 What Notifications Users Will Receive

Once enabled, users will receive notifications for:

### 1. Pre-Meeting Cues (5 minutes before)
```
🎬 Meeting in 5 minutes
"Weekly Standup" starts soon. Tap to begin your focus session.
```

### 2. Presley Flow Reminders
```
🌙 Time for Mental Rehearsal
Review tomorrow's 3 meetings and prepare intentionally.
```

### 3. Wellness Reminders
```
🫁 Time for a Breathing Break
Take 60 seconds to reset. Your focus will thank you.
```

### 4. Director's Insights
```
🎞️ New Insight Available
Your composure has risen 14% this week. See your trends.
```

### 5. Daily Wrap-Up
```
🎬 Today's Wrap
You completed 4 meetings with rising confidence. Well done.
```

---

## 🧪 Testing Push Notifications

### Test Locally

1. Start your local server:
```bash
cd /Users/clodelremy/Meet\ Cute
npm run dev
```

2. Open http://localhost:5173
3. Go to Settings → Push Notifications
4. Click "Enable Notifications"
5. Click "Send Test" button
6. You should see a test notification!

### Test on Production

1. Wait for Railway deployment to complete
2. Visit www.meetcuteai.com
3. Go to Settings
4. Enable push notifications
5. Send a test notification
6. Check that it appears on your device

---

## 🔧 Troubleshooting

### "Push notifications not configured" error

**Problem**: VAPID keys not set in Railway

**Solution**: Add the three VAPID environment variables to Railway (see Step 1 above)

### Notifications not appearing on iPhone

**Problem**: iOS requires PWA to be installed

**Solution**:
1. Must install app via "Add to Home Screen" in Safari
2. Must launch from home screen icon (not from Safari)
3. Requires iOS 16.4 or later
4. Check Settings → Notifications → Meet Cute is allowed

### Permission denied

**Problem**: User blocked notifications

**Solution**: User must manually enable in browser/device settings:
- **iOS**: Settings → Meet Cute → Notifications → Allow
- **Android**: Settings → Apps → Meet Cute → Notifications → Allow
- **Desktop**: Browser settings → Site settings → Notifications

### Test notification not received

**Checklist**:
- [ ] VAPID keys added to Railway
- [ ] App redeployed after adding keys
- [ ] Notification permission granted
- [ ] PWA installed (for iOS)
- [ ] App launched from home screen (for iOS)
- [ ] Device not in Do Not Disturb mode
- [ ] Check browser console for errors

---

## 📊 Monitoring Push Notifications

### Backend Logs

Check Railway logs for push notification events:

```
✅ Push notification sent successfully
❌ Failed to send push notification (subscription expired)
🧹 Removed invalid push subscriptions
```

### Database

Push subscriptions are stored in the `PushSubscription` table:

```sql
SELECT * FROM "PushSubscription" WHERE "userId" = 'your-user-id';
```

### Frontend Console

Check browser console for subscription status:

```javascript
// In browser console
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

---

## 🎯 Next Steps

1. ✅ VAPID keys generated and added to local `.env`
2. ⏳ **Add VAPID keys to Railway** (see Step 1 above)
3. ⏳ Wait for Railway to redeploy
4. ⏳ Test on your iPhone
5. ⏳ Test notifications work end-to-end

---

## 🔐 Security Notes

- **Private Key**: Never commit `VAPID_PRIVATE_KEY` to git (already in `.gitignore`)
- **Public Key**: Safe to expose in frontend code
- **Subscriptions**: Automatically cleaned up when invalid
- **Permissions**: Users must explicitly grant permission
- **Unsubscribe**: Users can disable anytime in Settings

---

## 📚 Technical Details

### VAPID (Voluntary Application Server Identification)

- **Purpose**: Authenticates your server to push services
- **Public Key**: Shared with browser for subscription
- **Private Key**: Used to sign push messages
- **Subject**: Contact email for push service providers

### Web Push Protocol

1. User grants notification permission
2. Browser creates push subscription
3. Subscription sent to your backend
4. Backend stores subscription in database
5. When event occurs, backend sends push message
6. Push service delivers to user's device
7. Service worker receives and displays notification

### Browser Support

- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Safari (macOS 13+, iOS 16.4+)
- ❌ Safari (iOS < 16.4)
- ❌ Internet Explorer

---

## 🎬 You're Almost There!

Once you add the VAPID keys to Railway, Meet Cute will have fully functional push notifications!

Users will receive timely, helpful notifications that enhance their meeting preparation experience. 🚀

