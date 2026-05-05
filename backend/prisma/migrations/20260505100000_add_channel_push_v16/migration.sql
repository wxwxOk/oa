-- CreateEnum
CREATE TYPE "ChannelPushStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChannelPushReviewActionType" AS ENUM ('SUBMIT', 'EDIT', 'CANCEL', 'APPROVE', 'REJECT');

-- CreateTable
CREATE TABLE "ChannelPush" (
    "id" SERIAL NOT NULL,
    "channelPartnerId" INTEGER NOT NULL,
    "recipientUserId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentPhone" TEXT NOT NULL,
    "studentAge" INTEGER,
    "studentEducation" TEXT,
    "studentGender" TEXT,
    "intentStatus" TEXT,
    "intentNote" TEXT,
    "remark" TEXT,
    "status" "ChannelPushStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEditedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "internalScheduledReceiverId" INTEGER,
    "internalScheduledDate" TIMESTAMP(3),
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelPush_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelPushAttachment" (
    "id" SERIAL NOT NULL,
    "channelPushId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelPushAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelPushReviewAction" (
    "id" SERIAL NOT NULL,
    "channelPushId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "actorName" TEXT NOT NULL,
    "type" "ChannelPushReviewActionType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelPushReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelPartnerProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "primaryRecipientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelPartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelPush_channelPartnerId_status_idx" ON "ChannelPush"("channelPartnerId", "status");

-- CreateIndex
CREATE INDEX "ChannelPush_recipientUserId_status_idx" ON "ChannelPush"("recipientUserId", "status");

-- CreateIndex
CREATE INDEX "ChannelPush_studentName_studentPhone_idx" ON "ChannelPush"("studentName", "studentPhone");

-- CreateIndex
CREATE INDEX "ChannelPush_status_idx" ON "ChannelPush"("status");

-- CreateIndex
CREATE INDEX "ChannelPush_submittedAt_idx" ON "ChannelPush"("submittedAt");

-- CreateIndex
CREATE INDEX "ChannelPushAttachment_channelPushId_idx" ON "ChannelPushAttachment"("channelPushId");

-- CreateIndex
CREATE INDEX "ChannelPushAttachment_uploaderId_idx" ON "ChannelPushAttachment"("uploaderId");

-- CreateIndex
CREATE INDEX "ChannelPushReviewAction_channelPushId_idx" ON "ChannelPushReviewAction"("channelPushId");

-- CreateIndex
CREATE INDEX "ChannelPushReviewAction_actorId_idx" ON "ChannelPushReviewAction"("actorId");

-- CreateIndex
CREATE INDEX "ChannelPushReviewAction_type_idx" ON "ChannelPushReviewAction"("type");

-- CreateIndex
CREATE INDEX "ChannelPushReviewAction_createdAt_idx" ON "ChannelPushReviewAction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelPartnerProfile_userId_key" ON "ChannelPartnerProfile"("userId");

-- CreateIndex
CREATE INDEX "ChannelPartnerProfile_primaryRecipientId_idx" ON "ChannelPartnerProfile"("primaryRecipientId");

-- AddForeignKey
ALTER TABLE "ChannelPush" ADD CONSTRAINT "ChannelPush_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPush" ADD CONSTRAINT "ChannelPush_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPush" ADD CONSTRAINT "ChannelPush_internalScheduledReceiverId_fkey" FOREIGN KEY ("internalScheduledReceiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPushAttachment" ADD CONSTRAINT "ChannelPushAttachment_channelPushId_fkey" FOREIGN KEY ("channelPushId") REFERENCES "ChannelPush"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPushAttachment" ADD CONSTRAINT "ChannelPushAttachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPushReviewAction" ADD CONSTRAINT "ChannelPushReviewAction_channelPushId_fkey" FOREIGN KEY ("channelPushId") REFERENCES "ChannelPush"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPushReviewAction" ADD CONSTRAINT "ChannelPushReviewAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPartnerProfile" ADD CONSTRAINT "ChannelPartnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPartnerProfile" ADD CONSTRAINT "ChannelPartnerProfile_primaryRecipientId_fkey" FOREIGN KEY ("primaryRecipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
