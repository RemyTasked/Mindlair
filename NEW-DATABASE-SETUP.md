# 🚀 Quick Setup: New Postgres Database

## Step 1: Create New Postgres Database (2 minutes)

1. Go to Railway Dashboard: https://railway.app
2. Click on your project **"ravishing-wholeness"**
3. Click **"+ New"** button (top right)
4. Select **"Database"**
5. Select **"Postgres"**
6. Wait for it to provision (~30 seconds)
7. You'll see a new **"Postgres"** service appear

## Step 2: Get the New DATABASE_URL

1. Click on the **new Postgres service** you just created
2. Click **"Variables"** tab
3. Find **"DATABASE_URL"** variable
4. **Copy the entire value** (it will be something like `postgresql://postgres:password@host:port/railway`)

## Step 3: Update the meet-cute Service

1. Click on **"meet-cute"** service (not the new Postgres)
2. Click **"Variables"** tab
3. Find **"DATABASE_URL"** variable
4. Click **"Edit"** (pencil icon)
5. **Paste the new DATABASE_URL** from Step 2
6. Click **"Save"**

## Step 4: Run Migrations

Once you've updated the DATABASE_URL, come back here and I'll run the migrations automatically!

---

**After you complete Steps 1-3, tell me "done" and I'll run the migrations!** 🎯

