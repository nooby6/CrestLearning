-- Teacher payments: how and by whom a payout was confirmed; allow more than one payout per period.
-- DropIndex
DROP INDEX "TeacherPayout_teacherId_periodStart_periodEnd_key";

-- AlterTable
ALTER TABLE "TeacherPayout" ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "method" "PaymentProvider",
ADD COLUMN     "note" TEXT;

-- CreateIndex
CREATE INDEX "TeacherPayout_teacherId_periodStart_idx" ON "TeacherPayout"("teacherId", "periodStart");

-- AddForeignKey
ALTER TABLE "TeacherPayout" ADD CONSTRAINT "TeacherPayout_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

