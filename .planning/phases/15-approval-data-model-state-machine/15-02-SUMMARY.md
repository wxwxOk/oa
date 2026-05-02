---
phase: 15-approval-data-model-state-machine
plan: 02
subsystem: backend
tags: [approval, state-machine, bun-test, bizerror]
requires:
  - phase: 15-approval-data-model-state-machine
    provides: Approval Prisma enums and generated client types
provides:
  - Central approval application transition guard
  - Pending-task guard for approval task handling
  - Bun tests for legal transitions, invalid skips, terminal states, and task status handling
affects: [approval-service, phase-17, phase-18]
tech-stack:
  added: []
  patterns: [centralized-state-machine, business-error-guards]
key-files:
  created:
    - backend/src/modules/approval/state-machine.ts
    - backend/src/modules/approval/__tests__/state-machine.test.ts
  modified: []
key-decisions:
  - "Approval status transitions are centralized in state-machine.ts instead of route or service-local conditionals."
patterns-established:
  - "Illegal approval transitions throw BizError with INVALID_APPROVAL_TRANSITION."
  - "Non-pending task handling throws BizError with INVALID_APPROVAL_TASK_STATUS."
requirements-completed: [MODEL-03]
duration: 10 min
completed: 2026-04-25
---

# Phase 15 Plan 02: Approval State Machine Summary

**Centralized approval transition guards with Bun coverage for legal paths, invalid skips, terminal states, and task status handling**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-25T08:26:00Z
- **Completed:** 2026-04-25T08:36:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added tests covering the required approval application lifecycle: `DRAFT -> SUBMITTED -> APPROVING -> APPROVED`.
- Covered rejection and cancellation paths plus illegal skips and terminal-state exits.
- Implemented `canTransitionApplication`, `assertApplicationTransition`, `isTerminalApplicationStatus`, and `assertPendingTask`.
- Verified the state-machine test suite and backend build.

## Task Commits

1. **Task 1: Add state-machine tests first** - `041c011` (test)
2. **Task 2: Implement centralized approval state machine** - `f023d85` (feat)

## Files Created/Modified

- `backend/src/modules/approval/__tests__/state-machine.test.ts` - Bun tests for legal and illegal approval transitions.
- `backend/src/modules/approval/state-machine.ts` - Central transition map and guard functions using `BizError`.

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

None.

## Verification

- `bun test src/modules/approval/__tests__/state-machine.test.ts` - passed, 6 tests
- `bun run build` - passed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The approval service can now use centralized guards for submit, approve, reject, cancel, and closed-task handling.

## Self-Check: PASSED

---
*Phase: 15-approval-data-model-state-machine*
*Completed: 2026-04-25*
