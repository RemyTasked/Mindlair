-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN "enableReflections" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "privateReflectionMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reflectionDataSharing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "storeReflectionText" BOOLEAN NOT NULL DEFAULT true;

