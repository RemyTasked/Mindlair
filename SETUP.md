# Meet Cute - Setup Guide

This guide will walk you through setting up Meet Cute from scratch.

## Prerequisites

Before you begin, ensure you have:

- Node.js 18 or later installed
- PostgreSQL database (local or cloud)
- A text editor or IDE
- Terminal/command line access

## Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd src/frontend
npm install
cd ../..
```

## Step 2: Database Setup

### Option A: Local PostgreSQL

1. Install PostgreSQL:
   - **macOS**: `brew install postgresql`
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/)
   - **Linux**: `sudo apt-get install postgresql`

2. Start PostgreSQL:
   ```bash
   # macOS
   brew services start postgresql
   
   # Linux
   sudo service postgresql start
   ```

3. Create database:
   ```bash
   createdb meetcute
   ```

4. Your connection string:
   ```
   postgresql://localhost:5432/meetcute?schema=public
   ```

### Option B: Cloud Database (Railway)

1. Go to [Railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Copy the connection string from Railway dashboard
4. Use this in your `.env` file

## Step 3: Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

DATABASE_URL="postgresql://localhost:5432/meetcute?schema=public"

SESSION_SECRET=change-this-to-random-string
JWT_SECRET=change-this-to-another-random-string
JWT_EXPIRES_IN=7d

# Continue with API keys below...
```

## Step 4: Google Calendar Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create Project**
   - Click "Select a project" → "New Project"
   - Name: "Meet Cute"
   - Click "Create"

3. **Enable APIs**
   - Go to "APIs & Services" → "Library"
   - Search and enable:
     - Google Calendar API
     - Google People API (for user info)

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Meet Cute Web Client"
   
5. **Configure OAuth Consent Screen** (if prompted)
   - User Type: External (for testing)
   - App name: "Meet Cute"
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add the following:
     - `.../auth/calendar.readonly`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`

6. **Add Redirect URIs**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`

7. **Copy Credentials**
   - Copy "Client ID" and "Client Secret"
   - Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

## Step 5: Microsoft Outlook Setup

1. **Go to Azure Portal**
   - Visit: https://portal.azure.com/

2. **Register Application**
   - Search "App registrations" → "New registration"
   - Name: "Meet Cute"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Web → `http://localhost:3000/auth/microsoft/callback`
   - Click "Register"

3. **Create Client Secret**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: "Meet Cute Dev"
   - Expires: 24 months
   - Click "Add"
   - **IMPORTANT**: Copy the secret value immediately (it won't be shown again)

4. **Configure API Permissions**
   - Go to "API permissions"
   - Click "Add a permission" → "Microsoft Graph" → "Delegated permissions"
   - Add these permissions:
     - `User.Read`
     - `Calendars.Read`
     - `offline_access`
   - Click "Add permissions"
   - (Optional) Click "Grant admin consent" if you have admin rights

5. **Copy Credentials**
   - Application (client) ID is on the Overview page
   - Add to `.env`:
   ```env
   MICROSOFT_CLIENT_ID=your-application-id
   MICROSOFT_CLIENT_SECRET=your-client-secret-value
   MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
   ```

## Step 6: OpenAI Setup

1. **Get API Key**
   - Go to: https://platform.openai.com/api-keys
   - Sign up or log in
   - Click "Create new secret key"
   - Name: "Meet Cute"
   - Copy the key

2. **Add to .env**
   ```env
   OPENAI_API_KEY=sk-proj-...your-key
   ```

3. **Add Credits** (if needed)
   - Go to: https://platform.openai.com/account/billing
   - Add payment method and credits

## Step 7: SendGrid Email Setup

1. **Sign up for SendGrid**
   - Visit: https://signup.sendgrid.com/

2. **Verify Sender Identity**
   - Go to Settings → Sender Authentication
   - Choose "Single Sender Verification" (easiest for development)
   - Enter your email and verify it

3. **Create API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name: "Meet Cute"
   - Permissions: "Full Access" (or "Restricted" with Mail Send only)
   - Copy the API key

4. **Add to .env**
   ```env
   SENDGRID_API_KEY=SG.your-api-key
   SENDGRID_FROM_EMAIL=your-verified-email@example.com
   SENDGRID_FROM_NAME=Meet Cute
   ```

## Step 8: Slack Setup (Optional)

1. **Create Incoming Webhook**
   - Go to: https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - App Name: "Meet Cute"
   - Select your workspace
   
2. **Enable Incoming Webhooks**
   - In your app, go to "Incoming Webhooks"
   - Toggle "Activate Incoming Webhooks" to On
   - Click "Add New Webhook to Workspace"
   - Select a channel
   - Copy the webhook URL

3. **Users configure their webhook**
   - Users will paste their webhook URL in Settings page
   - No .env configuration needed

## Step 9: Twilio SMS Setup (Optional)

1. **Sign up for Twilio**
   - Visit: https://www.twilio.com/try-twilio

2. **Get Phone Number**
   - Go to Phone Numbers → Buy a number
   - Choose a number with SMS capability

3. **Get Credentials**
   - Go to Console Dashboard
   - Copy Account SID and Auth Token

4. **Add to .env**
   ```env
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

## Step 10: Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

## Step 11: Start the Application

```bash
# Start both backend and frontend
npm run dev
```

This will start:
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

## Step 12: Test the Application

1. Open http://localhost:5173 in your browser
2. Click "Continue with Google" or "Continue with Outlook"
3. Complete the OAuth flow
4. You'll be redirected to the dashboard
5. Go to Settings to configure your preferences
6. Add some test meetings to your calendar

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
psql --version
pg_isready

# Test connection
psql -d meetcute -U your-username
```

### OAuth Redirect Issues

Make sure redirect URIs exactly match in:
- `.env` file
- Google Cloud Console / Azure Portal
- No trailing slashes

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port in .env
PORT=3001
```

### Prisma Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### Node Version Issues

```bash
# Check version
node --version

# Should be 18 or higher
# Use nvm to manage versions
nvm install 18
nvm use 18
```

## Next Steps

1. **Add Test Meetings**: Create some calendar events
2. **Configure Preferences**: Set your tone and timing
3. **Test Focus Scene**: Click a meeting's Focus Scene link
4. **Enable Deliveries**: Set up Email, Slack, or SMS
5. **Monitor Logs**: Check `logs/` directory for debugging

## Production Deployment

See `DEPLOYMENT.md` for production deployment guide.

## Need Help?

- Check the main README.md
- Review the troubleshooting section above
- Open an issue on GitHub
- Check logs in `logs/combined.log`

Happy meeting preparation! 🎬

