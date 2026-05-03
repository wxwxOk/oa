-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('DRAFT', 'DEPARTMENT_REVIEW', 'FINANCE_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReimbursementActionType" AS ENUM ('SUBMIT', 'DEPARTMENT_APPROVE', 'DEPARTMENT_REJECT', 'FINANCE_APPROVE', 'FINANCE_REJECT');

-- CreateTable
CREATE TABLE "ReimbursementApplication" (
    "id" SERIAL NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "payeeInfo" TEXT,
    "remark" TEXT,
    "status" "ReimbursementStatus" NOT NULL DEFAULT 'DRAFT',
    "applicantId" INTEGER NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantDepartmentId" INTEGER,
    "applicantDepartmentName" TEXT,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReimbursementApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReimbursementAttachment" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReimbursementAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReimbursementAction" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "actorName" TEXT NOT NULL,
    "type" "ReimbursementActionType" NOT NULL,
    "nodeName" TEXT,
    "comment" TEXT,
    "signatureRelativePath" TEXT,
    "signatureMimeType" TEXT,
    "signatureSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReimbursementAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReimbursementApplication_applicationNo_key" ON "ReimbursementApplication"("applicationNo");

-- CreateIndex
CREATE INDEX "ReimbursementApplication_applicantId_idx" ON "ReimbursementApplication"("applicantId");

-- CreateIndex
CREATE INDEX "ReimbursementApplication_applicantDepartmentId_idx" ON "ReimbursementApplication"("applicantDepartmentId");

-- CreateIndex
CREATE INDEX "ReimbursementApplication_status_idx" ON "ReimbursementApplication"("status");

-- CreateIndex
CREATE INDEX "ReimbursementApplication_category_idx" ON "ReimbursementApplication"("category");

-- CreateIndex
CREATE INDEX "ReimbursementApplication_occurredAt_idx" ON "ReimbursementApplication"("occurredAt");

-- CreateIndex
CREATE INDEX "ReimbursementApplication_createdAt_idx" ON "ReimbursementApplication"("createdAt");

-- CreateIndex
CREATE INDEX "ReimbursementAttachment_applicationId_idx" ON "ReimbursementAttachment"("applicationId");

-- CreateIndex
CREATE INDEX "ReimbursementAttachment_uploaderId_idx" ON "ReimbursementAttachment"("uploaderId");

-- CreateIndex
CREATE INDEX "ReimbursementAction_applicationId_idx" ON "ReimbursementAction"("applicationId");

-- CreateIndex
CREATE INDEX "ReimbursementAction_actorId_idx" ON "ReimbursementAction"("actorId");

-- CreateIndex
CREATE INDEX "ReimbursementAction_type_idx" ON "ReimbursementAction"("type");

-- CreateIndex
CREATE INDEX "ReimbursementAction_createdAt_idx" ON "ReimbursementAction"("createdAt");

-- AddForeignKey
ALTER TABLE "ReimbursementApplication" ADD CONSTRAINT "ReimbursementApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementApplication" ADD CONSTRAINT "ReimbursementApplication_applicantDepartmentId_fkey" FOREIGN KEY ("applicantDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementAttachment" ADD CONSTRAINT "ReimbursementAttachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ReimbursementApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementAttachment" ADD CONSTRAINT "ReimbursementAttachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementAction" ADD CONSTRAINT "ReimbursementAction_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ReimbursementApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementAction" ADD CONSTRAINT "ReimbursementAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
