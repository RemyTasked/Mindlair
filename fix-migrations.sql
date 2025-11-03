-- Fix failed migrations by clearing the migration history
-- This allows Prisma to start fresh with the new initial migration

-- Delete all failed migration records
DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL OR migration_name LIKE '20251101%';

-- Drop all existing tables (if any exist from partial migrations)
DROP TABLE IF EXISTS "focus_sessions" CASCADE;
DROP TABLE IF EXISTS "meetings" CASCADE;
DROP TABLE IF EXISTS "daily_reflections" CASCADE;
DROP TABLE IF EXISTS "delivery_settings" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;
DROP TABLE IF EXISTS "calendar_accounts" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "system_logs" CASCADE;

