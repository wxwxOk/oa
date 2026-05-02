-- CreateTable
CREATE TABLE "VisitRecord" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "education" TEXT,
    "gender" TEXT,
    "channelPartner" TEXT,
    "consultant" TEXT,
    "receptionStatus" TEXT,
    "receptionist" TEXT,
    "receptionDate" TIMESTAMP(3),
    "consultationStatus" TEXT,
    "statusCategory" TEXT,
    "statusDescription" TEXT,
    "trialStatus" TEXT,
    "solution" TEXT,
    "trialDate" TIMESTAMP(3),
    "creatorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitRecord_name_idx" ON "VisitRecord"("name");

-- CreateIndex
CREATE INDEX "VisitRecord_channelPartner_idx" ON "VisitRecord"("channelPartner");

-- CreateIndex
CREATE INDEX "VisitRecord_consultant_idx" ON "VisitRecord"("consultant");

-- CreateIndex
CREATE INDEX "VisitRecord_receptionist_idx" ON "VisitRecord"("receptionist");

-- CreateIndex
CREATE INDEX "VisitRecord_receptionStatus_idx" ON "VisitRecord"("receptionStatus");

-- CreateIndex
CREATE INDEX "VisitRecord_receptionDate_idx" ON "VisitRecord"("receptionDate");

-- CreateIndex
CREATE INDEX "VisitRecord_consultationStatus_idx" ON "VisitRecord"("consultationStatus");

-- CreateIndex
CREATE INDEX "VisitRecord_statusCategory_idx" ON "VisitRecord"("statusCategory");

-- CreateIndex
CREATE INDEX "VisitRecord_creatorId_idx" ON "VisitRecord"("creatorId");

-- AddForeignKey
ALTER TABLE "VisitRecord" ADD CONSTRAINT "VisitRecord_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
