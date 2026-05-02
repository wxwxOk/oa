---
phase: 16-process-config-template-binding
plan: 02
subsystem: database
tags: [prisma, postgres, approval, template-binding, department-approver]
requires:
  - phase: 15-approval-data-model-state-machine
    provides: Approval process and application Prisma models used by template binding
  - phase: 16-process-config-template-binding
    provides: Wave 0 backend contract tests for template approval mode and department approvers
provides:
  - TemplateBusinessMode enum with collection-only default semantics
  - Optional FormTemplate approval process binding
  - Optional Department default approver relation
  - add_process_config_template_binding Prisma migration SQL
affects: [phase-16-plan-03, phase-16-plan-04, phase-16-plan-05, phase-17]
tech-stack:
  added: []
  patterns: [manual-prisma-migration-sql, nullable-fk-on-delete-set-null, prisma-generate-gate]
key-files:
  created:
    - backend/prisma/migrations/20260425190500_add_process_config_template_binding/migration.sql
  modified:
    - backend/prisma/schema.prisma
key-decisions:
  - "Existing templates default to COLLECTION_ONLY through FormTemplate.businessMode so public collection semantics remain unchanged."
  - "Template process binding and department default approver use nullable foreign keys with ON DELETE SET NULL."
  - "The local host-side DATABASE_URL override is required in this worktree because no .env file is present."
patterns-established:
  - "Phase 16 schema migrations keep approval binding optional until backend publish/submit validation enforces required process rules."
  - "Generated Prisma client and backend build are verified as a separate blocking gate after schema migration SQL exists."
requirements-completed: [CFG-01, CFG-04, DYN-02]
duration: 7 min
completed: 2026-04-25
---

# Phase 16 Plan 02: Process Config Template Binding Schema Summary

**Prisma schema and migration for template approval mode, reusable process binding, and department default approvers**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-25T11:05:21Z
- **Completed:** 2026-04-25T11:11:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `TemplateBusinessMode` with `COLLECTION_ONLY` and `APPROVAL_REQUIRED`.
- Added `FormTemplate.businessMode`, optional `approvalProcessId`, `approvalProcess`, and `ApprovalProcess.boundTemplates`.
- Added `Department.defaultApproverId`, `Department.defaultApprover`, and `User.defaultApproverDepartments`.
- Added migration SQL for the enum, columns, indexes, and `ON DELETE SET NULL` foreign keys.
- Applied the migration against local PostgreSQL, regenerated Prisma Client, and verified the backend build.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add template mode and department approver schema** - `e017bae` (feat)
2. **Task 2: Apply migration and generate Prisma client** - `aa685bb` (chore, empty tracking commit because generated/build artifacts are ignored)

## Files Created/Modified

- `backend/prisma/schema.prisma` - Added template business mode, process binding, department default approver, inverse relations, and indexes.
- `backend/prisma/migrations/20260425190500_add_process_config_template_binding/migration.sql` - Adds `TemplateBusinessMode`, `FormTemplate.businessMode`, `FormTemplate.approvalProcessId`, `Department.defaultApproverId`, indexes, and foreign keys.

## Decisions Made

- Kept `TemplateStatus` unchanged; business mode is independent and defaults existing templates to `COLLECTION_ONLY`.
- Kept both new relations nullable so existing templates and departments migrate without backfill.
- Used the documented `127.0.0.1` PostgreSQL override for migration/generate because this isolated worktree has no `.env`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed backend dependencies from the existing lockfile**
- **Found during:** Task 1 verification
- **Issue:** `bun --env-file=../.env prisma ...` initially failed with `Script not found "prisma"` because `backend/node_modules` only contained Bun cache data and no local Prisma binary.
- **Fix:** Ran `bun install --frozen-lockfile` in `backend` to install versions already pinned in `backend/bun.lock`.
- **Files modified:** None tracked; generated dependencies are ignored.
- **Verification:** Subsequent Prisma 5.22.0 `format`, `validate`, `migrate dev`, and `generate` commands ran successfully.
- **Committed in:** No tracked file changes; Task 2 recorded the execution gate in `aa685bb`.

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** No schema or migration scope change; the install only restored the local toolchain required by the plan.

## Issues Encountered

- The semantic code search MCP failed to index this worktree, so execution used mandated file reads and exact identifier checks.
- The exact first migration attempt `bun --env-file=../.env prisma migrate dev --name add_process_config_template_binding` failed with `P1012 Environment variable not found: DATABASE_URL` because this assigned worktree has no `.env`.
- Resolution: used the Phase 15 local host override (`127.0.0.1:5432`) and the migration applied successfully. No destructive reset or interactive prompt occurred.
- A trial `bunx prisma format` before dependency install resolved Prisma 7.8.0 and failed due Prisma 7 datasource config rules; no tracked files changed. The successful verification used the repository-pinned Prisma 5.22.0 binary.

## Verification

- `git merge-base HEAD 269f613fcf28f417a328aa49b9f52f3162cac5f5` - passed at executor start.
- `cd backend; bun --env-file=../.env prisma format` - passed after dependency install.
- `cd backend; $env:DATABASE_URL='postgresql://oa:***@127.0.0.1:5432/oa_db?schema=public'; bun --env-file=../.env prisma validate` - passed.
- `cd backend; bun --env-file=../.env prisma migrate dev --name add_process_config_template_binding` - failed as expected without `.env`: `P1012 Environment variable not found: DATABASE_URL`.
- `cd backend; $env:DATABASE_URL='postgresql://oa:***@127.0.0.1:5432/oa_db?schema=public'; bun --env-file=../.env prisma migrate dev --name add_process_config_template_binding` - passed; applied `20260425190500_add_process_config_template_binding`.
- `cd backend; $env:DATABASE_URL='postgresql://oa:***@127.0.0.1:5432/oa_db?schema=public'; bun --env-file=../.env prisma generate` - passed.
- `cd backend; bun run build` - passed.
- Task acceptance string checks for `TemplateBusinessMode`, `FormTemplate_businessMode_idx`, and `Department_defaultApproverId_idx` - passed.
- Stub scan for `TODO`, `FIXME`, `placeholder`, `coming soon`, `not available`, and hardcoded empty UI values in changed files - no matches.

## User Setup Required

None for this plan. The local database migration is applied in the executor environment. Future host-side Prisma CLI work in this worktree needs a `DATABASE_URL` override or a root `.env`.

## Known Stubs

None.

## Authentication Gates

None.

## Next Phase Readiness

Ready for Phase 16 Plan 03. Prisma Client generation and backend build are current against the template binding and department default approver schema.

## Self-Check: PASSED

- Confirmed created/modified files exist on disk.
- Confirmed task commits `e017bae` and `aa685bb` exist in git history.
- Confirmed `.planning/STATE.md` and `.planning/ROADMAP.md` were not modified.

---
*Phase: 16-process-config-template-binding*
*Completed: 2026-04-25*
