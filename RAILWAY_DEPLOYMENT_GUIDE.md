# 🚂 Railway Deployment Guide for Meet Cute

## Overview

Railway offers **3 ways** to deploy your code:
1. ✅ **GitHub Integration** (Recommended - Auto-deploys on push)
2. ⚡ **Railway CLI** (Quick and direct)
3. 📦 **Railway Up** (One-command deploy)

---

## 🎯 Option 1: GitHub Integration (RECOMMENDED)

This is the best approach - Railway will automatically deploy whenever you push to GitHub.

### Step 1: Push Your Code to GitHub

```bash
# Initialize git (if not already done)
cd "/Users/clodelremy/Meet Cute"
git init

# Create .gitignore (already exists, but verify)
cat .gitignore

# Add all files
git add .

# Commit
git commit -m "Initial commit - Meet Cute app"

# Create a new repository on GitHub
# Go to: https://github.com/new
# Name it: "meet-cute"
# Don't initialize with README (we already have one)

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/meet-cute.git
git branch -M main
git push -u origin main
```

### Step 2: Connect Railway to GitHub

1. **Go to Railway**: https://railway.app
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Authorize Railway** to access your GitHub
5. **Select your repository**: `meet-cute`
6. **Railway will automatically detect** your Node.js app

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will create a database and link it automatically
3. The `DATABASE_URL` will be automatically injected as an environment variable

### Step 4: Configure Environment Variables

1. Click on your **Service** (the web app)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** and add each one:

```bash
# These are automatically set by Railway:
# DATABASE_URL (already set by PostgreSQL service)
# PORT (Railway sets this automatically)

# You need to add these manually:
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GOOGLE_REDIRECT_URI=https://your-app.up.railway.app/api/auth/google/callback

MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-secret
MICROSOFT_REDIRECT_URI=https://your-app.up.railway.app/api/auth/microsoft/callback

OPENAI_API_KEY=sk-your-openai-key

SENDGRID_API_KEY=SG.your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@meetcute.app

JWT_SECRET=your-super-secret-random-string

NODE_ENV=production
FRONTEND_URL=https://your-app.up.railway.app
```

**Note:** Railway will give you a URL like `https://meet-cute-production-xxxx.up.railway.app` - use this for your redirect URIs!

### Step 5: Configure Build Settings

Railway should auto-detect, but verify:

1. Go to **"Settings"** tab
2. **Root Directory**: Leave blank (or set to `/` if needed)
3. **Build Command**: `npm install && npx prisma generate`
4. **Start Command**: `npm start`

### Step 6: Update OAuth Redirect URIs

Once Railway gives you your production URL:

1. **Google Console**:
   - Add `https://your-app.up.railway.app/api/auth/google/callback`
2. **Microsoft Azure**:
   - Add `https://your-app.up.railway.app/api/auth/microsoft/callback`

### Step 7: Deploy!

Railway will automatically deploy. You can:
- **Watch logs** in the "Deployments" tab
- **View your app** by clicking the domain link
- **Re-deploy** by pushing to GitHub (automatic!)

---

## ⚡ Option 2: Railway CLI (Quick Deploy)

Perfect for quick deployments without GitHub setup.

### Step 1: Install Railway CLI

```bash
# Install globally
npm install -g @railway/cli

# Or use npx (no install needed)
npx @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser - authorize the CLI.

### Step 3: Initialize Project

```bash
cd "/Users/clodelremy/Meet Cute"

# Link to existing project OR create new one
railway init
```

You'll be prompted:
- **Create new project** → Name it "Meet Cute"
- Or **Link to existing project** → Select from your Railway dashboard

### Step 4: Add PostgreSQL

```bash
railway add --database postgres
```

### Step 5: Set Environment Variables

```bash
# Set variables one by one
railway variables set GOOGLE_CLIENT_ID=your-value
railway variables set GOOGLE_CLIENT_SECRET=your-value
railway variables set MICROSOFT_CLIENT_ID=your-value
railway variables set MICROSOFT_CLIENT_SECRET=your-value
railway variables set OPENAI_API_KEY=your-value
railway variables set JWT_SECRET=your-random-secret
railway variables set NODE_ENV=production

# Or edit in browser
railway open
# Then go to Variables tab
```

### Step 6: Deploy!

```bash
# Deploy your current code
railway up
```

Railway will:
- ✅ Upload your code
- ✅ Install dependencies
- ✅ Run build commands
- ✅ Start your app
- ✅ Give you a public URL

### Step 7: View Your App

```bash
# Open in browser
railway open

# View logs
railway logs

# Check status
railway status
```

---

## 📦 Option 3: Railway Up (One Command)

Super quick, but less control.

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Deploy in one command!
cd "/Users/clodelremy/Meet Cute"
railway up

# Railway will prompt you to create a new project
# Follow the prompts
```

---

## 🔧 Important Configuration for Meet Cute

