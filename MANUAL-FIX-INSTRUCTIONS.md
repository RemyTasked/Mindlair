# Manual Fix for Failed Migration - Railway Database

The deployment is failing because Prisma has recorded failed migrations in the database. We need to manually fix this using Railway's database console.

## Steps to Fix:

### 1. Open Railway Database Console
1. Go to Railway dashboard: https://railway.app
2. Select your project: `meet-cute`
3. Click on the **Postgres** service
4. Click on the **Data** tab
5. Click on **Query** (or **Connect**)

### 2. Run the Fix SQL Script

Copy and paste this SQL into the Railway console and run it:

```sql
-- Step 1: Mark ALL failed migrations as rolled back
UPDATE "_prisma_migrations" 
SET rolled_back_at = NOW(), 
    finished_at = NOW()
WHERE finished_at IS NULL;

-- Step 2: Drop old constraint if exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'calendar_accounts_userId_provider_key'
    ) THEN
        ALTER TABLE "calendar_accounts" DROP CONSTRAINT "calendar_accounts_userId_provider_key";
        RAISE NOTICE 'Dropped old constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop old constraint: %', SQLERRM;
END $$;

-- Step 3: Add new constraint if doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'calendar_accounts_userId_provider_email_key'
    ) THEN
        ALTER TABLE "calendar_accounts" ADD CONSTRAINT "calendar_accounts_userId_provider_email_key" UNIQUE ("userId", "provider", "email");
        RAISE NOTICE 'Added new constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add new constraint: %', SQLERRM;
END $$;
```

### 3. Verify the Fix

Run this to check if it worked:

```sql
-- Check constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'calendar_accounts'::regclass
AND conname LIKE '%userId%';

-- Should show: calendar_accounts_userId_provider_email_key
```

### 4. Trigger a New Deployment

After running the SQL:
1. Go back to Railway dashboard
2. Click on your **meet-cute** service
3. Click **Deploy** → **Redeploy**

OR just push a small change to trigger deployment:

```bash
cd "/Users/clodelremy/Meet Cute"
git commit --allow-empty -m "trigger redeploy after manual db fix"
git push origin main
```

### 5. Watch the Logs

The deployment should now succeed! You should see:
- ✅ "32 migrations found in prisma/migrations"
- ✅ "All migrations have been successfully applied"
- ✅ "Starting Meet Cute Deployment"
- ✅ "Server listening on port 3000"

---

## What This Does:

1. **Marks failed migrations as rolled back** - tells Prisma to continue
2. **Drops the old constraint** - removes `(userId, provider)` unique constraint
3. **Adds the new constraint** - adds `(userId, provider, email)` unique constraint
4. **Allows multiple calendars** - you can now add multiple Google/Outlook accounts

---

## If You Need Help:

If you're not comfortable running SQL directly, I can help you through it step by step. Just let me know!

