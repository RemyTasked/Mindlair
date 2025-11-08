-- Reset onboarding for all existing users so they go through the new Presley Flow onboarding
UPDATE "users" SET "onboardingCompleted" = false WHERE "onboardingCompleted" = true;

