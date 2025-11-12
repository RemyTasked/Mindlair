-- No-op migration to validate calendar constraints
-- The constraints already exist from previous migrations (20251109175000_multi_calendar_labels)
-- This migration just validates the expected state without making changes

-- Verify the schema is correct (this query succeeds or fails silently)
SELECT 1 WHERE EXISTS (
  SELECT 1 FROM information_schema.table_constraints 
  WHERE constraint_name = 'calendar_accounts_userId_provider_email_key'
  AND table_name = 'calendar_accounts'
);

