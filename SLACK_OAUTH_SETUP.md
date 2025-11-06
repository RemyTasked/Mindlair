# 🔧 Slack OAuth Integration - Developer Setup Guide

This guide is for **developers** setting up the Slack App for Meet Cute. Users will just click "Add to Slack" button!

---

## 📋 Prerequisites

- Slack workspace (admin access recommended)
- Meet Cute deployed and running
- Access to environment variables

---

## 🚀 Step 1: Create Slack App

1. **Go to**: https://api.slack.com/apps
2. **Click**: "Create New App"
3. **Choose**: "From scratch"
4. **App Name**: "Meet Cute"
5. **Workspace**: Select your development workspace
6. **Click**: "Create App"

---

## 🔑 Step 2: Configure OAuth & Permissions

### A. OAuth Redirect URLs

1. In your app settings, click **"OAuth & Permissions"** in the left sidebar
2. Scroll to **"Redirect URLs"**
3. **Add these URLs**:
   ```
   https://www.meetcuteai.com/api/slack/oauth/callback
   http://localhost:3000/api/slack/oauth/callback  (for local dev)
   ```
4. Click **"Save URLs"**

### B. Bot Token Scopes

1. Scroll down to **"Scopes"** section
2. Under **"Bot Token Scopes"**, add these scopes:
   - `incoming-webhook` - Post messages to specific channels
   - `chat:write` - Send messages as the app

3. Click **"Save Changes"**

---

## 🔐 Step 3: Get Your Credentials

1. In your app settings, click **"Basic Information"** in the left sidebar
2. Scroll to **"App Credentials"**
3. You'll see:
   - **Client ID** (e.g., `1234567890.1234567890`)
   - **Client Secret** (click "Show" to reveal)
   - **Signing Secret** (optional, for webhook verification)

4. **Copy these values** - you'll need them for environment variables

---

## 🌍 Step 4: Set Environment Variables

Add these to your `.env` file or Railway/hosting platform:

```bash
# Slack OAuth Credentials
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here

# Frontend URL (for OAuth redirect)
FRONTEND_URL=https://www.meetcuteai.com
```

### For Railway:
1. Go to your project settings
2. Click "Variables"
3. Add each variable
4. Redeploy

### For Local Development:
```bash
# .env
SLACK_CLIENT_ID=1234567890.1234567890
SLACK_CLIENT_SECRET=abc123def456ghi789
FRONTEND_URL=http://localhost:5173
```

---

## 📱 Step 5: Update Frontend Client ID

The Slack button needs the Client ID to generate the OAuth URL.

**Option A: Environment Variable (Recommended)**

1. Add to your frontend build process:
   ```bash
   VITE_SLACK_CLIENT_ID=your_client_id_here
   ```

2. Update `Settings.tsx`:
   ```typescript
   const clientId = import.meta.env.VITE_SLACK_CLIENT_ID || 'YOUR_SLACK_CLIENT_ID';
   ```

**Option B: Hardcode (Quick Start)**

In `src/frontend/src/pages/Settings.tsx`, replace:
```typescript
const clientId = 'YOUR_SLACK_CLIENT_ID';
```

With your actual Client ID:
```typescript
const clientId = '1234567890.1234567890';
```

---

## 🎨 Step 6: Customize App Display (Optional)

1. Go to **"Basic Information"**
2. Scroll to **"Display Information"**
3. Set:
   - **App name**: Meet Cute
   - **Short description**: "Get AI-powered meeting cues and daily wrap-ups"
   - **App icon**: Upload Meet Cute logo (512x512px)
   - **Background color**: `#6366F1` (indigo)

---

## 🚦 Step 7: Test the Integration

### Local Testing:

1. Start your backend: `npm run dev`
2. Start your frontend: `cd src/frontend && npm run dev`
3. Go to Settings page
4. Click **"Add to Slack"** button
5. Authorize the app
6. You should be redirected back with success message

### Production Testing:

1. Deploy your changes
2. Go to https://www.meetcuteai.com/settings
3. Click **"Add to Slack"**
4. Authorize
5. Check that it shows "Connected" status

---

## 📤 Step 8: Distribute Your App (Optional)

If you want other workspaces to use your app:

1. Go to **"Manage Distribution"** in app settings
2. Complete the checklist:
   - ✅ Add app icon and description
   - ✅ Set up OAuth redirect URLs
   - ✅ Add required scopes
   - ✅ Remove hard-coded information
3. Click **"Activate Public Distribution"**
4. **Submit for App Directory** (optional, for public listing)

---

## 🔍 Troubleshooting

### "Invalid redirect_uri"
- Check that your redirect URL in Slack matches exactly
- Include `/api/slack/oauth/callback` path
- Use HTTPS in production

### "Client ID not found"
- Make sure `SLACK_CLIENT_ID` is set in environment
- Check that it's being passed to frontend correctly
- Verify the Client ID in Slack app settings

### "Invalid code"
- Code expires after 10 minutes
- Make sure backend `SLACK_CLIENT_SECRET` is correct
- Check that redirect URI matches exactly

### Not receiving notifications
- Check that user authorized the app
- Verify scopes include `chat:write` and `incoming-webhook`
- Check backend logs for errors
- Test with curl:
  ```bash
  curl -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer YOUR_BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"channel":"CHANNEL_ID","text":"Test"}'
  ```

---

## 🔄 OAuth Flow Summary

1. User clicks "Add to Slack" button
2. Redirected to Slack authorization page
3. User selects channel and authorizes
4. Slack redirects back to `/api/slack/oauth/callback?code=...`
5. Backend exchanges code for access token
6. Token stored in database
7. User redirected to Settings with success message

---

## 📊 Database Schema

The OAuth tokens are stored in `delivery_settings` table:

```sql
slackAccessToken  TEXT    -- OAuth bot token
slackTeamId       TEXT    -- Workspace ID
slackTeamName     TEXT    -- Workspace name (display)
slackChannelId    TEXT    -- Channel ID for posting
slackChannelName  TEXT    -- Channel name (display)
slackUserId       TEXT    -- User who authorized
```

---

## 🎯 Next Steps

1. ✅ Create Slack App
2. ✅ Configure OAuth & Permissions
3. ✅ Set environment variables
4. ✅ Update frontend Client ID
5. ✅ Test locally
6. ✅ Deploy to production
7. ✅ Test in production
8. ✅ (Optional) Distribute publicly

---

## 📚 Resources

- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [Slack Scopes Reference](https://api.slack.com/scopes)
- [Slack App Management](https://api.slack.com/apps)

---

## 💡 Pro Tips

- **Use different apps for dev/prod**: Create separate Slack apps for development and production
- **Test with personal workspace**: Create a test workspace for development
- **Monitor rate limits**: Slack has rate limits for API calls
- **Handle token refresh**: Bot tokens don't expire, but plan for revocation
- **Log everything**: Add detailed logging for OAuth flow debugging

---

**Need help?** Check the Slack API documentation or open an issue! 🎬✨

