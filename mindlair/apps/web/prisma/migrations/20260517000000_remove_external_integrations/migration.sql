-- Remove external integrations
-- This migration removes data from deprecated integration methods
-- (Readwise, Instapaper, Spotify, Google Takeout, RSS)

-- First, delete Source rows associated with external integrations
-- Note: These sources never had claims extracted, so no cascading deletions
DELETE FROM "sources"
WHERE "surface" IN (
  'readwise_import',
  'instapaper_import',
  'spotify_import',
  'google_takeout_youtube',
  'google_takeout_chrome',
  'rss_feed'
);

-- Drop the connected_sources table (OAuth tokens for Readwise/Instapaper/Spotify)
DROP TABLE IF EXISTS "connected_sources";

-- Drop the rss_feeds table (unused RSS feed tracking)
DROP TABLE IF EXISTS "rss_feeds";
