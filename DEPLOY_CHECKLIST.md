# 🚀 Meet Cute - Production Deployment Checklist

## ✅ TASK 1: Google OAuth (5 minutes)

**URL:** https://console.cloud.google.com/apis/credentials

**Steps:**
1. Select project: `midyear-castle-476802-d6`
2. Click OAuth 2.0 Client: `317117970533-tke6c9o3qetrvd8bdhcbi2e9dnmjjuk5.apps.googleusercontent.com`
3. Scroll to **Authorized redirect URIs**
4. Click **+ ADD URI** and add:
   ```
   https://meetcuteai.com/api/auth/google/callback
   ```
5. Click **+ ADD URI** again and add:
   ```
   https://www.meetcuteai.com/api/auth/google/callback
   ```
6. Click **SAVE** at the bottom

**Keep existing:**
- `http://localhost:3000/api/auth/google/callback` (for local dev)

---

## ✅ TASK 2: Push to GitHub (10 minutes)

### Step 1: Create GitHub Repository
1. Go to: https://github.com/new
2. Repository name: `meet-cute`
3. Description: "AI-enhanced pre-meeting ritual platform"
4. Visibility: **Private**
5. Do NOT initialize with README (we already have code)
6. Click **Create repository**

### Step 2: Push Your Code
Open Terminal and run these commands:

```bash
# Navigate to project
cd "/Users/clodelremy/Meet Cute"

# Configure Git
git config user.name "Your Name"
git config user.email "your@email.com"

# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: Meet Cute production ready"

# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/meet-cute.git

# Push code
git branch -M main
git push -u origin main
```

**Note:** Replace `YOUR_USERNAME` with your GitHub username!

---

## ✅ TASK 3: Deploy on Railway (15 minutes)

### Step 1: Create Railway Project

1. **Go to:** https://railway.app/new
2. **Click:** "Deploy from GitHub repo"
3. **Authorize:** GitHub access (if first time)
4. **Select:** Your `meet-cute` repository
5. Railway will start building automatically

### Step 2: Add Environment Variables

In Railway Dashboard:
1. Click your project
2. Go to **Variables** tab
3. Click **+ New Variable**
4. Add each variable below:

```bash
NODE_ENV=production
PORT=3000

FRONTEND_URL=https://meetcuteai.com
BACKEND_URL=https://meetcuteai.com

DATABASE_URL=postgresql://postgres:ppdUxFYHuifBEOFQlHDjeVRQhBWRfoNa@shortline.proxy.rlwy.net:25265/railway

JWT_SECRET=qFLmAO3Yd0ZvTrciM3quoMZNi1uViRwraH3l34w0tQu61aZsMjUEGdHPRX1lJmV8bJzQBs4/W45BXMAxfpKBzw==

SESSION_SECRET=byh51/GJ42I7IGBpkzLtJqR9uBpjVsidUPrcIPnyMz3psBo+OduydPfODKis0MyTjNCMQDVIB/lOYm5mdqBqjQ==

GOOGLE_CLIENT_ID=317117970533-tke6c9o3qetrvd8bdhcbi2e9dnmjjuk5.apps.googleusercontent.com

GOOGLE_CLIENT_SECRET=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

GOOGLE_REDIRECT_URI=https://meetcuteai.com/api/auth/google/callback

OPENAI_API_KEY=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
```

**Tip:** Copy-paste each line, Railway will auto-parse the format.

### Step 3: Add Custom Domain

1. In Railway Dashboard, go to **Settings**
2. Scroll to **Domains** section
3. Click **+ Custom Domain**
4. Enter: `meetcuteai.com`
5. Railway will show you DNS records

### Step 4: Update DNS

Go to your domain registrar (where you bought meetcuteai.com):

**Add CNAME Record:**
```
Type: CNAME
Name: @
Value: [Railway will provide this, e.g., meet-cute-production.up.railway.app]
TTL: 3600 (or Auto)
```

**Add WWW CNAME:**
```
Type: CNAME
Name: www
Value: meetcuteai.com
TTL: 3600
```

**Note:** DNS changes take 5-60 minutes to propagate.

---

## ✅ VERIFICATION (5 minutes)

### After deployment completes and DNS propagates:

1. **Visit:** https://meetcuteai.com
   - Should show Meet Cute landing page
   
2. **Test Google OAuth:**
   - Click "Continue with Google"
   - Sign in with Google account
   - Should redirect back to dashboard

3. **Check Health:**
   - Visit: https://meetcuteai.com/api/health
   - Should return: `{"status":"ok","timestamp":"..."}`

4. **Check Railway Logs:**
   - In Railway Dashboard > Deployments > View Logs
   - Look for: "🚀 Meet Cute server running on port 3000"

---

## 🆘 TROUBLESHOOTING

### Build Fails
- Check Railway logs for errors
- Ensure all dependencies are in package.json
- Verify Node version: 18.x or higher

### OAuth Redirect Error
- Double-check Google Console redirect URIs
- Ensure they match exactly: `https://meetcuteai.com/api/auth/google/callback`
- No trailing slashes!

### 502 Bad Gateway
- Check Railway logs for startup errors
- Verify DATABASE_URL is correct
- Ensure PORT environment variable is set

### CSS/Assets Not Loading
- Check Railway build completed successfully
- Verify frontend build output exists in dist/
- Check server.ts static file configuration

---

## 📞 SUPPORT RESOURCES

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Google OAuth Docs:** https://developers.google.com/identity/protocols/oauth2
- **Project Documentation:** See PRODUCTION_DEPLOYMENT.md

---

## 🎉 POST-DEPLOYMENT

Once live, you can:

1. **Test all features:** Sign in, calendar sync, focus scene
2. **Monitor:** Set up Railway monitoring/alerts
3. **Iterate:** Add Microsoft OAuth, Slack, SMS features
4. **Scale:** Railway auto-scales based on usage
5. **Celebrate:** You've deployed an AI-powered SaaS! 🎉

---

**Estimated Total Time:** 30-40 minutes
**Difficulty:** Beginner-friendly
**Cost:** Free tier available on Railway

Good luck! 🚀

