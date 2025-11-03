-- Delete existing user and all related data for clodel.remy@gmail.com
-- This will be cascaded to all related tables thanks to onDelete: Cascade

DELETE FROM users WHERE email = 'clodel.remy@gmail.com';

-- Next login will create a fresh user with all the new fields

