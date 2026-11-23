-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('ONLINE', 'IN_PERSON');

-- AlterTable
ALTER TABLE "SessionInstance" ADD COLUMN     "mode" "SessionMode" NOT NULL DEFAULT 'ONLINE';

-- AlterTable
ALTER TABLE "SessionSlot" ADD COLUMN     "mode" "SessionMode" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "room" TEXT;

