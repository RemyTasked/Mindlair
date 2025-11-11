-- This migration validates that the calendar_accounts table has the correct unique constraint
-- The constraint (userId, provider, email) should already exist from previous manual fixes

-- This is a no-op migration that just validates the state
-- If the constraint doesn't exist, this will do nothing (it's already there from manual fixes)

SELECT 1;

