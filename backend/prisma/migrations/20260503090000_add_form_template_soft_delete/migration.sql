-- AlterTable
ALTER TABLE "FormTemplate" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "FormTemplate_deletedAt_idx" ON "FormTemplate"("deletedAt");
