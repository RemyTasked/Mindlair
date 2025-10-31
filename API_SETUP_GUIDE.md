# Meet Cute - API Setup Guide

## Current Status

### ✅ What's Working:
- **Frontend UI** - Beautiful landing page at `http://localhost:5173`
- **All Navigation** - Buttons are clickable and responsive  
- **React Routing** - Page structure is set up correctly

### ❌ What's NOT Working (Yet):
- **Backend API** - Server isn't responding (needs database + env variables)
- **Google OAuth** - Button clicks but can't connect to backend
- **Outlook OAuth** - Button clicks but can't connect to backend
- **Database** - Not set up yet

## 🚂 Step 1: Set Up Railway Database (5 minutes)

### Option A: Using Railway Dashboard
1. **Go to Railway**: https://railway.app
2. **Sign up** (it's free - $5 credit/month)
3. **Create New Project** → Click "New Project"
4. **Add PostgreSQL** → Click "Add Database" → Select "PostgreSQL"
5. **Get Connection String**:
   - Click on your PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` value
   - It looks like: `postgresql://postgres:password@host:port/railway`

### Option B: Using Railway CLI (Advanced)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add PostgreSQL
railway add --database postgres

# Get connection string
railway variables
```

---

## 🔑 Step 2: Get Google OAuth Credentials (10 minutes)

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Create a Project**:
   - Click "Select a Project" → "New Project"
   - Name it "Meet Cute"
   - Click "Create"
3. **Enable Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. **Create OAuth Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "Meet Cute OAuth"
   - **Authorized redirect URIs**: Add these:
     - `http://localhost:3000/api/auth/google/callback`
     - `http://localhost:5173/auth/callback`
5. **Copy Your Credentials**:
   - You'll get a **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - You'll get a **Client Secret** (looks like: `GOCSPX-xxxxx`)

---

## 🔑 Step 3: Get Microsoft OAuth Credentials (10 minutes)

1. **Go to Azure Portal**: https://portal.azure.com
2. **Register an Application**:
   - Search for "Azure Active Directory" (or "Microsoft Entra ID")
   - Click "App registrations" → "New registration"
   - Name: "Meet Cute"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: 
     - Type: **Web**
     - URL: `http://localhost:3000/api/auth/microsoft/callback`
   - Click "Register"
3. **Copy Application (client) ID**:
   - On the Overview page, copy the "Application (client) ID"
4. **Create Client Secret**:
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: "Meet Cute Secret"
   - Expires: 24 months
   - Click "Add"
   - **COPY THE SECRET VALUE NOW** (you can't see it again!)
5. **Add API Permissions**:
   - Go to "API permissions"
   - Click "Add a permission" → "Microsoft Graph" → "Delegated permissions"
   - Add these permissions:
     - `Calendars.Read`
     - `Calendars.ReadWrite`
     - `User.Read`
   - Click "Add permissions"
   - Click "Grant admin consent" (if available)

---

## 🤖 Step 4: Get OpenAI API Key (5 minutes)

1. **Go to OpenAI**: https://platform.openai.com
2. **Sign up/Login**
3. **Create API Key**:
   - Click on your profile → "View API keys"
   - Click "Create new secret key"
   - Name it "Meet Cute"
   - Copy the key (starts with `sk-`)

---

## 📧 Step 5: Get SendGrid API Key (Optional - for emails)

1. **Go to SendGrid**: https://sendgrid.com
2. **Sign up** (free tier available)
3. **Create API Key**:
   - Go to "Settings" → "API Keys"
   - Click "Create API Key"
   - Name: "Meet Cute"
   - Permissions: "Full Access"
   - Click "Create & View"
   - Copy the API key (starts with `SG.`)

---

## ⚙️ Step 6: Configure Your .env File

Create a `.env` file in the project root with all your credentials:

```bash
# Database (from Railway Step 1)
DATABASE_URL="postgresql://postgres:password@host:port/railway"

# Google OAuth (from Step 2)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Microsoft OAuth (from Step 3)
MICROSOFT_CLIENT_ID="your-application-id"
MICROSOFT_CLIENT_SECRET="your-secret-value"
MICROSOFT_REDIRECT_URI="http://localhost:3000/api/auth/microsoft/callback"

# OpenAI (from Step 4)
OPENAI_API_KEY="sk-your-openai-key"

# SendGrid (from Step 5 - Optional)
SENDGRID_API_KEY="SG.your-sendgrid-key"
SENDGRID_FROM_EMAIL="noreply@meetcute.app"

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-jwt-key-here-make-it-long-and-random"

# Server Config
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Step 7: Run Database Migrations

Once your `.env` file is set up with the `DATABASE_URL`:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create database tables
npx prisma migrate deploy

# Optional: View your database
npx prisma studio
```

---

## ▶️ Step 8: Start Everything

```bash
# From project root - starts BOTH backend and frontend
npm run dev
```

Or separately:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
cd src/frontend && npm run dev
```

---

## ✅ Step 9: Test the OAuth Flows

1. **Go to**: http://localhost:5173
2. **Click "Continue with Google"**:
   - Should redirect you to Google login
   - After login, redirects back to the app
   - You'll be authenticated!
3. **Click "Continue with Outlook"**:
   - Should redirect you to Microsoft login
   - After login, redirects back to the app
   - You'll be authenticated!

---

## 🎯 Quick Start (If you just want to see it work)

**Minimum Required** to make auth work:
1. ✅ Railway Database (`DATABASE_URL`)
2. ✅ Google OAuth (`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`)
3. ✅ JWT Secret (any random string)
4. ✅ Run `npx prisma migrate deploy`

**For Full Functionality**, also add:
- OpenAI API (for AI-powered meeting cues)
- Microsoft OAuth (for Outlook calendar)
- SendGrid (for email notifications)

---

## 🐛 Troubleshooting

### Backend won't start:
```bash
# Check if .env file exists
ls -la .env

# Check database connection
npx prisma db push

# View detailed errors
npm run dev:backend
```

### OAuth not working:
- Make sure redirect URIs in Google/Microsoft console EXACTLY match your `.env` file
- Check that `FRONTEND_URL` is set to `http://localhost:5173`
- Ensure backend is running on port 3000

### Database errors:
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Push schema without migrations
npx prisma db push
```

---

## 📝 What Happens After Setup

Once everything is configured:

1. **User clicks "Continue with Google"**:
   - Frontend calls → Backend `/api/auth/google/url`
   - Backend generates OAuth URL
   - User redirects to Google
   - User logs in with Google
   - Google redirects back to `/api/auth/google/callback`
   - Backend creates user account in database
   - Backend returns JWT token
   - User is logged in!

2. **App syncs calendar**:
   - Fetches user's meetings from Google Calendar
   - Schedules pre-meeting notifications (5 minutes before)
   - Sends AI-generated focus cues

3. **User gets notifications**:
   - Email (via SendGrid)
   - SMS (via Twilio, if configured)
   - Slack (if connected)

---

## 🎉 You're All Set!

After completing these steps, you'll have a fully functional Meet Cute application with:
- ✅ Google & Outlook calendar integration
- ✅ AI-powered pre-meeting cues
- ✅ Beautiful Focus Scene experience
- ✅ User authentication & dashboard

**Need help?** Check the error logs or feel free to ask!

