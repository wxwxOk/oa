---
phase: 19-post-collection-processing-archive-export-stats
plan: 1
subsystem: testing
tags: [bun, elysia, prisma, approval, archive, export, stats, notifications]

requires:
  - phase: 18-approval-task-inbox-mobile-approval
    provides: approval task routes, services, timeline, and internal remark visibility patterns
provides:
  - Backend Wave 0 contract tests for archive operations, export, stats, permissions, and notifications
  - Threat-control assertions for Phase 19 IDOR, tamper, audit, data-separation, CSV injection, export DoS, and notification leak risks
  - Permission seed contracts for approval archive edit, mark, and stats operation codes
affects: [approval, archive, export, stats, notifications, permissions]

tech-stack:
  added: []
  patterns:
    - Bun backend contract tests import future service and route modules directly
    - Route schema tests assert TypeBox additionalProperties false and no trusted client fields
    - Service tests assert source-specific permission boundaries and append-only operational history

key-files:
  created:
    - backend/src/modules/approval/__tests__/archive.service.test.ts
    - backend/src/modules/approval/__tests__/archive.route.test.ts
    - backend/src/modules/approval/__tests__/archive-export.test.ts
    - backend/src/modules/approval/__tests__/archive-stats.test.ts
    - backend/src/modules/approval/__tests__/notification.service.test.ts
    - backend/src/modules/approval/__tests__/notification.route.test.ts
  modified:
    - backend/src/modules/role/__tests__/approval-permissions.seed.test.ts

key-decisions:
  - "Phase 19 Wave 0 tests intentionally fail until future archive, export, stats, and notification modules are implemented."
  - "Archive route contracts reject trusted fields and only accept operation payload fields for tags, notes, processing data, corrections, and reasons."
  - "Notification contracts require transaction-supplied writes and userId = currentUser.id scoping for list/count/read operations."

patterns-established:
  - "Archive rows are normalized as sourceType plus sourceId across approval applications and collection submissions."
  - "Excel export contracts enforce MAX_ARCHIVE_EXPORT_ROWS = 2000 and spreadsheet-formula sanitization before workbook writes."
  - "Stats contracts aggregate non-draft archive records by template, status, department, month, and source type."

requirements-completed: [OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07]

duration: 10min
completed: 2026-04-26
---

# Phase 19 Plan 1: Backend Contract Tests Summary

**Backend Wave 0 contract coverage for archive operations, Excel export safeguards, stats aggregation, permission seeding, and user-scoped notifications.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-26T06:36:54Z
- **Completed:** 2026-04-26T06:46:34Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added archive service and route contracts covering OPS-01 through OPS-04: source normalization, permissions, tags, notes, processing values, controlled corrections, strict payload schemas, and trusted-field rejection.
- Added export and stats contracts covering OPS-05 and OPS-06: Excel cell sanitization, 2,000-row cap, archive filter reuse, draft exclusion, collection status mapping, and required aggregation dimensions.
- Added notification service and route contracts covering OPS-07: transaction-bound task/final-state notifications, unread count, mark-read operations, and current-user scoping.
- Updated permission seed tests to require `approval:archive:edit`, `approval:archive:mark`, and `approval:archive:stats` while keeping `approval:export` unchanged and excluding archive operations from EMPLOYEE.

## Task Commits

1. **Task 1: Add archive service and route contract tests** - `a430266` (test)
2. **Task 2: Add export, stats, and permission seed contracts** - `d68e36e` (test)
3. **Task 3: Add notification service and route contracts** - `b81e216` (test)

## Files Created/Modified

- `backend/src/modules/approval/__tests__/archive.service.test.ts` - Future archive service contracts for list/detail, tags, notes, processing data, corrections, permissions, and audit/data separation threats.
- `backend/src/modules/approval/__tests__/archive.route.test.ts` - Future archive route prefix, query filter, strict body schema, serializer, and trusted-field rejection contracts.
- `backend/src/modules/approval/__tests__/archive-export.test.ts` - Future Excel export contracts for cell sanitization, row cap, workbook output, and archive filter reuse.
- `backend/src/modules/approval/__tests__/archive-stats.test.ts` - Future stats service contracts for permission gating, draft exclusion, collection status mapping, and five aggregation dimensions.
- `backend/src/modules/approval/__tests__/notification.service.test.ts` - Future notification service contracts for transaction-bound writes and user-scoped list/count/read operations.
- `backend/src/modules/approval/__tests__/notification.route.test.ts` - Future notification route contracts for `/notifications`, strict read bodies, no client `userId`, and serialization.
- `backend/src/modules/role/__tests__/approval-permissions.seed.test.ts` - Existing seed contract extended for Phase 19 archive operation permission codes.

## Decisions Made

- Contract tests import the future modules directly rather than skipping or soft-checking for module existence, so later implementation plans must satisfy the expected exports.
- Export sanitization uses a leading apostrophe contract for strings beginning with `=`, `+`, `-`, `@`, tab, or carriage return.
- Notification service contracts pass a transaction/client object into write and query helpers to prove transaction-bound creation and `userId = currentUser.id` scoping.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The focused Bun run is expected to fail in Wave 0 because `archive.service`, `archive.route`, `archive-export.service`, `archive-stats.service`, `notification.service`, and `notification.route` are intentionally not implemented yet.
- The same Bun run also reported the existing PostgreSQL test database at `localhost:5432` was unavailable for `approval-permissions.seed.test.ts`; the plan verification commands for Wave 0 did not require a running database.
- An initial PowerShell existence-check command had quoting issues and was rerun successfully with direct `Test-Path` checks.

## Verification

- `Test-Path` checks for all seven target files: passed.
- Plan acceptance `rg` checks for archive service exports, strict archive route schemas, export controls, stats dimensions, archive permissions, notification behavior, and notification route user scoping: passed.
- Focused Bun command run:
  - `cd backend; bun test src/modules/approval/__tests__/archive.service.test.ts src/modules/approval/__tests__/archive.route.test.ts src/modules/approval/__tests__/archive-export.test.ts src/modules/approval/__tests__/archive-stats.test.ts src/modules/approval/__tests__/notification.service.test.ts src/modules/approval/__tests__/notification.route.test.ts src/modules/role/__tests__/approval-permissions.seed.test.ts`
  - Result: expected failure from missing future modules, plus local DB unavailable for the existing seed test.

## Known Stubs

None. Stub scan found no `TODO`, `FIXME`, placeholder text, or hardcoded empty UI data patterns in the files created or modified by this plan.

## User Setup Required

None for contract scaffolding. A running PostgreSQL database will be needed when DB-backed seed and service tests are expected to pass in later implementation plans.

## Next Phase Readiness

Plan 19-02 and later implementation plans can now build against concrete backend contracts for archive services, routes, export/stat behavior, permission seeds, and notifications.

## Self-Check: PASSED

- Verified all created/modified plan files exist.
- Verified task commits `a430266`, `d68e36e`, and `b81e216` exist in git history.

---
*Phase: 19-post-collection-processing-archive-export-stats*
*Completed: 2026-04-26*
