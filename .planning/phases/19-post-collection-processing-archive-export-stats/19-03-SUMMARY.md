---
phase: 19-post-collection-processing-archive-export-stats
plan: 3
subsystem: database
tags: [prisma, postgres, exceljs, permissions, notifications, archive]

requires:
  - phase: 19-01
    provides: Phase 19 backend contract tests and seed permission expectations
provides:
  - Backend ExcelJS dependency pinned at 4.4.0
  - Prisma archive metadata, archive event, processing schema, and user notification models
  - PostgreSQL migration with archive source invariant and operational indexes
  - Phase 19 archive operation permission seed codes
affects: [approval-archive, archive-export, archive-stats, notifications, processing-fields]

tech-stack:
  added: [exceljs@4.4.0]
  patterns:
    - Source-keyed archive metadata outside submitted form JSON
    - Append-only archive event table without update/delete surface
    - User-scoped notification rows indexed by unread and created time

key-files:
  created:
    - backend/prisma/migrations/20260426090000_add_archive_operations_notifications/migration.sql
  modified:
    - backend/package.json
    - backend/bun.lock
    - backend/prisma/schema.prisma
    - backend/prisma/seed.ts
    - backend/src/modules/role/__tests__/approval-permissions.seed.test.ts

key-decisions:
  - "Archive operational state is stored in ArchiveRecordMeta and ArchiveEvent, not in ApprovalApplication.formData or Submission.data."
  - "The exact source invariant is enforced with a PostgreSQL CHECK constraint because Prisma schema cannot express the cross-field source rule."
  - "Host-side Prisma verification used the Docker PostgreSQL database through localhost:5432 because the project .env uses the compose service name postgres."

patterns-established:
  - "ArchiveRecordMeta uses one optional unique source key and a SQL CHECK constraint to bind each metadata row to exactly one approval or collection source."
  - "UserNotification rows are always keyed by userId and indexed for unread count and recent notification queries."

requirements-completed: [OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07]

duration: 10min
completed: 2026-04-26
---

# Phase 19 Plan 3: Data Model, Dependency, and Permission Foundation Summary

**ExcelJS 4.4.0 plus Prisma archive metadata, append-only archive events, processing fields, user notifications, and Phase 19 archive permission seeds**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-26T07:01:28Z
- **Completed:** 2026-04-26T07:11:40Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added `exceljs@4.4.0` as the only backend dependency change.
- Added `processingSchema`, `ArchiveRecordMeta`, `ArchiveEvent`, and `UserNotification` to the Prisma schema.
- Created the Phase 19 migration with source lookup indexes, event/date indexes, notification unread/recent indexes, and a source consistency `CHECK`.
- Added `approval:archive:edit`, `approval:archive:mark`, and `approval:archive:stats` seed permissions with ADMIN grant coverage and EMPLOYEE exclusion tests.

## Task Commits

1. **Task 1: Install ExcelJS exactly once** - `80dcb9e` (`feat`)
2. **Task 2: Add archive operations and notification Prisma models** - `02b354e` (`feat`)
3. **Task 3 RED: Assert EMPLOYEE export exclusion** - `1c2b233` (`test`)
4. **Task 3 GREEN: Seed Phase 19 operation permissions** - `28e21f4` (`feat`)

## Files Created/Modified

- `backend/package.json` - Added `exceljs` pinned to `4.4.0`.
- `backend/bun.lock` - Mechanically updated Bun lockfile for ExcelJS and its transitive dependencies.
- `backend/prisma/schema.prisma` - Added processing schema config, archive metadata/events, and notification models.
- `backend/prisma/migrations/20260426090000_add_archive_operations_notifications/migration.sql` - Added database DDL, indexes, foreign keys, and source invariant check.
- `backend/prisma/seed.ts` - Added Phase 19 archive operation permissions.
- `backend/src/modules/role/__tests__/approval-permissions.seed.test.ts` - Added EMPLOYEE export exclusion coverage.

## Decisions Made

- Used `ArchiveRecordMeta` for current operational state and `ArchiveEvent` for append-only history so submitted form JSON remains untouched.
- Added the exact-one-source rule as a migration-level `CHECK` constraint because Prisma cannot model that invariant directly.
- Kept `approval:export` unchanged and excluded export/archive/task-handle permissions from EMPLOYEE by default.

## Deviations from Plan

None - implementation scope matched the plan.

## Issues Encountered

- Initial `bun run prisma:migrate` failed with P1001 because Docker was not running and the project `.env` points host-side Prisma at the compose service DNS name `postgres`.
- Resolved by starting Docker Desktop and rerunning Prisma against the same Docker PostgreSQL database through `localhost:5432`; `prisma:generate` and `prisma:migrate` then passed.

## Verification

- `cd backend && bun pm ls exceljs`
- `rg '"exceljs": "\^?4\.4\.0"' backend/package.json`
- `rg "exceljs" backend/bun.lock`
- `rg "model ArchiveRecordMeta|model ArchiveEvent|model UserNotification|processingSchema" backend/prisma/schema.prisma`
- `rg "CHECK|ArchiveRecordMeta|UserNotification|ArchiveEvent" backend/prisma/migrations/20260426090000_add_archive_operations_notifications/migration.sql`
- `cd backend && bun run prisma:generate`
- `cd backend && bun run prisma:migrate` with `DATABASE_URL` pointed at `localhost:5432` for host-side access to the Docker PostgreSQL service
- `cd backend && bun test src/modules/role/__tests__/approval-permissions.seed.test.ts`

## Known Stubs

None - stub scan found no placeholder/TODO/empty UI data patterns in the files created or modified by this plan.

## User Setup Required

None for code changes. Docker/PostgreSQL must be running for future host-side Prisma migration checks.

## Next Phase Readiness

The Prisma client generation and migration gate passed, so downstream archive query, processing-field, export, stats, and notification service plans can use the new models and permission codes.

## Self-Check: PASSED

- Verified all created/modified plan files exist.
- Verified task commits exist: `80dcb9e`, `02b354e`, `1c2b233`, `28e21f4`.

---
*Phase: 19-post-collection-processing-archive-export-stats*
*Completed: 2026-04-26*
