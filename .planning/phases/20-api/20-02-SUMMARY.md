---
phase: 20-api
plan: 2
subsystem: backend-data
tags: [prisma, migration, rbac, visit]

requires:
  - phase: 20-api
    provides: Wave 0 visit backend contracts
provides:
  - VisitRecord Prisma model and migration
  - Visit permission seed data
affects: [20-api, 21-visits, 22-import, 23-stats]

tech-stack:
  added: []
  patterns: [fixed ledger model, explicit permission code constants]

key-files:
  created:
    - backend/prisma/migrations/20260502090000_add_visit_records/migration.sql
  modified:
    - backend/prisma/schema.prisma
    - backend/prisma/seed.ts
    - backend/src/modules/role/__tests__/visit-permissions.seed.test.ts

key-decisions:
  - "VisitRecord is a fixed business table, not Submission JSON or a dynamic form schema."
  - "Status-like visit fields stay nullable strings; dictionaries/enums are deferred."
  - "No database unique constraint is added for potential duplicate visits."

patterns-established:
  - "Visit permissions are exported as VISIT_PERMISSION_CODES and seeded once under module visit."
  - "Host-side Prisma validation uses the project-local Prisma 5 executable when Bun script resolution is unavailable."

requirements-progressed: [VISIT-01, PERM-01, PERM-02]

duration: same-session
completed: 2026-05-02
---

# Phase 20 Plan 2 Summary

**VisitRecord model, migration and visit permission seed foundation**

## Performance

- **Duration:** same session
- **Started:** 2026-05-02
- **Completed:** 2026-05-02
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `VisitRecord` with the 15 visit sheet fields, creator relation, timestamps and common filter indexes.
- Created `20260502090000_add_visit_records` migration with table, indexes and `User(id)` foreign key.
- Added and exported the six `visit:*` permission codes and seed rows while keeping default EMPLOYEE permissions unchanged.
- Regenerated Prisma Client after validating the updated schema.

## Task Commits

No git commits were created in this execution session.

## Files Created/Modified

- `backend/prisma/schema.prisma` - Added `User.visitRecords` and `VisitRecord`.
- `backend/prisma/migrations/20260502090000_add_visit_records/migration.sql` - Added visit table, indexes and foreign key.
- `backend/prisma/seed.ts` - Added `VISIT_PERMISSION_CODES` and visit permission seed entries.
- `backend/src/modules/role/__tests__/visit-permissions.seed.test.ts` - Kept seed contract aligned with exported permission data.

## Decisions Made

- Preserved the fixed-ledger scope from the Phase 20 context: no enums, dictionaries, JSONB schema storage or dedupe constraint.
- Used the existing ADMIN all-permission seed flow so new visit permissions are inherited without special-case role logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Tooling] Use local Prisma 5 CLI instead of Bun script lookup**
- **Found during:** Task 1/2 validation
- **Issue:** `bun --env-file=../.env prisma ...` was not available as a package script, and `bunx prisma` resolved Prisma 7 with incompatible schema expectations.
- **Fix:** Ran the project-local Prisma 5 executable from `backend/node_modules/.bin/prisma.exe` for validate/generate.
- **Verification:** Prisma schema validation and client generation completed successfully.
- **Committed in:** Not committed

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** No product behavior change; validation used the installed project Prisma version.

## Issues Encountered

- The local database remains behind some older migrations, so seed verification stayed at the source/contract layer for visit permission defaults.

## User Setup Required

None for code review. Applying the migration is required before runtime use against a database that lacks `VisitRecord`.

## Next Phase Readiness

`VisitRecord` and `visit:*` permissions are in place, unblocking the `/api/v1/visits` route implementation.

---
*Phase: 20-api*
*Completed: 2026-05-02*
