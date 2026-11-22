-- CreateEnum
CREATE TYPE "WalletEntryKind" AS ENUM ('DEPOSIT', 'TEACHER_PAYMENT', 'REVERSAL', 'WITHDRAWAL');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'WALLET';

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "payoutAccountName" TEXT,
ADD COLUMN     "payoutAccountNumber" TEXT,
ADD COLUMN     "payoutBank" TEXT,
ADD COLUMN     "payoutMethod" TEXT,
ADD COLUMN     "payoutPhone" TEXT;

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" SERIAL NOT NULL,
    "kind" "WalletEntryKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payoutId" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletEntry_payoutId_key" ON "WalletEntry"("payoutId");

-- CreateIndex
CREATE INDEX "WalletEntry_occurredAt_idx" ON "WalletEntry"("occurredAt");

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "TeacherPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

