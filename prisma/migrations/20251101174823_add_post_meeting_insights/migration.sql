-- AlterTable
ALTER TABLE "meetings" ADD COLUMN "postMeetingEmailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "postMeetingEmailSentAt" TIMESTAMP(3),
ADD COLUMN "meetingRating" INTEGER,
ADD COLUMN "meetingFeedback" TEXT,
ADD COLUMN "ratedAt" TIMESTAMP(3);

