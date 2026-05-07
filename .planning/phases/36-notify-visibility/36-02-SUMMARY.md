---
phase: 36-notify-visibility
plan: 2
subsystem: frontend
tags: [vue, quasar, pinia, notifications, channel-push, rbac]

requires:
  - phase: 36-01
    provides: "current-user channel-push notification endpoints and review viewScope backend authorization"
provides:
  - "Header in-app notification badge, desktop menu, mobile dialog, unread polling, and mark-read navigation"
  - "Frontend notification DTOs and current-user Pinia API store"
  - "Review route/menu visibility for channelPush:review or channelPush:viewScope"
  - "Read-only review list/detail banners and reviewer-only mutation controls"
affects: [main-layout, channel-push-review-ui, notification-ui, route-guards]

tech-stack:
  added: []
  patterns:
    - "Current-user notification store never sends userId or targetUserId."
    - "MainLayout polls unread count on mount/login/focus/60-second interval and loads notification rows on open."
    - "Review visibility uses permAny while mutation controls stay gated by channelPush:review."

key-files:
  created:
    - frontend/src/types/notification.ts
    - frontend/src/stores/notification.ts
    - frontend/src/stores/__tests__/notification.test.ts
    - frontend/src/layouts/__tests__/MainLayoutNotification.test.ts
    - .planning/phases/36-notify-visibility/36-02-SUMMARY.md
  modified:
    - frontend/src/layouts/MainLayout.vue
    - frontend/src/router/routes.ts
    - frontend/src/pages/ChannelPushReviewPage.vue
    - frontend/src/pages/ChannelPushReviewDetailPage.vue
    - frontend/src/pages/__tests__/ChannelPushReviewPage.test.ts
    - frontend/src/pages/__tests__/ChannelPushReviewDetailPage.test.ts

key-decisions:
  - "Kept notification delivery in-app and polling-based; no external notification channel or SSE/WebSocket surface was added."
  - "Trusted backend-provided targetRoute for internal navigation only when it starts with a single slash, then marked the notification read."
  - "Kept internal-field save visible only to users with channelPush:review because those fields are mutation controls."
  - "Disabled/read-only internal-field inputs for viewScope-only users so read-only mode is explicit beyond hiding action buttons."

patterns-established:
  - "Notification rows use readAt nullability for unread state and preserve newest-first backend ordering."
  - "Scope-only review access is represented by top-level q-banner copy containing 只读查看 and viewScope."
  - "Source-contract tests pin route/menu permission widening and mutation-gate strings."

requirements-completed: [NOTIF-01, NOTIF-02, NOTIF-04, REVIEW-02]

duration: 23min
completed: 2026-05-07
---

# Phase 36 Plan 2: Frontend Notification And Read-Only Review Summary

**Channel-push notification center with unread polling plus review pages reachable in read-only mode for viewScope users**

## Performance

- **Duration:** 23 min
- **Started:** 2026-05-07T12:38:00Z
- **Completed:** 2026-05-07T13:01:38Z
- **Tasks:** 2 completed
- **Files modified:** 11

## Accomplishments

- Added typed channel-push notification DTOs and a Pinia store for unread count, list, mark-read, and mark-all-read endpoints.
- Added MainLayout notification UI: accessible bell button, capped `99+` badge, desktop 360px menu, mobile maximized dialog, empty copy, focus refresh, 60-second polling, list refresh on open, target-route navigation, and read-state updates.
- Widened channel-push review routes and menu entry to `permAny: ['channelPush:review', 'channelPush:viewScope']`.
- Added read-only banners for viewScope-only users and kept save/approve/reject mutations behind `channelPush:review`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add notification DTOs/store/tests and the header badge/menu** - `38c99ee` (feat)
2. **Task 2: Make the review pages and router/menu scope-aware for read-only viewers** - `0215ae5` (feat)

## Files Created/Modified

