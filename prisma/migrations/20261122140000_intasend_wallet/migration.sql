-- CreateEnum
CREATE TYPE "WalletEntryStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "payoutBankCode" TEXT;

-- AlterTable
ALTER TABLE "WalletEntry" ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerRef" TEXT,
ADD COLUMN     "status" "WalletEntryStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateIndex
CREATE INDEX "WalletEntry_status_idx" ON "WalletEntry"("status");

-- CreateIndex
CREATE INDEX "WalletEntry_providerRef_idx" ON "WalletEntry"("providerRef");

