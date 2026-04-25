-- CreateEnum
CREATE TYPE "ApprovalApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVING', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ApprovalTaskStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApprovalActionType" AS ENUM ('SUBMIT', 'ASSIGN', 'APPROVE', 'REJECT', 'CANCEL', 'EDIT', 'MARK', 'COMMENT');

-- CreateEnum
CREATE TYPE "ApprovalApproverSourceType" AS ENUM ('USER', 'ROLE', 'DEPARTMENT_MANAGER');

-- CreateTable
CREATE TABLE "ApprovalProcess" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creatorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalProcessNode" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "approverSourceType" "ApprovalApproverSourceType" NOT NULL,
    "approverUserId" INTEGER,
    "approverRoleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalProcessNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalApplication" (
    "id" SERIAL NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "status" "ApprovalApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "formData" JSONB NOT NULL DEFAULT '{}',
    "schemaSnapshot" JSONB NOT NULL,
    "processSnapshot" JSONB NOT NULL,
    "templateId" INTEGER NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "processId" INTEGER,
    "processName" TEXT,
    "applicantId" INTEGER NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantDepartmentId" INTEGER,
    "applicantDepartmentName" TEXT,
    "currentNodeOrder" INTEGER,
    "currentNodeName" TEXT,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalTask" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "nodeOrder" INTEGER NOT NULL,
    "nodeName" TEXT NOT NULL,
    "status" "ApprovalTaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigneeId" INTEGER NOT NULL,
    "assigneeName" TEXT NOT NULL,
    "approverSourceSnapshot" JSONB NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAction" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "nodeOrder" INTEGER,
    "nodeName" TEXT,
    "type" "ApprovalActionType" NOT NULL,
    "comment" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalTimelineEvent" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "nodeOrder" INTEGER,
    "nodeName" TEXT,
    "type" "ApprovalActionType" NOT NULL,
    "title" TEXT NOT NULL,
    "comment" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalProcess_creatorId_idx" ON "ApprovalProcess"("creatorId");

-- CreateIndex
CREATE INDEX "ApprovalProcess_isActive_idx" ON "ApprovalProcess"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalProcessNode_processId_order_key" ON "ApprovalProcessNode"("processId", "order");

-- CreateIndex
CREATE INDEX "ApprovalProcessNode_approverUserId_idx" ON "ApprovalProcessNode"("approverUserId");

-- CreateIndex
CREATE INDEX "ApprovalProcessNode_approverRoleId_idx" ON "ApprovalProcessNode"("approverRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalApplication_applicationNo_key" ON "ApprovalApplication"("applicationNo");

-- CreateIndex
CREATE INDEX "ApprovalApplication_templateId_idx" ON "ApprovalApplication"("templateId");

-- CreateIndex
CREATE INDEX "ApprovalApplication_processId_idx" ON "ApprovalApplication"("processId");

-- CreateIndex
CREATE INDEX "ApprovalApplication_applicantId_idx" ON "ApprovalApplication"("applicantId");

-- CreateIndex
CREATE INDEX "ApprovalApplication_applicantDepartmentId_idx" ON "ApprovalApplication"("applicantDepartmentId");

-- CreateIndex
CREATE INDEX "ApprovalApplication_status_idx" ON "ApprovalApplication"("status");

-- CreateIndex
CREATE INDEX "ApprovalApplication_createdAt_idx" ON "ApprovalApplication"("createdAt");

-- CreateIndex
CREATE INDEX "ApprovalApplication_currentNodeOrder_idx" ON "ApprovalApplication"("currentNodeOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalTask_applicationId_nodeOrder_assigneeId_key" ON "ApprovalTask"("applicationId", "nodeOrder", "assigneeId");

-- CreateIndex
CREATE INDEX "ApprovalTask_applicationId_idx" ON "ApprovalTask"("applicationId");

-- CreateIndex
CREATE INDEX "ApprovalTask_assigneeId_status_idx" ON "ApprovalTask"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "ApprovalTask_status_idx" ON "ApprovalTask"("status");

-- CreateIndex
CREATE INDEX "ApprovalAction_applicationId_createdAt_idx" ON "ApprovalAction"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalAction_taskId_idx" ON "ApprovalAction"("taskId");

-- CreateIndex
CREATE INDEX "ApprovalAction_actorId_idx" ON "ApprovalAction"("actorId");

-- CreateIndex
CREATE INDEX "ApprovalAction_type_idx" ON "ApprovalAction"("type");

-- CreateIndex
CREATE INDEX "ApprovalTimelineEvent_applicationId_createdAt_idx" ON "ApprovalTimelineEvent"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalTimelineEvent_taskId_idx" ON "ApprovalTimelineEvent"("taskId");

-- CreateIndex
CREATE INDEX "ApprovalTimelineEvent_actorId_idx" ON "ApprovalTimelineEvent"("actorId");

-- CreateIndex
CREATE INDEX "ApprovalTimelineEvent_type_idx" ON "ApprovalTimelineEvent"("type");

-- AddForeignKey
ALTER TABLE "ApprovalProcess" ADD CONSTRAINT "ApprovalProcess_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalProcessNode" ADD CONSTRAINT "ApprovalProcessNode_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ApprovalProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalProcessNode" ADD CONSTRAINT "ApprovalProcessNode_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalProcessNode" ADD CONSTRAINT "ApprovalProcessNode_approverRoleId_fkey" FOREIGN KEY ("approverRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalApplication" ADD CONSTRAINT "ApprovalApplication_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalApplication" ADD CONSTRAINT "ApprovalApplication_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ApprovalProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalApplication" ADD CONSTRAINT "ApprovalApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalApplication" ADD CONSTRAINT "ApprovalApplication_applicantDepartmentId_fkey" FOREIGN KEY ("applicantDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ApprovalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ApprovalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ApprovalTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTimelineEvent" ADD CONSTRAINT "ApprovalTimelineEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ApprovalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTimelineEvent" ADD CONSTRAINT "ApprovalTimelineEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ApprovalTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTimelineEvent" ADD CONSTRAINT "ApprovalTimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