- `frontend/src/types/notification.ts` - Channel-push notification DTOs, type labels, target-route helper, unread helper, and date helpers.
- `frontend/src/stores/notification.ts` - Current-user notification API store for unread count, list, mark-read, mark-all-read, and reset.
- `frontend/src/stores/__tests__/notification.test.ts` - Store request-shape tests proving no client-side user scope is sent.
- `frontend/src/layouts/MainLayout.vue` - Header notification center, polling lifecycle, read actions, and widened review menu visibility.
- `frontend/src/layouts/__tests__/MainLayoutNotification.test.ts` - Source contract for badge/menu/dialog/polling/navigation behavior.
- `frontend/src/router/routes.ts` - Review list/detail routes now allow reviewer or viewScope permissions.
- `frontend/src/pages/ChannelPushReviewPage.vue` - Read-only banner for viewScope-only users.
- `frontend/src/pages/ChannelPushReviewDetailPage.vue` - Read-only banner, disabled internal fields, and reviewer-only save/decision actions.
- `frontend/src/pages/__tests__/ChannelPushReviewPage.test.ts` - Source contract for route/menu widening and read-only copy.
- `frontend/src/pages/__tests__/ChannelPushReviewDetailPage.test.ts` - Source contract for detail read-only mode and mutation guards.

## Decisions Made

- Used POST endpoints from the Phase 36 backend contract: `/notifications/:id/read` and `/notifications/read-all`.
- Used backend response shape `{ count }` for unread counts and `readAt` nullability for read state.
- Kept notification navigation constrained to internal absolute app paths to avoid navigating to protocol-relative or external URLs.
- Left the review list itself view-only; there are no approve/reject controls there to hide.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The frontend build took about 9 minutes and emitted the existing Rollup large chunk warning. Build still succeeded.

## Verification

- `cd frontend && npm test -- src/stores/__tests__/notification.test.ts src/layouts/__tests__/MainLayoutNotification.test.ts` - PASS, 9 tests.
- `rg "useNotificationStore|fetchUnreadCount|fetchList|markRead|markAllRead" frontend/src/stores/notification.ts` - PASS.
- `rg "notifications|aria-label=\"站内通知\"|q-badge|99\\+|全部标为已读|暂无站内通知|新的待办和审批结果会显示在这里" frontend/src/layouts/MainLayout.vue` - PASS.
- `rg "setInterval|addEventListener\\('focus'|removeEventListener\\('focus'|targetRoute|markRead" frontend/src/layouts/MainLayout.vue` - PASS.
- `cd frontend && npm test -- src/pages/__tests__/ChannelPushReviewPage.test.ts src/pages/__tests__/ChannelPushReviewDetailPage.test.ts` - PASS, 12 tests.
- `rg "permAny.*channelPush:viewScope|channelPush:review" frontend/src/router/routes.ts frontend/src/layouts/MainLayout.vue` - PASS.
- `rg "只读查看|read-only|viewScope" frontend/src/pages/ChannelPushReviewPage.vue frontend/src/pages/ChannelPushReviewDetailPage.vue` - PASS.
- `rg "auth.hasPerm\\('channelPush:review'\\)" frontend/src/pages/ChannelPushReviewPage.vue frontend/src/pages/ChannelPushReviewDetailPage.vue` - PASS.
- `cd frontend && npm test -- src/stores/__tests__/notification.test.ts src/layouts/__tests__/MainLayoutNotification.test.ts src/pages/__tests__/ChannelPushReviewPage.test.ts src/pages/__tests__/ChannelPushReviewDetailPage.test.ts` - PASS, 21 tests.
- `cd frontend && npm run build` - PASS; existing large chunk warning only.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Frontend notification and read-only visibility behavior is ready for Phase 36 closeout verification. Manual browser UAT still needs to exercise the full submit -> recipient notification -> review -> partner notification loop and viewScope read-only access.

## Self-Check: PASSED

- Verified all created files exist.
- Verified task commits `38c99ee` and `0215ae5` are present in git history.
- Verified focused tests and frontend build pass.

---
*Phase: 36-notify-visibility*
*Completed: 2026-05-07*
