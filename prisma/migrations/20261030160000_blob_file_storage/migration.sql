-- Large files live in private Vercel Blob storage; small files and existing uploads stay in the database.
-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN     "blobPathname" TEXT,
ADD COLUMN     "storage" TEXT NOT NULL DEFAULT 'db';

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_blobPathname_key" ON "StoredFile"("blobPathname");

