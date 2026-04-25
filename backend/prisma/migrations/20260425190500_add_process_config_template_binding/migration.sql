-- CreateEnum
CREATE TYPE "TemplateBusinessMode" AS ENUM ('COLLECTION_ONLY', 'APPROVAL_REQUIRED');

-- AlterTable
ALTER TABLE "FormTemplate" ADD COLUMN "businessMode" "TemplateBusinessMode" NOT NULL DEFAULT 'COLLECTION_ONLY',
ADD COLUMN "approvalProcessId" INTEGER;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN "defaultApproverId" INTEGER;

-- CreateIndex
CREATE INDEX "FormTemplate_businessMode_idx" ON "FormTemplate"("businessMode");

-- CreateIndex
CREATE INDEX "FormTemplate_approvalProcessId_idx" ON "FormTemplate"("approvalProcessId");

-- CreateIndex
CREATE INDEX "Department_defaultApproverId_idx" ON "Department"("defaultApproverId");

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_approvalProcessId_fkey" FOREIGN KEY ("approvalProcessId") REFERENCES "ApprovalProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_defaultApproverId_fkey" FOREIGN KEY ("defaultApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
