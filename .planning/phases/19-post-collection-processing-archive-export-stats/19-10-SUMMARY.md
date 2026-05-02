---
phase: 19-post-collection-processing-archive-export-stats
plan: 10
subsystem: ui
tags: [vue, quasar, pinia, notifications, polling]

requires:
  - phase: 19-04
    provides: current-user notification store actions and response types
  - phase: 19-06
    provides: approval task/application target routes for notification navigation
provides:
  - MainLayout in-app notification button with capped unread badge
  - Desktop notification q-menu and mobile full-screen q-dialog list
  - Auth-aware unread refresh on mount/login/focus/60s polling plus mark-read actions
affects: [main-layout, notifications, approval-navigation, ops-07]

tech-stack:
  added: []
  patterns:
    - Quasar header q-btn with floating q-badge for unread notification count
    - Desktop q-menu and mobile maximized q-dialog for the same notification list behavior
    - Silent background polling through the existing Pinia notification store

key-files:
  created:
    - .planning/phases/19-post-collection-processing-archive-export-stats/19-10-SUMMARY.md
  modified:
    - frontend/src/layouts/MainLayout.vue

key-decisions:
  - "Notifications remain in-app only and polling-based: mount/login, window focus, and 60-second interval refresh unread count."
  - "Desktop uses q-menu while mobile uses a full-screen q-dialog to keep notification rows touch-safe."
  - "Notification target navigation is constrained to approval task/application routes before marking a row read."

patterns-established:
  - "MainLayout notification panels reuse the same store-backed rows, loading skeletons, empty copy, and mark-all-read action across desktop and mobile."
  - "Background notification refresh catches errors silently so polling does not interrupt active form entry."

requirements-completed: [OPS-07]

duration: 7 min
completed: 2026-04-26
---

# Phase 19 Plan 10: In-App Notification UI Summary

**MainLayout in-app notifications with capped unread badge, desktop/mobile notification panels, current-user polling, and read-state navigation**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-26T08:58:53Z
- **Completed:** 2026-04-26T09:05:28Z
- **Tasks:** 2 completed
- **Files modified:** 1 code file, 1 summary file

## Accomplishments

- Added a header notification icon with `aria-label="站内通知"` and a floating unread badge capped at `99+`.
- Added a desktop `q-menu` notification list and mobile full-screen `q-dialog` list with skeleton rows, empty copy, unread state, and 56px+ touch-safe rows.
- Wired notification unread refresh on mount/login, window focus, and 60-second polling without WebSocket, SSE, or external notification channels.
- Wired list loading on open, target-route navigation, single notification read updates, and `全部标为已读`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add header unread badge and notification list** - `3b74d31` (feat)
2. **Task 2: Wire polling, focus refresh, navigation, and mark-read** - `95a11de` (fix)

## Files Created/Modified

- `frontend/src/layouts/MainLayout.vue` - Adds the notification button, unread badge, desktop menu, mobile dialog, polling lifecycle, list loading, mark-read actions, target navigation, and icon-button accessibility labels/tooltips.
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-10-SUMMARY.md` - Records plan execution, verification, deviations, and self-check.

## Decisions Made

- Kept notification delivery strictly in-app and polling-only per Phase 19 D-26 and D-30.
- Used the existing `useNotificationStore` actions rather than adding new client API plumbing.
- Limited client-side notification navigation to `/approval/tasks/:id` and `/approval/applications/:id`, matching the Phase 19 notification target contract.

## TDD Notes

- RED: `npm test -- src/layouts/__tests__/MainLayoutNotification.test.ts` failed before implementation with missing `useNotificationStore`, notification copy, and focus/polling wiring.
- GREEN: The same layout contract passed after Task 1 implementation.
- Task 2 verification passed with the notification store test, layout contract, and frontend build.

## Verification

- `rg 'notifications|aria-label="站内通知"|q-badge|99\+|全部标为已读|暂无站内通知' frontend/src/layouts/MainLayout.vue` - PASS.
- `rg "min-height: 56px|q-menu|q-dialog" frontend/src/layouts/MainLayout.vue` - PASS.
- `rg "setInterval|addEventListener\('focus'|removeEventListener\('focus'|markRead|markAllRead|targetRoute" frontend/src/layouts/MainLayout.vue` - PASS.
- `rg "WebSocket|EventSource|SSE|钉钉|企业微信|短信|邮件" frontend/src/layouts/MainLayout.vue` - PASS, no matches.
- `npm test -- src/layouts/__tests__/MainLayoutNotification.test.ts` - PASS, 4 tests.
- `npm test -- src/stores/__tests__/notification.test.ts src/layouts/__tests__/MainLayoutNotification.test.ts` - PASS, 9 tests.
- `npm run build` - PASS. Quasar build completed with the existing large chunk warning.

Manual UAT was not run in this executor session; desktop/mobile badge placement should still be checked in an authenticated browser session.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added accessibility labels/tooltips to existing MainLayout icon-only controls**
- **Found during:** Task 1 (Add header unread badge and notification list)
- **Issue:** Existing menu and dark-mode icon-only buttons in the same toolbar/drawer lacked aria labels/tooltips, conflicting with the plan and user UI constraint that every icon-only button must be named.
- **Fix:** Added `aria-label` and `q-tooltip` to the existing menu and dark-mode icon buttons touched by this layout work.
- **Files modified:** `frontend/src/layouts/MainLayout.vue`
- **Verification:** Layout contract tests and frontend build passed.
- **Committed in:** `3b74d31`

---

**Total deviations:** 1 auto-fixed (1 missing critical accessibility issue)
**Impact on plan:** Required to satisfy the stated UI accessibility contract; no new feature scope was added.

## Known Stubs

None - stub pattern scan found no TODO/FIXME/placeholder or hardcoded empty UI data paths in the modified code file.

## Threat Flags

None - no new backend endpoint, schema, file access, or external notification surface was introduced. The client uses the existing current-user scoped notification store and validates notification target route prefixes before navigation.

## Issues Encountered

- The first Task 1 grep command failed due PowerShell quote escaping, not implementation behavior. It was rerun with single quotes and passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

OPS-07 frontend notification behavior is complete for v2.0. Phase 19 now has all planned summaries through 19-10 and is ready for phase/milestone verification.

## Self-Check: PASSED

- Found `frontend/src/layouts/MainLayout.vue`.
- Found `.planning/phases/19-post-collection-processing-archive-export-stats/19-10-SUMMARY.md`.
- Found task commits `3b74d31` and `95a11de` in git history.

---
*Phase: 19-post-collection-processing-archive-export-stats*
*Completed: 2026-04-26*
