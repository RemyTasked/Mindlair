# 🚀 Meet Cute - Production Deployment Guide

## Prerequisites

- ✅ Domain: meetcuteai.com (purchased)
- ✅ Database: Railway PostgreSQL (already set up)
- ✅ Google OAuth credentials (configured)
- ✅ OpenAI API key (configured)

---

## STEP 1: Update Google OAuth for Production

### Add Production Redirect URIs

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your project: **midyear-castle-476802-d6**
3. Click on OAuth 2.0 Client ID: `317117970533-tke6c9o3qetrvd8bdhcbi2e9dnmjjuk5.apps.googleusercontent.com`
4. Add these **Authorized Redirect URIs**:

```
https://meetcuteai.com/api/auth/google/callback
https://www.meetcuteai.com/api/auth/google/callback
http://localhost:3000/api/auth/google/callback (keep for dev)
```

5. Click **SAVE**

---

## STEP 2: Push Code to GitHub

### Create GitHub Repository

1. Go to [https://github.com/new](https://github.com/new)
2. Repository name: `meet-cute`
3. Description: "AI-enhanced pre-meeting ritual platform"
4. Visibility: **Private** (recommended)
5. Click **Create repository**

### Push Your Code

```bash
cd "/Users/clodelremy/Meet Cute"

# Set your GitHub username
git config user.name "Your Name"
git config user.email "your-email@example.com"

# Create initial commit
git add .
git commit -m "Initial commit: Meet Cute platform"

# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/meet-cute.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## STEP 3: Deploy to Railway

### 3.1 Create Railway Project

1. Go to [https://railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub repo"**
3. Connect your GitHub account (if not already connected)
4. Select the `meet-cute` repository
5. Railway will auto-detect and start building

### 3.2 Configure Environment Variables

In Railway Dashboard > Variables, add these:

```bash
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3000
FRONTEND_URL=https://meetcuteai.com
BACKEND_URL=https://meetcuteai.com

# Database (Already exists in Railway)
DATABASE_URL=postgresql://postgres:ppdUxFYHuifBEOFQlHDjeVRQhBWRfoNa@shortline.proxy.rlwy.net:25265/railway

# JWT & Session
JWT_SECRET=qFLmAO3Yd0ZvTrciM3quoMZNi1uViRwraH3l34w0tQu61aZsMjUEGdHPRX1lJmV8bJzQBs4/W45BXMAxfpKBzw==
SESSION_SECRET=byh51/GJ42I7IGBpkzLtJqR9uBpjVsidUPrcIPnyMz3psBo+OduydPfODKis0MyTjNCMQDVIB/lOYm5mdqBqjQ==

# Google OAuth
GOOGLE_CLIENT_ID=317117970533-tke6c9o3qetrvd8bdhcbi2e9dnmjjuk5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://meetcuteai.com/api/auth/google/callback

# OpenAI
OPENAI_API_KEY=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

# Optional: Add later when you set up these services
# MICROSOFT_CLIENT_ID=your_microsoft_client_id
# MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
# SENDGRID_API_KEY=your_sendgrid_api_key
# SENDGRID_FROM_EMAIL=noreply@meetcuteai.com
# TWILIO_ACCOUNT_SID=your_twilio_account_sid
# TWILIO_AUTH_TOKEN=your_twilio_auth_token
# TWILIO_PHONE_NUMBER=your_twilio_phone
# SLACK_CLIENT_ID=your_slack_client_id
# SLACK_CLIENT_SECRET=your_slack_client_secret
```

### 3.3 Run Database Migrations

In Railway Dashboard > your service > Settings > Deploy:

1. Add a **Deploy Command**:
```bash
npx prisma migrate deploy && npm run start
```

Or run manually in Railway CLI:
```bash
npx @railway/cli run npx prisma migrate deploy
```

---

## STEP 4: Configure Custom Domain

### 4.1 Add Domain to Railway

1. In Railway Dashboard > Settings > Domains
2. Click **"Add Domain"**
3. Enter: `meetcuteai.com`
4. Railway will provide DNS settings

### 4.2 Update DNS Records

Go to your domain registrar (where you bought meetcuteai.com) and add:

**Option A: CNAME Record (Recommended)**
```
Type: CNAME
Name: @
Value: <railway-provided-domain>.up.railway.app
TTL: 3600
```

**Option B: A Record**
```
Type: A
Name: @
Value: <IP from Railway>
TTL: 3600
```

**Add WWW subdomain:**
```
Type: CNAME
Name: www
Value: meetcuteai.com
TTL: 3600
```

### 4.3 SSL Certificate

Railway automatically provisions SSL certificates. Wait 5-10 minutes after DNS propagation.

---

## STEP 5: Verify Deployment

### Check Health
1. Visit: `https://meetcuteai.com`
2. Click **"Continue with Google"**
3. Complete OAuth flow
4. Verify dashboard loads

### Test API Endpoints
```bash
curl https://meetcuteai.com/api/health
```

---

## STEP 6: Post-Deployment Tasks

### 6.1 Set up monitoring
- Enable Railway metrics
- Set up error tracking (Sentry)
- Configure uptime monitoring

### 6.2 Configure additional integrations (optional)
- Microsoft OAuth for Outlook
- SendGrid for email delivery
- Twilio for SMS
- Slack integration

### 6.3 Security
- Review CORS settings
- Enable rate limiting
- Set up backup strategy

---

## Quick Deployment Commands

```bash
# Check Railway CLI
npx @railway/cli --version

# Login to Railway
npx @railway/cli login

# Link project
npx @railway/cli link

# Add environment variables
npx @railway/cli variables

# Deploy
git push origin main  # Auto-deploys via GitHub integration

# View logs
npx @railway/cli logs

# Open Railway dashboard
npx @railway/cli open
```

---

## Troubleshooting

### Build Fails
- Check Railway build logs
- Ensure all dependencies are in package.json
- Verify Node version compatibility

### Database Connection Issues
- Verify DATABASE_URL in Railway variables
- Check Prisma schema matches database
- Run migrations: `npx prisma migrate deploy`

### OAuth Redirect Errors
- Verify redirect URIs in Google Console
- Check FRONTEND_URL and BACKEND_URL match domain
- Ensure SSL is active (https://)

### 404 Errors
- Check build output includes frontend dist/
- Verify Express static file serving
- Check Railway deployment logs

---

## Support

- Railway Docs: https://docs.railway.app
- Google OAuth: https://developers.google.com/identity/protocols/oauth2
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment

---

## Next Steps After Deployment

1. ✅ Test all features in production
2. ✅ Set up monitoring and alerts
3. ✅ Configure email templates
4. ✅ Add Microsoft OAuth (optional)
5. ✅ Set up SendGrid/Twilio (optional)
6. ✅ Create user onboarding flow
7. ✅ Launch! 🚀

