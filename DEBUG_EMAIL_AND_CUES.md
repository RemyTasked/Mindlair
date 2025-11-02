# Debug: Email & Pre-Meeting Cues Not Working

## Issue 1: Emails Not Sending

### Check SendGrid Configuration:

1. **Is SendGrid API key set in Railway?**
   - Go to Railway → Variables
   - Look for: `SENDGRID_API_KEY`
   - Should start with: `SG.`

2. **Is sender email verified?**
   - Go to: https://app.sendgrid.com/settings/sender_auth
   - Look for "Single Sender Verification"
   - Status should be "Verified" ✅
   - Email should match what you're sending from

3. **What email is being used as sender?**
   - Check Railway variable: `SENDGRID_FROM_EMAIL`
   - Default: `noreply@meetcuteai.com`
   - This email MUST be verified in SendGrid

### Most Common Issue:
❌ **Sender email not verified in SendGrid**

**Fix:**
1. Go to SendGrid → Settings → Sender Authentication
2. Click "Verify Single Sender"
3. Add email: `noreply@meetcuteai.com` (or your custom email)
4. Check your inbox for verification email
5. Click verification link
6. Wait for "Verified" status

---

## Issue 2: Cues Not Sent 5 Minutes Before Meetings

### Possible Causes:

1. **Calendar not synced properly**
   - Check: Did you connect Google/Outlook calendar?
   - Check: Are meetings showing in Dashboard?

2. **Scheduler not running**
   - Check Railway logs for: "Meeting scheduler started"

3. **Meeting detection issues**
   - Meetings must be in the future
   - Must have valid meeting data

4. **User preferences disabled**
   - Check Settings → "Enable Focus Scene" is ON
   - Check "Alert timing" (default: 5 minutes)

5. **Email delivery settings**
   - Check Settings → Delivery Settings
   - "Email Enabled" should be ON

---

## What to Check Right Now:

### A. In Railway Logs:
Look for these messages:
```
✅ "Meeting scheduler started"
✅ "Scheduler initialized"
✅ "Syncing calendar events"
✅ "Found X meetings"
```

❌ Look for errors:
```
"Error syncing calendar"
"Error sending pre-meeting cue"
"Email service not configured"
```

### B. In Railway Variables:
Required for emails:
- `SENDGRID_API_KEY` (starts with SG.)
- `SENDGRID_FROM_EMAIL` (verified email)

### C. In Your Dashboard:
- Do you see upcoming meetings listed?
- Are they showing "Cue scheduled for [time]"?

---

## Quick Test:

1. **Check if calendar is connected:**
   - Go to: https://www.meetcuteai.com/dashboard
   - Do you see your upcoming meetings?

2. **Check if scheduler is running:**
   - Railway logs should show cron jobs running
   - Look for: "Checking for meetings to send cues"

3. **Add a test meeting:**
   - Create a meeting 6 minutes from now in your calendar
   - Wait 1 minute for sync
   - Check Dashboard - does it appear?
   - Wait 5 more minutes - do you get email/notification?

---

## Send Me:

1. **Screenshot of Railway Variables** (SendGrid section)
2. **Screenshot of your Dashboard** (are meetings showing?)
3. **Screenshot of SendGrid sender authentication page**
4. **Last 50 lines of Railway logs** (download and send)

This will help me pinpoint exactly what's broken!

