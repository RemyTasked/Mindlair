# How to Seed Games Database on Railway

## Method 1: Railway CLI (Recommended)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway
```bash
railway login
```
This will open your browser to authenticate.

### Step 3: Link to Your Project
```bash
cd "/Users/clodelremy/Meet Cute"
railway link
```
Select your `ravishing-wholeness` project when prompted.

### Step 4: Run the Seed Script
```bash
railway run npm run seed:games
```

Or directly:
```bash
railway run npx ts-node src/backend/scripts/seedGames.ts
```

## Method 2: Add Seed Script to Railway Build

You can also add the seed script to run automatically after deployment:

1. In Railway dashboard, go to your `meet-cute` service
2. Go to "Settings" → "Build Command"
3. Add the seed command to run after build (optional)

## Method 3: One-Time Deployment Script

Create a temporary deployment that runs the seed script:

1. In Railway, create a new service or use an existing one
2. Set the start command to: `npx ts-node src/backend/scripts/seedGames.ts && sleep 10`
3. Deploy it once, then you can delete the service

## Method 4: Use Railway's Database Proxy

Railway provides a database proxy feature:

1. In Railway dashboard, go to your Postgres service
2. Look for "Connect" or "Proxy" option
3. This will give you a local proxy URL
4. Use that URL in your `.env` temporarily
5. Run: `npm run seed:games`

## Quick Commands Summary

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project (from project root)
railway link

# Run seed script
railway run npm run seed:games
```

## Troubleshooting

### "railway: command not found"
- Make sure Railway CLI is installed: `npm install -g @railway/cli`
- Try: `npx @railway/cli` instead

### "Project not found"
- Make sure you're logged in: `railway login`
- Check you're in the right directory
- Try: `railway link` again

### "Cannot find module"
- Make sure you're in the project root
- Try: `railway run npm install && railway run npm run seed:games`

