# 🎯 Simple 2-Minute Fix for Railway Database

## The Problem
The constraint `calendar_accounts_userId_provider_email_key` **already exists** in your database (which is good!), but Prisma thinks the migration failed. We just need to tell Prisma the migration is complete.

## The Fix (2 minutes)

### Step 1: Open Railway Postgres
1. Go to https://railway.app
2. Click on **Postgres** service (not meet-cute)
3. Click **Data** tab at the top

### Step 2: Find the Failed Migration
1. In the left sidebar, click on table: **`_prisma_migrations`**
2. Look for the row where `migration_name` = `20251110213000_fix_calendar_account_unique_constraint`
3. You'll see `finished_at` is **empty/NULL** - this is the problem!

### Step 3: Mark it as Complete
**Option A: Edit the Row Directly (Easiest)**
1. Click on that row to edit it
2. Find the `finished_at` column
3. Set it to: `2025-11-11 04:40:00` (or copy the timestamp from another row)
4. Find the `applied_steps_count` column
5. Set it to: `1`
6. Click **Save**

**Option B: Run SQL Query**
1. Click the **Query** tab (if available)
2. Paste this SQL:
```sql
UPDATE "_prisma_migrations" 
SET 
  finished_at = NOW(),
  applied_steps_count = 1
WHERE migration_name = '20251110213000_fix_calendar_account_unique_constraint'
AND finished_at IS NULL;
```
3. Click **Run** or **Execute**

### Step 4: Trigger Redeploy
The app will automatically redeploy and should work! 🎉

---

## If You Can't Find the Query Tab

If there's no Query tab in Railway, just edit the row directly (Option A above). It's the same thing!

---

## What This Does

This tells Prisma: "Hey, that migration is actually done! The constraint exists, so we're good."

The next deployment will then proceed normally without trying to re-run this migration.

