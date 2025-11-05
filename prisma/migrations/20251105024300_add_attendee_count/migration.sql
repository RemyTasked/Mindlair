-- AlterTable: Add attendeeCount field to meetings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meetings' AND column_name = 'attendeeCount'
  ) THEN
    ALTER TABLE "meetings" ADD COLUMN "attendeeCount" INTEGER NOT NULL DEFAULT 0;
    
    -- Backfill existing meetings with attendee count
    UPDATE "meetings" 
    SET "attendeeCount" = COALESCE(array_length("attendees", 1), 0);
  END IF;
END $$;

