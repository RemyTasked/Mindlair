# 📱 How to Test Push Notifications - Simple Guide

## Step 1: Go to Settings
1. Open https://www.meetcuteai.com/settings
2. Scroll down to "Delivery Methods" section

## Step 2: Enable Push Notifications
1. Check the box that says "Enable Push Notifications"
2. Your browser will ask for permission - **Click "Allow"**
3. Wait a moment for it to connect

## Step 3: Send a Test
1. You'll see a button that says **"Send Test Notification"**
2. Click it
3. You should see a notification pop up on your screen! 🎉

## Troubleshooting

### If you don't see the "Send Test Notification" button:
- Make sure the "Enable Push Notifications" checkbox is checked
- Refresh the page
- Make sure you clicked "Allow" when the browser asked

### If the test button doesn't work:
- Open browser console (F12 or Cmd+Option+I)
- Click the test button again
- Look for any error messages in the console
- Take a screenshot and share it

### If your browser says "Not Supported":
- **Chrome** ✅ Works great
- **Firefox** ✅ Works great  
- **Edge** ✅ Works great
- **Safari (Mac)** ⚠️ Only works on macOS 13+ with Safari 16+
- **Safari (iPhone/iPad)** ❌ Not supported yet

## What Happens Next?

Once push notifications are working, you'll automatically receive notifications for:
- Pre-meeting focus cues (10 minutes before meetings)
- Presley Flow reminders (morning and evening)
- Wellness check-ins (throughout the day)
- Daily wrap-ups
- Meeting insights

You can customize which notifications you want in the Settings page under "Push Notification Preferences".

## Still Having Issues?

1. Check your browser notification settings:
   - **Chrome**: Settings → Privacy and security → Site Settings → Notifications
   - **Firefox**: Settings → Privacy & Security → Permissions → Notifications
   - **Edge**: Settings → Cookies and site permissions → Notifications

2. Make sure the site is allowed to send notifications

3. Try in a different browser (Chrome or Firefox recommended)

4. Check the test endpoint to see your setup:
   - Get your User ID from browser console: `localStorage.getItem('userId')`
   - Visit: `https://www.meetcuteai.com/api/test/push/YOUR_USER_ID`
   - This will show you detailed diagnostic information
