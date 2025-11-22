# How to Populate the Games Database

## Option 1: Local Development (Recommended First)

### Prerequisites
- Node.js installed
- Database connection configured in `.env` file
- Prisma migrations run: `npm run prisma:migrate`

### Steps

1. **Make sure your database is running and accessible**
   ```bash
   # Check your .env file has DATABASE_URL
   cat .env | grep DATABASE_URL
   ```

2. **Run the seed script**
   ```bash
   # From project root
   npm run seed:games
   
   # Or directly with ts-node
   npx ts-node src/backend/scripts/seedGames.ts
   ```

3. **Verify it worked**
   ```bash
   # You should see output like:
   # 🌱 Seeding game questions and pairs...
   # 📝 Seeding questions...
   # ✅ Seeded 20 questions
   # 🎯 Seeding pairs...
   # ✅ Seeded 30 pairs
   # 🎉 Game seeding complete!
   ```

## Option 2: Railway Production Database

### Method A: Using Railway CLI

1. **Install Railway CLI** (if not already installed)
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Link to your project**
   ```bash
   railway link
   ```

4. **Run the seed script in Railway environment**
   ```bash
   railway run npx ts-node src/backend/scripts/seedGames.ts
   ```

### Method B: Using Railway Dashboard

1. Go to your Railway project dashboard
2. Select your `meet-cute` service
3. Go to the "Deployments" tab
4. Click "New Deployment" or use the shell/terminal feature
5. Run:
   ```bash
   npx ts-node src/backend/scripts/seedGames.ts
   ```

### Method C: SSH into Railway Service

1. In Railway dashboard, go to your service
2. Click on "Settings" → "Generate Shell Command"
3. Copy the command and run it locally
4. Once connected, run:
   ```bash
   npx ts-node src/backend/scripts/seedGames.ts
   ```

## Option 3: Direct Database Connection

If you have direct database access:

1. **Get your DATABASE_URL from Railway**
   - Go to Railway dashboard
   - Select your service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` value

2. **Set it locally temporarily**
   ```bash
   export DATABASE_URL="your-railway-database-url"
   ```

3. **Run the seed script**
   ```bash
   npm run seed:games
   ```

## Troubleshooting

### Error: "Cannot find module '@prisma/client'"
```bash
# Run Prisma generate first
npm run prisma:generate
```

### Error: "Database connection failed"
- Check your `DATABASE_URL` is correct
- Verify the database is running
- Check network/firewall settings

### Error: "Table does not exist"
```bash
# Run migrations first
npm run prisma:migrate:deploy
```

### Verify Data Was Seeded

You can check if data exists using Prisma Studio:
```bash
npm run prisma:studio
```

Then navigate to `GameQuestion` and `GamePair` tables to see the data.

## What Gets Seeded

- **20+ Scene Sense Questions** across categories:
  - Calm
  - Confidence
  - Connection
  - Boundaries
  - Clarity
  - Recovery

- **30+ Mind Match Pairs** across domains:
  - Calm
  - Confidence
  - Boundaries
  - Clarity
  - Recovery

- **Difficulty Levels**: 1-5 (progressive unlocks)
- **Scene Matching**: Questions/pairs tagged for specific meeting types

## After Seeding

Once seeded, refresh your Games Hub page and the games should be playable!

