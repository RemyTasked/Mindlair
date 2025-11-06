-- AlterTable
ALTER TABLE "meetings" ADD COLUMN "reflectionRating" TEXT,
ADD COLUMN "reflectionOneWord" TEXT,
ADD COLUMN "reflectionEmotionalTone" TEXT,
ADD COLUMN "reflectionCapturedAt" TIMESTAMP(3),
ADD COLUMN "reflectionNotes" TEXT;

