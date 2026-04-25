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
  - "Code review hardening requires applicant-only submit, task-linked first assignment events, and conditional task claims."
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

- Added service tests covering application snapshots, first pending task creation, serial approval, reject/cancel closure, submit/cancel/task authorization failures, and comment/mark/edit append behavior.
- Implemented `createDraftApplication`, `submitApplication`, `approveTask`, `rejectTask`, `cancelApplication`, and `appendApplicationEvent`.
- Wrapped multi-row workflow mutations in Prisma transactions.
- Resolved code review findings by enforcing applicant-only submit, linking the first assignment event to its task, and using conditional task claims before audit writes.
- Verified full approval service tests and backend build.

## Task Commits

1. **Task 1: Add approval service tests for snapshots, task progression, terminal closure, and events** - `da0ace6` (test)
2. **Task 2: Implement transactional approval application service** - `3adfc6e` (feat)
3. **Code review fix: Harden approval service authorization and task claims** - `ef49db2` (fix)

## Files Created/Modified

- `backend/src/modules/approval/__tests__/application.service.test.ts` - Integration tests for approval service behavior against Prisma.
- `backend/src/modules/approval/application.service.ts` - Transactional service functions and event helpers.

## Decisions Made

- Used `processSnapshot.nodes` as the runtime task source so future process edits cannot alter active or historical applications.
- Kept comment, mark, and edit as append-only event operations; `appendApplicationEvent` does not mutate `formData`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added submit applicant authorization**
- **Found during:** Code review after Task 2
- **Issue:** `submitApplication` accepted any actor for a draft application.
- **Fix:** Added `APPROVAL_SUBMIT_FORBIDDEN` guard and a negative service test that proves no tasks/events are created.
- **Files modified:** `backend/src/modules/approval/application.service.ts`, `backend/src/modules/approval/__tests__/application.service.test.ts`
- **Verification:** Full approval test suite passes.
- **Committed in:** `ef49db2`

**2. [Rule 2 - Correctness] Linked first ASSIGN event to its task**
- **Found during:** Code review after Task 2
- **Issue:** The first assignment action/timeline event did not include `taskId`.
- **Fix:** Captured the created first task and passed `taskId` into the assignment event.
- **Files modified:** `backend/src/modules/approval/application.service.ts`
- **Verification:** Full approval test suite passes.
- **Committed in:** `ef49db2`

**3. [Rule 2 - Concurrency] Claimed approval tasks conditionally before audit writes**
- **Found during:** Code review after Task 2
- **Issue:** Approve/reject used read-then-update by id, allowing stale pending reads in concurrent requests.
- **Fix:** Switched approve/reject to conditional `updateMany` claims by task id, pending status, and assignee before writing audit rows.
- **Files modified:** `backend/src/modules/approval/application.service.ts`
- **Verification:** Full approval test suite passes.
- **Committed in:** `ef49db2`

**Total deviations:** 3 auto-fixed (1 missing critical, 2 correctness hardening).
**Impact on plan:** All fixes strengthen planned approval integrity without expanding scope.

## Issues Encountered

- Host-side test and migration commands require a `127.0.0.1` `DATABASE_URL` override because repository `.env` uses Docker Compose hostname `postgres`.
- Prior template schema validation tests still fail for `group` and `dynamic-table` acceptance; Phase 15 approval tests are green and this phase did not modify template validation code.

## Verification

- `DATABASE_URL=postgresql://oa:...@127.0.0.1:5432/oa_db?schema=public bun test src/modules/approval/__tests__/state-machine.test.ts src/modules/approval/__tests__/application.service.test.ts` - passed, 16 tests
- `bun run build` - passed

## User Setup Required

None - local Docker Compose PostgreSQL was already running and the Phase 15 migration was applied.

## Next Phase Readiness

Approval backend foundations are ready for route/API or workflow UI phases. Later phases can call the service without duplicating transition logic or manually constructing audit timeline rows.

## Self-Check: PASSED

---
*Phase: 15-approval-data-model-state-machine*
*Completed: 2026-04-25*
