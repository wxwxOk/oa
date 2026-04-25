---
phase: 15-approval-data-model-state-machine
plan: 01
subsystem: database
tags: [prisma, postgres, approval, migration]
requires: []
provides:
  - Approval process, node, application, task, action, and timeline Prisma models
  - Approval status, task status, action type, and approver source enums
  - add_approval_models migration SQL for the approval aggregate
affects: [approval, phase-16, phase-17, phase-18, phase-19]
tech-stack:
  added: []
  patterns: [prisma-json-snapshots, append-only-approval-events]
key-files:
  created:
    - backend/prisma/migrations/20260425090000_add_approval_models/migration.sql
  modified:
    - backend/prisma/schema.prisma
key-decisions:
  - "ApprovalApplication remains separate from Submission to preserve public collection semantics."
  - "Manual migration SQL was created after local PostgreSQL was unavailable for migrate dev."
patterns-established:
  - "Approval applications persist schema/process/template/applicant/department snapshots at creation time."
  - "Approval actions and timeline events are modeled as paired append-only records."
requirements-completed: [MODEL-01, MODEL-02, MODEL-04]
duration: 18 min
completed: 2026-04-25
---

# Phase 15 Plan 01: Approval Data Model Summary

**Prisma approval aggregate with executable snapshots, task/action/timeline persistence, and add_approval_models migration SQL**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-25T08:08:00Z
- **Completed:** 2026-04-25T08:26:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added approval enums and Prisma models for process definitions, nodes, applications, tasks, actions, and timeline events.
- Added relations from `User`, `Department`, `Role`, and `FormTemplate` to the approval aggregate.
- Added migration SQL that creates approval enums, tables, indexes, unique constraints, and foreign keys.
- Generated Prisma client and confirmed backend build after schema changes.

## Task Commits

1. **Task 1: Add approval enums and model relations to Prisma schema** - `addf05b` (feat)
2. **Task 2: Generate Prisma migration and client** - `118699a` (feat)

## Files Created/Modified

- `backend/prisma/schema.prisma` - Approval enums, models, relations, JSON snapshots, indexes, and append-only action/timeline tables.
- `backend/prisma/migrations/20260425090000_add_approval_models/migration.sql` - SQL migration for approval enums, tables, indexes, and foreign keys.

## Decisions Made

- Followed the plan's separate `ApprovalApplication` aggregate instead of altering `Submission`.
- Used a manual Prisma-compatible migration SQL file because the configured PostgreSQL host was unavailable for `prisma migrate dev`.

## Deviations from Plan

None - plan executed exactly as written. The database connectivity failure was an expected environmental branch documented by the plan.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

- `bun --env-file=../.env prisma migrate dev --name add_approval_models` failed with `P1001: Can't reach database server at postgres:5432`.
- Resolution: created `backend/prisma/migrations/20260425090000_add_approval_models/migration.sql`, then ran `bun --env-file=../.env prisma generate` and `bun run build` successfully.

## Verification

- `bun --env-file=../.env prisma format` - passed
- `bun --env-file=../.env prisma validate` - passed
- `bun --env-file=../.env prisma generate` - passed
- `bun run build` - passed
- Migration SQL contains `ApprovalApplication`, `ApprovalTask`, `ApprovalAction`, and `ApprovalTimelineEvent`.

## User Setup Required

Run the migration against a reachable project PostgreSQL instance before deploying Phase 15 database changes:

```powershell
cd backend
bun --env-file=../.env prisma migrate dev --name add_approval_models
```

## Next Phase Readiness

Prisma client types for approval statuses and models are generated locally. Wave 2 can implement the centralized approval state machine.

## Self-Check: PASSED

---
*Phase: 15-approval-data-model-state-machine*
*Completed: 2026-04-25*
