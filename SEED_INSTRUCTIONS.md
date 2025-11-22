# Quick Guide: Seed Games Database on Railway

## ✅ Easiest Method: Railway CLI (Run in Your Terminal)

Open your terminal and run these commands one by one:

```bash
# 1. Navigate to project
cd "/Users/clodelremy/Meet Cute"

# 2. Login to Railway (will open browser)
railway login

# 3. Link to your project (select "ravishing-wholeness")
railway link

# 4. Run the seed script
railway run npm run seed:games
```

That's it! The games database will be populated.

## 🔍 What to Expect

You should see output like:
```
🌱 Seeding game questions and pairs...
📝 Seeding questions...
✅ Seeded 20 questions
🎯 Seeding pairs...
✅ Seeded 30 pairs
🎉 Game seeding complete!
```

## ❌ If Railway CLI Doesn't Work

### Option A: Use Railway Dashboard
1. Go to https://railway.app
2. Select your `ravishing-wholeness` project
3. Click on your `meet-cute` service
4. Look for "Deployments" or "Logs" tab
5. There should be a way to run commands or access a shell

### Option B: Add to Startup Script
We can modify the server to automatically seed on first startup. Let me know if you want this approach.

### Option C: Direct Database Access
If you have direct database access (like pgAdmin or DBeaver), you can manually insert the data, but this is more complex.

## 🎮 After Seeding

Once the database is seeded:
1. Refresh your Games Hub page
2. Click "Start Game"
3. The games should now work!

## Need Help?

If you run into issues:
- Check Railway dashboard for any error messages
- Make sure you're logged into Railway CLI: `railway whoami`
- Verify project is linked: `railway status`

