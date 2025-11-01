-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN "enablePresleyFlow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "presleyFlowTime" TEXT NOT NULL DEFAULT '20:00',
ADD COLUMN "enableMorningRecap" BOOLEAN NOT NULL DEFAULT true;

