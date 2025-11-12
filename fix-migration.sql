-- This script marks the failed migration as resolved
-- Run this directly in Railway's PostgreSQL console

-- Check current migration status
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;

-- Mark the failed migration as rolled back so it can be re-applied
UPDATE "_prisma_migrations" 
SET rolled_back_at = NOW()
WHERE migration_name = '20251112192100_drop_old_calendar_unique'
AND finished_at IS NULL;

-- Verify it's marked
SELECT * FROM "_prisma_migrations" 
WHERE migration_name = '20251112192100_drop_old_calendar_unique';

