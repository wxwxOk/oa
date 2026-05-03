---
phase: 24-api
plan: 2
subsystem: database
tags: [bun, prisma, postgres, rbac, reimbursement, uploads]

requires:
  - phase: 24-api plan 1
    provides: Wave 0 reimbursement schema, seed, route and file-safety contracts
  - phase: 23-stats
    provides: shipped fixed-module backend patterns
  - phase: 19-post-collection-processing-archive-export-stats
    provides: RBAC, audit-trail and export permission conventions
provides:
  - Reimbursement Prisma enums, application, attachment and action models
  - PostgreSQL migration for reimbursement tables, indexes and foreign keys
  - Reimbursement permission seed constants, rows and EMPLOYEE default grants
  - Local upload storage baseline through Git ignore and Docker volume/env config
affects: [24-api, 25-reimbursement-ui, 26-reimbursement-review, 27-reimbursement-export]

tech-stack:
  added: []
  patterns:
    - Fixed business-module Prisma model with explicit columns instead of JSON payload reuse
    - RBAC seed constants reused by backend tests and future frontend gates
    - Local file storage rooted by REIMBURSEMENT_UPLOAD_DIR and persisted by Docker volume

key-files:
  created:
    - backend/prisma/migrations/20260503013000_add_reimbursements/migration.sql
  modified:
    - backend/prisma/schema.prisma
    - backend/prisma/seed.ts
    - .gitignore
    - docker-compose.yml

key-decisions:
  - "Reimbursement data uses dedicated Prisma models and enums, not ApprovalApplication or form JSON reuse."
  - "Amount uses Decimal(12,2), status/action values are fixed enums, and common list filters have explicit indexes."
  - "EMPLOYEE receives only create, own and attachment reimbursement permissions by default; list/review/export remain elevated."
  - "Upload storage stays local for Phase 24, with only relative paths stored in database records."

patterns-established:
  - "Permission codes are exported from seed.ts as the single source for seed tests and later UI permission checks."
  - "Reimbursement attachments/actions cascade from the application while preserving uploader/actor audit metadata."

requirements-completed: [REIM-01, REIM-02, INV-01, INV-02, INV-04, PERM-01, PERM-02, PERM-03, NFR-01, NFR-02]

duration: 25min
completed: 2026-05-03
---

# Phase 24 Plan 2: Schema, Seed and Upload Storage Summary

**Dedicated reimbursement Prisma schema with RBAC seed data and durable local attachment storage baseline.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-03T01:59:17Z
- **Completed:** 2026-05-03T02:24:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `ReimbursementApplication`, `ReimbursementAttachment` and `ReimbursementAction` models with fixed fields, status/action enums, Decimal amount and list indexes.
- Added SQL migration creating reimbursement enums, tables, indexes and foreign keys.
- Added all seven `reimbursement:*` permission rows plus EMPLOYEE create/own/attachment defaults while keeping ADMIN all-permission inheritance.
- Added local upload persistence through `uploads/`, `REIMBURSEMENT_UPLOAD_DIR` and `oa_uploads` Docker volume wiring.

## Task Commits

No git commits were created. The repository already had unrelated uncommitted changes and `.planning/config.json` has `workflow.autoCommit: false`.

## Files Created/Modified

- `backend/prisma/schema.prisma` - Reimbursement enums, relations, models, Decimal amount and indexes.
- `backend/prisma/migrations/20260503013000_add_reimbursements/migration.sql` - PostgreSQL DDL for reimbursement tables and constraints.
- `backend/prisma/seed.ts` - Reimbursement permission constants, rows and default EMPLOYEE grants.
- `.gitignore` - Ignores local `uploads/` content.
- `docker-compose.yml` - Adds `REIMBURSEMENT_UPLOAD_DIR` and `oa_uploads` persistence.

## Decisions Made

- Kept reimbursement as a fixed business module with explicit columns to support predictable filtering, export and review behavior.
- Stored attachment paths as relative paths only; absolute path construction is deferred to the file safety service.
- Kept export/review/list permissions out of EMPLOYEE defaults so later review/export phases can opt in explicitly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Tooling Compatibility] Used pinned Prisma CLI instead of Bun script alias**
- **Found during:** Task 1 (Prisma validation/generate)
- **Issue:** `bun --env-file=../.env prisma validate` was not available as a Bun script in this workspace, while unpinned `bunx prisma` resolved Prisma 7 and rejected the Prisma 5 datasource style.
- **Fix:** Verified with `bunx prisma@5.22.0 validate --schema "C:\Users\11828\Documents\GitHub\oa\backend\prisma\schema.prisma"` and matching `generate` command.
- **Files modified:** None.
- **Verification:** Prisma schema validation and client generation exited 0 with Prisma 5.22.0.
- **Committed in:** Not committed.

---

**Total deviations:** 1 auto-fixed tooling compatibility issue.
**Impact on plan:** No behavior change; verification command was aligned to the project dependency version.

## Issues Encountered

- The local database had not necessarily applied the new reimbursement migration during focused seed tests. Later contract tests avoid requiring reimbursement table cleanup for seed-only assertions.

## Verification

- `bunx prisma@5.22.0 validate --schema "C:\Users\11828\Documents\GitHub\oa\backend\prisma\schema.prisma"` — passed.
- `bunx prisma@5.22.0 generate --schema "C:\Users\11828\Documents\GitHub\oa\backend\prisma\schema.prisma"` — passed.
- `bun test src/modules/reimbursement/__tests__ src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` — passed as part of final Phase 24 focused suite.
- `rg "uploads|REIMBURSEMENT_UPLOAD_DIR|oa_uploads" .gitignore docker-compose.yml` — found all expected storage markers.

## User Setup Required

For deployed/local runtime usage, apply the new migration to the PostgreSQL database and ensure `REIMBURSEMENT_UPLOAD_DIR` is writable. Docker Compose defaults to `/app/uploads/reimbursements` backed by `oa_uploads`.

## Next Phase Readiness

The database, RBAC and storage foundation is ready for the application API/service and attachment handler layers.

---
*Phase: 24-api*
*Completed: 2026-05-03*
