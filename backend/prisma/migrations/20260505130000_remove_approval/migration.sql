-- Remove approval module: drop tables, columns, enums and permissions.
-- Order: drop FKs first → drop columns → drop tables → narrow enums.

-- 1) Clean role-permission and permission rows for approval:* and form:link-stats:view
DELETE FROM "RolePermission"
USING "Permission"
WHERE "RolePermission"."permissionId" = "Permission"."id"
  AND ("Permission"."code" LIKE 'approval:%' OR "Permission"."code" = 'form:link-stats:view');

DELETE FROM "Permission"
WHERE "code" LIKE 'approval:%' OR "code" = 'form:link-stats:view';

-- 2) Drop FormTemplate FK + column to ApprovalProcess BEFORE dropping ApprovalProcess.
-- But first: freeze any approval-mode template that was still PUBLISHED, so its old
-- share links do not become publicly usable once businessMode disappears. Wrapped in
-- a DO block to stay idempotent if the column was already dropped by a partial run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'FormTemplate' AND column_name = 'businessMode'
  ) THEN
    EXECUTE $q$
      UPDATE "FormTemplate"
      SET "status" = 'OFFLINE'
      WHERE "businessMode" = 'APPROVAL_REQUIRED'
        AND "status" = 'PUBLISHED'
    $q$;
  END IF;
END
$$;

ALTER TABLE "FormTemplate" DROP CONSTRAINT IF EXISTS "FormTemplate_approvalProcessId_fkey";
DROP INDEX IF EXISTS "FormTemplate_businessMode_idx";
DROP INDEX IF EXISTS "FormTemplate_approvalProcessId_idx";
ALTER TABLE "FormTemplate" DROP COLUMN IF EXISTS "businessMode";
ALTER TABLE "FormTemplate" DROP COLUMN IF EXISTS "approvalProcessId";

-- 3) Strip approval references from archive tables before approval tables drop
ALTER TABLE "ArchiveEvent" DROP CONSTRAINT IF EXISTS "ArchiveEvent_approvalApplicationId_fkey";
DROP INDEX IF EXISTS "ArchiveEvent_approvalApplicationId_createdAt_idx";
ALTER TABLE "ArchiveEvent" DROP COLUMN IF EXISTS "approvalApplicationId";

ALTER TABLE "ArchiveRecordMeta" DROP CONSTRAINT IF EXISTS "ArchiveRecordMeta_approvalApplicationId_fkey";
DROP INDEX IF EXISTS "ArchiveRecordMeta_approvalApplicationId_key";
DROP INDEX IF EXISTS "ArchiveRecordMeta_sourceType_approvalApplicationId_idx";
ALTER TABLE "ArchiveRecordMeta" DROP COLUMN IF EXISTS "approvalApplicationId";

-- Purge orphan archive rows that originated from approval applications
DELETE FROM "ArchiveEvent" WHERE "sourceType" = 'APPROVAL';
DELETE FROM "ArchiveRecordMeta" WHERE "sourceType" = 'APPROVAL';

-- 4) Drop notification + approval tables (cascade for any leftover dependents)
DROP TABLE IF EXISTS "UserNotification" CASCADE;
DROP TABLE IF EXISTS "ApprovalTimelineEvent" CASCADE;
DROP TABLE IF EXISTS "ApprovalAction" CASCADE;
DROP TABLE IF EXISTS "ApprovalTask" CASCADE;
DROP TABLE IF EXISTS "ApprovalApplication" CASCADE;
DROP TABLE IF EXISTS "ApprovalProcessNode" CASCADE;
DROP TABLE IF EXISTS "ApprovalProcess" CASCADE;

-- 5) Narrow ArchiveSourceType enum down to COLLECTION only
ALTER TYPE "ArchiveSourceType" RENAME TO "ArchiveSourceType_old";
CREATE TYPE "ArchiveSourceType" AS ENUM ('COLLECTION');

ALTER TABLE "ArchiveRecordMeta"
  ALTER COLUMN "sourceType" TYPE "ArchiveSourceType"
  USING "sourceType"::text::"ArchiveSourceType";

ALTER TABLE "ArchiveEvent"
  ALTER COLUMN "sourceType" TYPE "ArchiveSourceType"
  USING "sourceType"::text::"ArchiveSourceType";

DROP TYPE "ArchiveSourceType_old";

-- 6) Drop now-unused approval-only enums
DROP TYPE IF EXISTS "ApprovalApplicationStatus";
DROP TYPE IF EXISTS "ApprovalTaskStatus";
DROP TYPE IF EXISTS "ApprovalActionType";
DROP TYPE IF EXISTS "ApprovalApproverSourceType";
DROP TYPE IF EXISTS "UserNotificationType";
DROP TYPE IF EXISTS "TemplateBusinessMode";
