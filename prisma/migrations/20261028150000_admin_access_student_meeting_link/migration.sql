-- Teachers can also hold administrator access.
ALTER TABLE "User" ADD COLUMN "adminAccess" BOOLEAN NOT NULL DEFAULT false;

-- One online-class link per student (shared by all their subjects and teachers).
ALTER TABLE "Student" ADD COLUMN "meetingUrl" TEXT;

-- Carry over existing per-enrollment links: each student keeps their earliest one.
UPDATE "Student" s
SET "meetingUrl" = e."meetingUrl"
FROM (
  SELECT DISTINCT ON ("studentId") "studentId", "meetingUrl"
  FROM "Enrollment"
  WHERE "meetingUrl" IS NOT NULL
  ORDER BY "studentId", "createdAt"
) e
WHERE e."studentId" = s."id";

ALTER TABLE "Enrollment" DROP COLUMN "meetingUrl";
