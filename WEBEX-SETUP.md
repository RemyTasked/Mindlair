# Webex OAuth Setup Guide

## Step 1: Create a Webex Integration

1. Go to https://developer.webex.com/my-apps
2. Click "Create a New App"
3. Select "Integration"
4. Fill in the details:
   - **Integration Name**: Meet Cute
   - **Icon**: Upload your logo (512x512px)
   - **Description**: AI-powered meeting preparation and coaching
   - **Redirect URI**: `https://www.meetcuteai.com/auth/webex/callback`
   - **Scopes**: 
     - `spark:people_read` (to get user info)
     - `spark-compliance:meetings_read` (to read meetings)

5. Click "Add Integration"
6. You'll receive:
   - **Client ID** (Integration ID)
   - **Client Secret**

## Step 2: Add Environment Variables to Railway

Go to your Railway project → meet-cute service → Variables tab and add:

```bash
WEBEX_CLIENT_ID=your_client_id_here
WEBEX_CLIENT_SECRET=your_client_secret_here
WEBEX_REDIRECT_URI=https://www.meetcuteai.com/auth/webex/callback
```

## Step 3: Update Webex Integration Settings

If you need to update the redirect URI later:
1. Go to https://developer.webex.com/my-apps
2. Click on your "Meet Cute" integration
3. Update the Redirect URI if needed
4. Save changes

## Step 4: Test the Integration

1. Go to https://www.meetcuteai.com
2. Click "Continue with Webex"
3. You should be redirected to Webex login
4. After login, you'll be redirected back to the dashboard

## Troubleshooting

### "We've encountered an error" on Webex page
- Check that `WEBEX_CLIENT_ID` is set correctly on Railway
- Verify the redirect URI matches exactly (no trailing slash)
- Check Railway logs for specific error messages

### "Invalid client_id"
- Double-check the Client ID in Railway matches the one from Webex developer portal

### "redirect_uri_mismatch"
- The redirect URI in Railway must exactly match the one registered in Webex
- Common issue: `http` vs `https` or trailing `/`

### Check Railway Logs
```bash
# In Railway dashboard, go to:
# meet-cute service → Deployments → Latest → View Logs
# Look for lines with "Webex" or "webex"
```

## Current Configuration

**Expected Redirect URI**: `https://www.meetcuteai.com/auth/webex/callback`

**Scopes Required**:
- `spark:people_read` - Get user profile information
- `spark-compliance:meetings_read` - Read user's meetings

## Notes

- Webex OAuth tokens expire after a certain period
- The integration will automatically refresh tokens when needed
- Users can disconnect Webex from Settings → Calendar Accounts

