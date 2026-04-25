---
phase: 15-approval-data-model-state-machine
plan: 03
subsystem: backend
tags: [approval, prisma, transaction, bun-test]
requires:
  - phase: 15-approval-data-model-state-machine
    provides: Approval Prisma models and centralized state-machine guards
provides:
  - Transactional approval application service
  - Service tests for snapshots, first task assignment, serial approval, terminal closure, authorization guards, and immutable events
affects: [approval-api, phase-17, phase-18, phase-19]
tech-stack:
  added: []
  patterns: [prisma-transaction-workflow, paired-action-timeline-events, snapshot-backed-approval-runtime]
key-files:
  created:
    - backend/src/modules/approval/application.service.ts
    - backend/src/modules/approval/__tests__/application.service.test.ts
  modified: []
key-decisions:
  - "Service mutations use processSnapshot nodes as the executable workflow source instead of live process nodes."
  - "COMMENT, MARK, and EDIT append paired action/timeline rows without mutating application formData."
patterns-established:
  - "Submit creates SUBMIT and ASSIGN records plus the first pending task inside one transaction."
  - "Task approval/rejection/cancellation closes task state and application state atomically."
requirements-completed: [MODEL-02, MODEL-03, MODEL-04]
duration: 32 min
completed: 2026-04-25
---

# Phase 15 Plan 03: Approval Application Service Summary

**Transactional approval service for draft snapshots, submit/assign, serial approval, rejection, cancellation, and immutable audit events**

## Performance

- **Duration:** 32 min
- **Started:** 2026-04-25T08:36:00Z
- **Completed:** 2026-04-25T09:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added service tests covering application snapshots, first pending task creation, serial approval, reject/cancel closure, authorization failures, and comment/mark/edit append behavior.
- Implemented `createDraftApplication`, `submitApplication`, `approveTask`, `rejectTask`, `cancelApplication`, and `appendApplicationEvent`.
- Wrapped multi-row workflow mutations in Prisma transactions.
- Verified full approval service tests and backend build.

## Task Commits

1. **Task 1: Add approval service tests for snapshots, task progression, terminal closure, and events** - `da0ace6` (test)
2. **Task 2: Implement transactional approval application service** - `3adfc6e` (feat)

## Files Created/Modified

- `backend/src/modules/approval/__tests__/application.service.test.ts` - Integration tests for approval service behavior against Prisma.
- `backend/src/modules/approval/application.service.ts` - Transactional service functions and event helpers.

## Decisions Made

- Used `processSnapshot.nodes` as the runtime task source so future process edits cannot alter active or historical applications.
- Kept comment, mark, and edit as append-only event operations; `appendApplicationEvent` does not mutate `formData`.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

- Host-side test and migration commands require a `127.0.0.1` `DATABASE_URL` override because repository `.env` uses Docker Compose hostname `postgres`.

## Verification

- `DATABASE_URL=postgresql://oa:...@127.0.0.1:5432/oa_db?schema=public bun test src/modules/approval/__tests__/state-machine.test.ts src/modules/approval/__tests__/application.service.test.ts` - passed, 15 tests
- `bun run build` - passed

## User Setup Required

None - local Docker Compose PostgreSQL was already running and the Phase 15 migration was applied.

## Next Phase Readiness

Approval backend foundations are ready for route/API or workflow UI phases. Later phases can call the service without duplicating transition logic or manually constructing audit timeline rows.

## Self-Check: PASSED

---
*Phase: 15-approval-data-model-state-machine*
*Completed: 2026-04-25*
