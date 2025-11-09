-- Cue Companion tables for Level 1 (contextual nudges)

-- CueSettings: per-user configuration
CREATE TABLE IF NOT EXISTS "cue_settings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "tone" TEXT NOT NULL DEFAULT 'calm' CHECK ("tone" IN ('calm', 'direct')),
  "toastEnabled" BOOLEAN NOT NULL DEFAULT true,
  "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
  "quietHours" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "cueFrequency" TEXT NOT NULL DEFAULT 'balanced' CHECK ("cueFrequency" IN ('minimal', 'balanced', 'frequent')),
  "perMeetingOverrides" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "lowEnergyStart" TIME NOT NULL DEFAULT '14:00',
  "lowEnergyEnd" TIME NOT NULL DEFAULT '16:00',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("userId")
);

CREATE INDEX IF NOT EXISTS "cue_settings_userId_idx" ON "cue_settings"("userId");

-- CueTelemetry: track user interactions with cues
CREATE TABLE IF NOT EXISTS "cue_telemetry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "cueId" TEXT NOT NULL,
  "meetingId" TEXT REFERENCES "meetings"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL CHECK ("action" IN ('clicked', 'dismissed', 'ignored')),
  "actionType" TEXT,
  "timestamp" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "cue_telemetry_userId_timestamp_idx" ON "cue_telemetry"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "cue_telemetry_cueId_idx" ON "cue_telemetry"("cueId");

-- MeetingMoods: optional pre-meeting mood signal
CREATE TABLE IF NOT EXISTS "meeting_moods" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "meetingId" TEXT NOT NULL REFERENCES "meetings"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "value" SMALLINT NOT NULL CHECK ("value" IN (-1, 0, 1)),
  "timestamp" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("meetingId", "userId")
);

CREATE INDEX IF NOT EXISTS "meeting_moods_userId_idx" ON "meeting_moods"("userId");
CREATE INDEX IF NOT EXISTS "meeting_moods_meetingId_idx" ON "meeting_moods"("meetingId");

