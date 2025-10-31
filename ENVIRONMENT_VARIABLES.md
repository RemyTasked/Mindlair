# 🔐 Meet Cute - Environment Variables Guide

## Quick Reference

Here are **ALL** the environment variables you need to set in Railway:

---

## ✅ REQUIRED Variables (App Won't Work Without These)

### 1. **DATABASE_URL** 
```
postgresql://user:password@host:port/database
```
- **Where:** Railway automatically sets this when you add PostgreSQL
- **What it does:** Connects your app to the database
- **Example:** `postgresql://postgres:abc123@containers-us-west.railway.app:5432/railway`
- **⚠️ Railway sets this automatically - you don't need to add it manually!**

---

### 2. **JWT_SECRET**
```
your-super-secret-random-string-here-make-it-very-long
```
- **Where:** Generate yourself (any random string)
- **What it does:** Encrypts user authentication tokens
- **How to generate:**
  ```bash
  openssl rand -base64 32
  # Or just type: myapp2025secretkey123random456string789
  ```
- **Example:** `9k2jf8d3n5m6h8j2k4l7p9q1w3e5r7t9y1u3i5o7p9`

---

### 3. **GOOGLE_CLIENT_ID**
```
123456789-abc123def456.apps.googleusercontent.com
```
- **Where:** [Google Cloud Console](https://console.cloud.google.com)
  - Go to: APIs & Services → Credentials → Create OAuth Client ID
- **What it does:** Enables "Sign in with Google"
- **Example:** `742841934521-abc123def456ghi789.apps.googleusercontent.com`

---

### 4. **GOOGLE_CLIENT_SECRET**
```
GOCSPX-abc123def456ghi789
```
- **Where:** Same place as Google Client ID (shown after creation)
- **What it does:** Secret key for Google OAuth
- **Example:** `GOCSPX-1a2b3c4d5e6f7g8h9i0j`

---

### 5. **GOOGLE_REDIRECT_URI**
```
https://your-app-name.up.railway.app/api/auth/google/callback
```
- **Local:** `http://localhost:3000/api/auth/google/callback`
- **Railway:** `https://your-app-name.up.railway.app/api/auth/google/callback`
- **⚠️ IMPORTANT:** Must match EXACTLY what you put in Google Console!
- **What it does:** Where Google sends users after login

---

### 6. **NODE_ENV**
```
production
```
- **Options:** `development` or `production`
- **For Railway:** Always set to `production`
- **What it does:** Tells the app it's running in production mode

---

### 7. **FRONTEND_URL**
```
https://your-app-name.up.railway.app
```
- **Local:** `http://localhost:5173`
- **Railway:** Your Railway app URL (e.g., `https://meet-cute-production-a1b2.up.railway.app`)
- **What it does:** Frontend app needs to know where it's hosted

---

## 🌟 RECOMMENDED Variables (For Full Functionality)

### 8. **MICROSOFT_CLIENT_ID**
```
12345678-abcd-1234-abcd-123456789abc
```
- **Where:** [Azure Portal](https://portal.azure.com)
  - Go to: Azure Active Directory → App registrations → New registration
- **What it does:** Enables "Sign in with Outlook"
- **Example:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

---

### 9. **MICROSOFT_CLIENT_SECRET**
```
abc~123_def.456-ghi789
```
- **Where:** Azure Portal → App registration → Certificates & secrets → New client secret
- **⚠️ COPY IMMEDIATELY:** You can't see it again after creation!
- **What it does:** Secret key for Microsoft OAuth
- **Example:** `X7Q~abcdefghijklmnopqrstuvwxyz1234567890`

---

### 10. **MICROSOFT_REDIRECT_URI**
```
https://your-app-name.up.railway.app/api/auth/microsoft/callback
```
- **Local:** `http://localhost:3000/api/auth/microsoft/callback`
- **Railway:** `https://your-app-name.up.railway.app/api/auth/microsoft/callback`
- **⚠️ IMPORTANT:** Must match EXACTLY what you put in Azure Portal!

---

### 11. **OPENAI_API_KEY**
```
sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234
```
- **Where:** [OpenAI Platform](https://platform.openai.com/api-keys)
  - Click: Create new secret key
- **What it does:** Generates AI-powered meeting preparation messages
- **Cost:** ~$0.01-0.05 per meeting cue (very cheap!)
- **Example:** `sk-proj-abc123def456ghi789jklmno`

---

## 📧 OPTIONAL Variables (Nice to Have)

### 12. **SENDGRID_API_KEY** (For Email Notifications)
```
SG.abc123def456ghi789.jkl012mno345pqr678stu901vwx234yz567
```
- **Where:** [SendGrid](https://app.sendgrid.com/settings/api_keys)
  - Click: Create API Key
- **What it does:** Sends email notifications before meetings
- **Free tier:** 100 emails/day
- **Example:** `SG.abc123def456ghi789.jkl012mno345pqr678`

---

### 13. **SENDGRID_FROM_EMAIL**
```
noreply@meetcute.app
```
- **What it does:** The email address that sends notifications
- **Must be:** Verified in SendGrid
- **Example:** `notifications@yourdomain.com`

---

### 14-16. **SLACK Variables** (For Slack Notifications)

**SLACK_CLIENT_ID:**
```
123456789012.123456789012
```

**SLACK_CLIENT_SECRET:**
```
abc123def456ghi789jkl012mno345pq
```

**SLACK_REDIRECT_URI:**
```
https://your-app-name.up.railway.app/api/integrations/slack/callback
```

- **Where:** [Slack API](https://api.slack.com/apps)
  - Create New App → OAuth & Permissions
- **What it does:** Sends meeting reminders to Slack

---

### 17-19. **TWILIO Variables** (For SMS Notifications)

**TWILIO_ACCOUNT_SID:**
```
AC1234567890abcdef1234567890abcdef
```

**TWILIO_AUTH_TOKEN:**
```
abc123def456ghi789jkl012mno345pq
```

**TWILIO_PHONE_NUMBER:**
```
+11234567890
```

- **Where:** [Twilio Console](https://console.twilio.com)
- **What it does:** Sends SMS reminders before meetings
- **Cost:** $1-2/month for phone number + $0.0075 per SMS

---

## 🎯 Priority Checklist

### To Get Auth Working (Minimum):
- [ ] `DATABASE_URL` (Railway auto-sets)
- [ ] `JWT_SECRET` (any random string)
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` (your Railway URL)

### To Get Full Features:
- [ ] All above +
- [ ] `MICROSOFT_CLIENT_ID`
- [ ] `MICROSOFT_CLIENT_SECRET`
- [ ] `MICROSOFT_REDIRECT_URI`
- [ ] `OPENAI_API_KEY`

### For Email/SMS/Slack:
- [ ] `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL`
- [ ] `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET` + `SLACK_REDIRECT_URI`
- [ ] `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_PHONE_NUMBER`

---

## 🔧 How to Set Variables in Railway

### Option 1: Railway Dashboard (Easiest)
1. Go to [railway.app](https://railway.app)
2. Open your project
3. Click on your **Service** (not the database)
4. Go to **"Variables"** tab
5. Click **"+ New Variable"**
6. Add each variable one by one

### Option 2: Railway CLI
```bash
# Set variables one by one
railway variables set GOOGLE_CLIENT_ID=your-value
railway variables set GOOGLE_CLIENT_SECRET=your-value
railway variables set JWT_SECRET=your-secret

# Or open dashboard
railway open
# Then go to Variables tab
```

---

## 📋 Copy-Paste Template

Here's a template you can fill out and paste into Railway:

```
# Required
JWT_SECRET=YOUR_RANDOM_SECRET_HERE
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_SECRET
GOOGLE_REDIRECT_URI=https://your-app.up.railway.app/api/auth/google/callback
NODE_ENV=production
FRONTEND_URL=https://your-app.up.railway.app

# Recommended
MICROSOFT_CLIENT_ID=YOUR_MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET=YOUR_MICROSOFT_SECRET
MICROSOFT_REDIRECT_URI=https://your-app.up.railway.app/api/auth/microsoft/callback
OPENAI_API_KEY=sk-YOUR_OPENAI_KEY

# Optional
SENDGRID_API_KEY=SG.YOUR_SENDGRID_KEY
SENDGRID_FROM_EMAIL=noreply@meetcute.app
```

---

## ⚠️ Important Notes

1. **Never commit `.env` to git!** (Already in `.gitignore`)
2. **Railway sets `DATABASE_URL` automatically** when you add PostgreSQL
3. **Railway sets `PORT` automatically** - don't override it
4. **OAuth redirect URIs MUST match exactly** in Google Console & Azure Portal
5. **Get your Railway URL first**, then update redirect URIs in Google/Microsoft
6. **JWT_SECRET should be at least 32 characters** for security

---

## 🚀 Setup Order

1. **Deploy to Railway first** (to get your production URL)
2. **Add PostgreSQL** (Railway auto-sets `DATABASE_URL`)
3. **Get OAuth credentials** using your Railway URL for redirect URIs
4. **Set all variables** in Railway dashboard
5. **Redeploy** if needed: `railway up`

---

## 💡 Quick Tips

- **Test locally first:** Use `http://localhost:3000` and `http://localhost:5173` for redirect URIs
- **Then deploy:** Update redirect URIs to your Railway production URL
- **OpenAI is cheap:** ~$5 will last you months with typical usage
- **SendGrid free tier:** 100 emails/day is plenty for testing
- **Railway auto-restarts:** App restarts automatically when you change variables

---

## 📞 Where to Get Help

- **Google OAuth:** [Console Guide](https://support.google.com/cloud/answer/6158849)
- **Microsoft OAuth:** [Azure AD Quickstart](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- **OpenAI:** [API Keys](https://platform.openai.com/api-keys)
- **SendGrid:** [Getting Started](https://docs.sendgrid.com/for-developers/sending-email/api-getting-started)

---

**Need help setting up any specific variable?** Check `API_SETUP_GUIDE.md` for detailed walkthroughs! 🎯

