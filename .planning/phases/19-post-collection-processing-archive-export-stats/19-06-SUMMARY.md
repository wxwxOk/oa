---
phase: 19-post-collection-processing-archive-export-stats
plan: 6
subsystem: api
tags: [elysia, prisma, approval, notifications, in-app]

requires:
  - phase: 19-01
    provides: Backend notification service and route contract tests
  - phase: 19-03
    provides: UserNotification Prisma model and notification indexes
  - phase: 19-05
    provides: Approval archive/task metadata integration baseline
provides:
  - Transaction-bound approval task and final-state notification writes
  - User-scoped notification list, unread count, mark-read, and mark-all-read service helpers
  - Authenticated /notifications backend API registered under /api/v1
affects: [approval-workflow, notifications, phase-19-notification-ui]

tech-stack:
  added: []
  patterns:
    - Prisma transaction client passed into notification creation helpers
    - Notification read APIs derive actor scope only from currentUser.id
    - Notification route serializers hide storage-specific foreign keys and date objects

key-files:
  created:
    - backend/src/modules/approval/notification.service.ts
    - backend/src/modules/approval/notification.route.ts
  modified:
    - backend/src/modules/approval/application.service.ts
    - backend/src/modules/approval/__tests__/application.service.test.ts
    - backend/src/index.ts

key-decisions:
  - "Notification rows are written inside the same Prisma transaction that creates approval tasks or terminal approval/rejection state changes."
  - "Notification list/count/read routes derive scope from currentUser.id and expose no client-supplied user scope."
  - "Unread count route returns unreadCount for frontend consumers while preserving the existing unread alias from the backend contract test."

patterns-established:
  - "Notification service helpers accept the active transaction client for writes and default to prisma only for user-scoped read operations."
  - "Notification API rows expose sourceType/sourceId/targetRoute while keeping storage fields such as approvalApplicationId and approvalTaskId internal."

requirements-completed: [OPS-07]

duration: 9min
completed: 2026-04-26
---

# Phase 19 Plan 6: Backend In-App Notifications Summary

**Transaction-bound in-app notifications for approval task assignment and final approval results, exposed through user-scoped backend APIs**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-26T07:51:32Z
- **Completed:** 2026-04-26T08:00:25Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added notification service helpers for new task, final approval/rejection, list, unread count, mark-read, and mark-all-read behavior.
- Hooked first task, next serial task, final approval, and final rejection notifications into the existing approval workflow transactions.
- Added authenticated `/notifications` routes for list, unread count, mark-read, and mark-all-read under `/api/v1`.
- Extended application service regression coverage to prove notification rows are created by the workflow, not only by standalone helper tests.

## Task Commits

1. **Task 1: Add notification service helpers** - `4de240b` (feat)
2. **Task 2 RED: Assert approval transaction notifications** - `194f8bd` (test)
3. **Task 2 GREEN: Hook notifications into approval transactions** - `315850c` (feat)
4. **Task 3: Expose user-scoped notification routes** - `be37065` (feat)

## Files Created/Modified

- `backend/src/modules/approval/notification.service.ts` - Notification write helpers, user-scoped query/count/read helpers, pagination cap, and route-row serialization shape.
- `backend/src/modules/approval/notification.route.ts` - Authenticated `/notifications` route module with strict empty read bodies and ISO date serialization.
- `backend/src/modules/approval/application.service.ts` - Transaction-bound calls for first/next task notifications and final approval/rejection applicant notifications.
- `backend/src/modules/approval/__tests__/application.service.test.ts` - Workflow regression assertions for actual `UserNotification` rows and no cancellation result notification.
- `backend/src/index.ts` - Registers `notificationModule` under `/api/v1`.

## Decisions Made

- Used `NEW_TASK`, `APPROVED`, and `REJECTED` as stored notification types, matching the Prisma enum from Plan 19-03.
- Kept notification creation quiet and limited to task assignment plus final approval/rejection; archive tags, notes, processing values, and corrections still do not create notifications.
- Returned `unreadCount` for the Phase 19 frontend store while also preserving `unread` as a compatibility alias for the existing backend route contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Verification] Added workflow-level notification row assertions**
- **Found during:** Task 2 (Hook notifications into approval transactions)
- **Issue:** Existing notification helper tests proved transaction-client compatibility, but did not prove `submitApplication`, `approveTask`, and `rejectTask` actually create rows inside workflow transactions.
- **Fix:** Added RED assertions to `application.service.test.ts` for first task, next task, final approval, final rejection, and cancellation non-notification behavior.
- **Files modified:** `backend/src/modules/approval/__tests__/application.service.test.ts`
- **Verification:** RED failed before hooks; final focused Bun suite passed with 26 tests.
- **Committed in:** `194f8bd`

---

**Total deviations:** 1 auto-fixed (1 missing critical verification)
**Impact on plan:** Verification scope increased without adding user-facing behavior beyond OPS-07.

## Issues Encountered

- Expected RED failures occurred before Task 2 hooks were implemented.
- No authentication gates or external setup blockers occurred.

## Verification

- `cd backend && bun test src/modules/approval/__tests__/notification.service.test.ts` - passed, 5 tests.
- `cd backend && bun test src/modules/approval/__tests__/notification.service.test.ts src/modules/approval/__tests__/notification.route.test.ts src/modules/approval/__tests__/application.service.test.ts src/modules/approval/__tests__/task.service.test.ts` - passed, 26 tests.
- `cd backend && bun run build` - passed, bundled `src/index.ts`.
- Acceptance `rg` checks for service exports, user scoping, target routes, application hooks, route registration, auth, and no `userId` in `notification.route.ts` all passed.

## Known Stubs

None - stub scan found no placeholder/TODO/FIXME text. Empty defaults in notification filters and null date checks are implementation guards, not UI/data stubs.

## Threat Flags

None - the new `/notifications` network surface and notification table writes are explicitly covered by this plan's `client->notification routes`, `approval transaction->notification table`, `T-19-IDOR`, `T-19-TAMPER`, and `T-19-NOTIFICATION-LEAK` mitigations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

OPS-07 backend support is ready for the frontend notification badge/list/polling plan. The API is registered, user-scoped, and covered by approval workflow regressions.

## Self-Check: PASSED

- Verified all created/modified plan files exist.
- Verified task commits exist: `4de240b`, `194f8bd`, `315850c`, `be37065`.

---
*Phase: 19-post-collection-processing-archive-export-stats*
*Completed: 2026-04-26*
