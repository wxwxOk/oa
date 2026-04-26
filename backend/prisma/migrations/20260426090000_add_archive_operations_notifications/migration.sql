-- CreateEnum
CREATE TYPE "ArchiveSourceType" AS ENUM ('APPROVAL', 'COLLECTION');

-- CreateEnum
CREATE TYPE "ArchiveEventType" AS ENUM ('TAGS_UPDATED', 'NOTE_ADDED', 'CONTROLLED_EDIT', 'PROCESSING_UPDATED');

-- CreateEnum
CREATE TYPE "UserNotificationType" AS ENUM ('NEW_TASK', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "FormTemplate" ADD COLUMN "processingSchema" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "ArchiveRecordMeta" (
    "id" SERIAL NOT NULL,
    "sourceType" "ArchiveSourceType" NOT NULL,
    "approvalApplicationId" INTEGER,
    "submissionId" INTEGER,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "processingData" JSONB NOT NULL DEFAULT '{}',
    "correctionData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchiveRecordMeta_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ArchiveRecordMeta_source_check" CHECK (
        ("sourceType" = 'APPROVAL' AND "approvalApplicationId" IS NOT NULL AND "submissionId" IS NULL)
        OR
        ("sourceType" = 'COLLECTION' AND "approvalApplicationId" IS NULL AND "submissionId" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "ArchiveEvent" (
    "id" SERIAL NOT NULL,
    "metadataId" INTEGER NOT NULL,
    "sourceType" "ArchiveSourceType" NOT NULL,
    "approvalApplicationId" INTEGER,
    "submissionId" INTEGER,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "type" "ArchiveEventType" NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchiveEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "UserNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "sourceType" "ArchiveSourceType",
    "approvalApplicationId" INTEGER,
    "approvalTaskId" INTEGER,
    "targetRoute" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArchiveRecordMeta_approvalApplicationId_key" ON "ArchiveRecordMeta"("approvalApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchiveRecordMeta_submissionId_key" ON "ArchiveRecordMeta"("submissionId");

-- CreateIndex
CREATE INDEX "ArchiveRecordMeta_sourceType_idx" ON "ArchiveRecordMeta"("sourceType");

-- CreateIndex
CREATE INDEX "ArchiveRecordMeta_sourceType_approvalApplicationId_idx" ON "ArchiveRecordMeta"("sourceType", "approvalApplicationId");

-- CreateIndex
CREATE INDEX "ArchiveRecordMeta_sourceType_submissionId_idx" ON "ArchiveRecordMeta"("sourceType", "submissionId");

-- CreateIndex
CREATE INDEX "ArchiveRecordMeta_updatedAt_idx" ON "ArchiveRecordMeta"("updatedAt");

-- CreateIndex
CREATE INDEX "ArchiveEvent_metadataId_createdAt_idx" ON "ArchiveEvent"("metadataId", "createdAt");

-- CreateIndex
CREATE INDEX "ArchiveEvent_sourceType_createdAt_idx" ON "ArchiveEvent"("sourceType", "createdAt");

-- CreateIndex
CREATE INDEX "ArchiveEvent_approvalApplicationId_createdAt_idx" ON "ArchiveEvent"("approvalApplicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ArchiveEvent_submissionId_createdAt_idx" ON "ArchiveEvent"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "ArchiveEvent_actorId_idx" ON "ArchiveEvent"("actorId");

-- CreateIndex
CREATE INDEX "ArchiveEvent_type_idx" ON "ArchiveEvent"("type");

-- CreateIndex
CREATE INDEX "UserNotification_userId_readAt_idx" ON "UserNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_approvalApplicationId_idx" ON "UserNotification"("approvalApplicationId");

-- CreateIndex
CREATE INDEX "UserNotification_approvalTaskId_idx" ON "UserNotification"("approvalTaskId");

-- AddForeignKey
ALTER TABLE "ArchiveRecordMeta" ADD CONSTRAINT "ArchiveRecordMeta_approvalApplicationId_fkey" FOREIGN KEY ("approvalApplicationId") REFERENCES "ApprovalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveRecordMeta" ADD CONSTRAINT "ArchiveRecordMeta_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveEvent" ADD CONSTRAINT "ArchiveEvent_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "ArchiveRecordMeta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveEvent" ADD CONSTRAINT "ArchiveEvent_approvalApplicationId_fkey" FOREIGN KEY ("approvalApplicationId") REFERENCES "ApprovalApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveEvent" ADD CONSTRAINT "ArchiveEvent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveEvent" ADD CONSTRAINT "ArchiveEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_approvalApplicationId_fkey" FOREIGN KEY ("approvalApplicationId") REFERENCES "ApprovalApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_approvalTaskId_fkey" FOREIGN KEY ("approvalTaskId") REFERENCES "ApprovalTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