### Update Your `package.json` Start Scripts

Make sure your `package.json` has these scripts:

```json
{
  "scripts": {
    "start": "node dist/backend/server.js",
    "build": "tsc && cd src/frontend && npm run build",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "nodemon --exec ts-node src/backend/server.ts",
    "dev:frontend": "cd src/frontend && npm run dev"
  }
}
```

### Create a Railway-specific Configuration

Create a `railway.toml` file in your project root:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npx prisma generate && npm run build"

[deploy]
startCommand = "npx prisma migrate deploy && npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Add Nixpacks Configuration

Create a `nixpacks.toml` file:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npx prisma generate", "npm run build"]

[start]
cmd = "npx prisma migrate deploy && npm start"
```

---

## 🗂️ Project Structure for Railway

Railway needs to see:

```
/Users/clodelremy/Meet Cute/
├── package.json          ← Main package.json
├── tsconfig.json         ← TypeScript config
├── prisma/
│   └── schema.prisma     ← Database schema
├── src/
│   ├── backend/          ← Backend code
│   └── frontend/         ← Frontend code
├── railway.toml          ← Railway config (optional)
├── nixpacks.toml         ← Build config (optional)
└── .gitignore
```

---

## 🌐 Serving Frontend + Backend Together

Since you have both frontend and backend, you have **2 options**:

### Option A: Serve Frontend from Backend (Simpler)

Update your `src/backend/server.ts`:

```typescript
import express from 'express';
import path from 'path';

const app = express();

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// API routes
app.use('/api', apiRoutes);

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
```

Build script in `package.json`:
```json
{
  "scripts": {
    "build": "tsc && cd src/frontend && npm run build && mv dist ../../dist/frontend"
  }
}
```

### Option B: Separate Services (More Scalable)

Deploy frontend and backend as **2 separate Railway services**:

1. **Backend Service**:
   - Deploy from `/src/backend`
   - Runs Express API
   - Gets database connection

2. **Frontend Service**:
   - Deploy from `/src/frontend`
   - Serve static React build
   - Points to backend API URL

---

## 📋 Pre-Deployment Checklist

- [ ] Code is committed to Git
- [ ] `.env` file is **NOT** committed (check `.gitignore`)
- [ ] `package.json` has `"start"` script
- [ ] Database schema is finalized (`prisma/schema.prisma`)
- [ ] OAuth redirect URIs updated for production URL
- [ ] All environment variables ready to set
- [ ] Frontend build command works: `cd src/frontend && npm run build`
- [ ] Backend compiles: `tsc`

---

## 🚀 Quick Deploy Commands (All Methods)

### GitHub Method:
```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
# Railway auto-deploys!
```

### CLI Method:
```bash
railway login
railway init
railway add --database postgres
railway up
railway open
```

### One-Command Method:
```bash
railway login && railway up
```

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Check logs
railway logs

# Common issues:
# 1. Missing dependencies - Make sure all packages in package.json
# 2. TypeScript errors - Run `tsc` locally first
# 3. Prisma errors - Run `npx prisma generate` locally
```

### Database Connection Fails
```bash
# Railway automatically sets DATABASE_URL
# Verify it's set:
railway variables

# Test connection locally:
railway run npx prisma db pull
```

### Frontend Not Loading
```bash
# Make sure frontend is built:
cd src/frontend
npm run build

# Check if dist folder exists:
ls -la dist/

# Verify backend serves static files (see Option A above)
```

### Environment Variables Not Working
```bash
# List all variables
railway variables

# Set missing ones
railway variables set KEY=value

# Or set in browser
railway open
# Go to Variables tab
```

---

## 📊 After Deployment

### View Your App
```bash
railway open
```

### Monitor Logs
```bash
railway logs
```

### Run Database Migrations
```bash
railway run npx prisma migrate deploy
```

### Check Service Status
```bash
railway status
```

### Connect to Database Directly
```bash
railway connect postgres
```

---

## 💰 Railway Pricing

- **Hobby Plan**: $5/month included credit (Free to start!)
- **Usage-based**: You pay for what you use
- **Estimated costs for Meet Cute**:
  - PostgreSQL: ~$2-3/month
  - Web service: ~$2-5/month
  - Total: **~$5-8/month**

**Free tier includes**: $5 credit/month, perfect for testing!

---

## 🎉 Complete Deployment Flow

1. **Push to GitHub** → Railway auto-detects
2. **Add PostgreSQL** → Database auto-configured
3. **Set ENV variables** → OAuth, API keys, etc.
4. **Railway builds** → Installs deps, compiles TS
5. **Railway deploys** → Runs migrations, starts server
6. **Get URL** → `https://meet-cute-production.up.railway.app`
7. **Update OAuth** → Add production URL to Google/Microsoft
8. **Test!** → Sign in with Google/Outlook

---

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app

Your app is ready to deploy! Choose your method and let's get it live! 🚀

