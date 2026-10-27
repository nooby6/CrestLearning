-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "weekStart" DATE NOT NULL,
    "authorId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT,
    "nextSteps" TEXT,
    "effort" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyReport_weekStart_idx" ON "WeeklyReport"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_enrollmentId_weekStart_key" ON "WeeklyReport"("enrollmentId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
