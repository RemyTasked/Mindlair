# Meet Cute - Quick Start Guide

Get Meet Cute running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running locally OR Railway account (free)
- Google/Microsoft developer account (free)

## 1. Clone and Install (2 min)

```bash
# Clone repository
cd "Meet Cute"

# Install dependencies
npm install
cd src/frontend && npm install && cd ../..
```

## 2. Database Setup (2 min)

### Option A: Local PostgreSQL
```bash
# Create database
createdb meetcute

# Your connection string:
# postgresql://localhost:5432/meetcute?schema=public
```

### Option B: Railway (Cloud - Easiest)
1. Go to https://railway.app
2. Create project → Add PostgreSQL
3. Copy the DATABASE_URL from Railway dashboard

## 3. Environment Setup (3 min)

Create `.env` file in root:

```env
# Basics
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Database (use your connection string)
DATABASE_URL="postgresql://localhost:5432/meetcute?schema=public"

# Secrets (generate random strings)
SESSION_SECRET=any-random-string-here
JWT_SECRET=another-random-string-here

# Google Calendar (get from console.cloud.google.com)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# OpenAI (get from platform.openai.com)
OPENAI_API_KEY=sk-your-openai-key

# SendGrid (get from sendgrid.com)
SENDGRID_API_KEY=SG.your-sendgrid-key
SENDGRID_FROM_EMAIL=your-verified-email@example.com
SENDGRID_FROM_NAME=Meet Cute

# Microsoft (optional - get from portal.azure.com)
MICROSOFT_CLIENT_ID=your-microsoft-id
MICROSOFT_CLIENT_SECRET=your-microsoft-secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

# Twilio SMS (optional - get from twilio.com)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

## 4. Google Calendar Setup (2 min)

1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable "Google Calendar API"
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Redirect URI: `http://localhost:3000/auth/google/callback`
5. Copy Client ID and Secret to `.env`

## 5. OpenAI Setup (1 min)

1. Go to https://platform.openai.com/api-keys
2. Create API key
3. Copy to `.env`
4. Add $5-10 credits if needed

## 6. SendGrid Setup (2 min)

1. Sign up at https://sendgrid.com/ (free tier)
2. Verify sender email
3. Create API key (Settings → API Keys)
4. Copy to `.env`

## 7. Initialize Database (1 min)

```bash
npx prisma generate
npx prisma migrate dev --name init
```

## 8. Start the App (1 min)

```bash
npm run dev
```

This starts:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## 9. Test It Out!

1. Open http://localhost:5173
2. Click "Continue with Google"
3. Complete OAuth flow
4. Add a test meeting to your Google Calendar (5-10 minutes from now)
5. Wait for the pre-meeting cue!

## Troubleshooting

### "Database connection failed"
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in .env

### "OAuth error"
- Check redirect URIs match exactly
- No trailing slashes
- http vs https must match

### "Port already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### "Prisma error"
```bash
# Reset and regenerate
npx prisma generate
npx prisma migrate reset
```

## What's Next?

- **Configure Settings**: Adjust tone and timing in dashboard
- **Test Focus Scene**: Click a meeting's Focus Scene link
- **Enable Slack**: Add webhook URL in settings
- **Read Full Docs**: See README.md and SETUP.md

## Minimal Required Services

To get started with minimal setup, you only need:
1. ✅ Google Calendar OAuth (required)
2. ✅ OpenAI API (required)
3. ✅ SendGrid Email (required)
4. ❌ Microsoft Outlook (optional)
5. ❌ Slack (optional)
6. ❌ Twilio SMS (optional)

## Quick Commands Reference

```bash
# Development
npm run dev                  # Start both servers
npm run dev:backend         # Backend only
npm run dev:frontend        # Frontend only

# Database
npx prisma studio           # Visual database editor
npx prisma migrate dev      # Create new migration

# Production
npm run build              # Build for production
npm start                  # Start production server
```

## Getting API Keys - Quick Links

- **Google Cloud**: https://console.cloud.google.com/
- **OpenAI**: https://platform.openai.com/api-keys
- **SendGrid**: https://app.sendgrid.com/settings/api_keys
- **Railway DB**: https://railway.app/ (easiest database option)
- **Microsoft**: https://portal.azure.com/ (optional)
- **Twilio**: https://www.twilio.com/console (optional)

## Common First-Time Issues

1. **No meetings showing up?**
   - Wait 1 minute for scheduler to run
   - Check logs: `logs/combined.log`
   - Verify calendar has upcoming events

2. **Cue not sent?**
   - Check SendGrid verified sender
   - Check email delivery settings in dashboard
   - Look for errors in logs

3. **Focus Scene not loading?**
   - Check BASE_URL and FRONTEND_URL in .env
   - Verify ports 3000 and 5173 are accessible

## Need More Help?

- Full setup: [SETUP.md](./SETUP.md)
- Deployment: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Features: [README.md](./README.md)
- Issues: GitHub Issues

You're all set! Enjoy your pre-meeting rituals! 🎬

