---
phase: 36-notify-visibility
plan: 1
subsystem: backend
tags: [bun, elysia, prisma, notifications, rbac]
requires:
  - phase: 32-api-rbac
    provides: channel-push model, routes, permissions, and partner submission flow
  - phase: 35-ui
    provides: recipient review service and route contracts
provides:
  - transaction-bound channel-push notification writes for submit and review decisions
  - current-user scoped notification list, unread count, mark-read, and read-all API
  - read-only review visibility for channelPush:viewScope and ADMIN without widening mutations
affects: [36-notify-visibility, frontend-notifications, channel-push-review]
tech-stack:
  added: []
  patterns: [transaction-bound notification helpers, object-scoped viewScope read access]
key-files:
  created:
    - backend/prisma/migrations/20260507100000_add_channel_push_notifications/migration.sql
    - backend/src/modules/channel-push/channel-push-notification.service.ts
    - backend/src/modules/channel-push/channel-push-notification.route.ts
    - backend/src/modules/channel-push/__tests__/channel-push.notification.service.test.ts
    - backend/src/modules/channel-push/__tests__/channel-push.notification.route.test.ts
  modified:
    - backend/prisma/schema.prisma
    - backend/src/index.ts
    - backend/src/modules/channel-push/channel-push.service.ts
    - backend/src/modules/channel-push/channel-push-review.service.ts
    - backend/src/modules/channel-push/channel-push-review.route.ts
    - backend/src/modules/channel-push/__tests__/channel-push.service.test.ts
    - backend/src/modules/channel-push/__tests__/channel-push.review.service.test.ts
    - backend/src/modules/channel-push/__tests__/channel-push.review.route.test.ts
key-decisions:
  - "Recreated notifications as a channel-push-specific UserNotification table after the older approval notification table was intentionally dropped."
  - "Read routes use authGuard() plus service-level object-scope checks; mutation routes remain authGuard('channelPush:review') and recipient-only."
patterns-established:
  - "Notification helpers accept a transaction client and write rows inside the same create/review transaction."
  - "channelPush:viewScope expands read visibility through recipient department scope but never grants approve/reject/internal-field mutation."
requirements-completed: [NOTIF-01, NOTIF-04, REVIEW-02]
duration: 44 min
completed: 2026-05-07
---

# Phase 36 Plan 1: Backend Notification Substrate Summary

**Channel-push notification table, user-scoped notification API, transaction hooks, and scope-aware review reads**

## Performance

- **Duration:** 44 min
- **Started:** 2026-05-07T12:00:00Z
- **Completed:** 2026-05-07T12:44:44Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Added `UserNotificationType` and `UserNotification` with channel-push pending/reviewed notification types.
- Added `/notifications` endpoints for list, unread count, mark single read, and mark all read, all scoped to the current user.
- Created pending-review notifications inside partner submit transactions and reviewed notifications inside approve/reject transactions.
- Widened review list/detail/attachment reads for `channelPush:viewScope` and ADMIN while keeping internal-field, approve, and reject mutations recipient-only.

## Task Commits

1. **Task 1: Add channel-push notification schema, service, route, and tests** - `a6000e8`
2. **Task 2: Wire notification writes and read-scope visibility into channel-push flows** - `0c623d7`

## Files Created/Modified

- `backend/prisma/schema.prisma` - Added notification enum/model and User backref.
- `backend/prisma/migrations/20260507100000_add_channel_push_notifications/migration.sql` - Adds table, enum, indexes, and User FK.
- `backend/src/modules/channel-push/channel-push-notification.service.ts` - Notification creation and user-scoped read helpers.
- `backend/src/modules/channel-push/channel-push-notification.route.ts` - `/notifications` API module.
- `backend/src/modules/channel-push/channel-push.service.ts` - Submit transaction creates recipient pending-review notification.
- `backend/src/modules/channel-push/channel-push-review.service.ts` - Review decision transaction creates partner result notification and enforces read/mutation scope.
- `backend/src/modules/channel-push/channel-push-review.route.ts` - Read routes authenticate broadly; mutations remain reviewer guarded.
- `backend/src/index.ts` - Registers notification module under `/api/v1`.

## Decisions Made

- Used generic `sourceType/sourceId` instead of approval-specific FKs because the previous approval notification model was intentionally dropped in Phase 32 cleanup.
- Kept `authGuard()` on review read endpoints so `channelPush:viewScope` can pass JWT auth, then enforced object visibility in service code.

## Deviations from Plan

None - plan executed as written. The only implementation adjustment was preserving the post-approval-removal data model boundary by not recreating approval notification columns.

## Issues Encountered

- `bun` was not installed globally; used `npx bun` for the focused Bun test commands.
- Full `npx tsc --noEmit` still reports pre-existing non-Phase-36 type debt in `submission-archive/archive.service.ts` and `user/channel-partner-admin.service.ts`. Phase 36-local errors were resolved after `npx prisma generate`.

## Verification

- `cd backend && npx bun test src/modules/channel-push/__tests__/channel-push.notification.service.test.ts src/modules/channel-push/__tests__/channel-push.notification.route.test.ts` - PASS, 11 tests.
- `cd backend && npx bun test src/modules/channel-push/__tests__/channel-push.notification.service.test.ts src/modules/channel-push/__tests__/channel-push.notification.route.test.ts src/modules/channel-push/__tests__/channel-push.service.test.ts src/modules/channel-push/__tests__/channel-push.review.service.test.ts src/modules/channel-push/__tests__/channel-push.review.route.test.ts` - PASS, 56 tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Frontend notification store/layout and review read-only UI can now target `/notifications` and read-only review routes.

---
*Phase: 36-notify-visibility*
*Completed: 2026-05-07*
