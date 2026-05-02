---
phase: 19-post-collection-processing-archive-export-stats
plan: 4
subsystem: frontend
tags: [vue, pinia, quasar, typescript, archive, notification, route-guard]
requires:
  - phase: 19-post-collection-processing-archive-export-stats
    provides: "19-02 archive backend endpoint contracts and Wave 0 frontend tests"
provides:
  - "Typed approval archive DTOs, labels, colors, payload key constants, and processing field contracts"
  - "Typed notification DTOs and notification type helpers"
  - "Pinia archive and notification API stores for Phase 19 frontend pages"
  - "Auth hasAnyPerm helper and router meta.permAny guard support"
affects: [phase-19-archive-ui, phase-19-notification-ui, frontend-route-guards]
tech-stack:
  added: []
  patterns: [pinia-api-store, typed-operation-payload-keys, route-meta-permAny]
key-files:
  created:
    - frontend/src/types/approvalArchive.ts
    - frontend/src/types/notification.ts
    - frontend/src/stores/approvalArchive.ts
    - frontend/src/stores/notification.ts
  modified:
    - frontend/src/stores/auth.ts
    - frontend/src/router/index.ts
key-decisions:
  - "Archive operation payload constants export both plan names and Wave 0 compatibility aliases while excluding trusted fields."
  - "Notification types accept TASK_ASSIGNED as a backend compatibility alias for NEW_TASK."
  - "Route permAny is additive and preserves the existing single meta.perm guard behavior."
patterns-established:
  - "Archive frontend operations call source-specific endpoints using sourceType/sourceId paths."
  - "Notification frontend operations never send userId or targetUserId; current user scope remains server-derived."
requirements-completed: [OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07]
duration: 6min
completed: 2026-04-26
---

# Phase 19 Plan 4: Frontend Archive And Notification Contracts Summary

**Typed archive and notification frontend contracts with Pinia API stores and any-permission route guard support**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-26T07:15:56Z
- **Completed:** 2026-04-26T07:21:40Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added archive source/status DTOs, Chinese labels, Quasar colors, recommended tags, processing field types, and operation payload key constants.
- Added archive and notification Pinia stores covering list/detail/action/export/stats, unread count, read, and mark-all-read client calls.
- Added `hasAnyPerm` and router `meta.permAny` support so archive routes can be visible through any approved view permission.

## Task Commits

1. **Task 1: Define archive and notification DTO helpers** - `deecd47` (feat)
2. **Task 2: Add archive and notification Pinia stores** - `af482e7` (feat)
3. **Task 3: Add any-permission route guard support** - `e00eb50` (feat)

## Files Created/Modified

- `frontend/src/types/approvalArchive.ts` - Archive DTOs, source/status helpers, processing field contracts, stats contracts, and operation payload keys.
- `frontend/src/types/notification.ts` - Notification DTOs, unread count/list response contracts, labels, and route helper.
- `frontend/src/stores/approvalArchive.ts` - Archive meta/list/detail/tag/note/processing/correction/export/stats API store.
- `frontend/src/stores/notification.ts` - Current-user notification unread/list/read/mark-all-read API store.
- `frontend/src/stores/auth.ts` - Added `hasAnyPerm` with `ADMIN` bypass.
- `frontend/src/router/index.ts` - Added optional `meta.permAny` guard with existing warning copy and `/403` fallback.

## Decisions Made

- Existing Wave 0 tests were used as the RED contracts for the TDD tasks, so no test files were edited in this plan.
- Kept plan-required payload constant names and added the existing Wave 0 aliases to avoid breaking downstream tests or future UI code.
- Kept route `meta.perm` evaluation unchanged and made `permAny` an additional optional guard.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. The stub scan only found intentional empty/reset store state and existing nullable auth state, not UI placeholder data.

## Issues Encountered

None.

## Verification

- `cd frontend && npm test -- src/types/__tests__/approvalArchive.test.ts` - passed, 4 tests.
- `cd frontend && npm test -- src/stores/__tests__/approvalArchive.test.ts src/stores/__tests__/notification.test.ts` - passed, 12 tests.
- `cd frontend && npm test -- src/types/__tests__/approvalArchive.test.ts src/stores/__tests__/approvalArchive.test.ts src/stores/__tests__/notification.test.ts` - passed, 16 tests.
- `cd frontend && npm run build` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Archive list/detail pages and notification UI can now import typed DTOs and stores without waiting on additional client contract work. Backend authorization and audit boundaries remain server-owned; the frontend guard is only a UX visibility helper.

## Self-Check: PASSED

Verified all six touched frontend files and this summary exist. Verified task commits `deecd47`, `af482e7`, and `e00eb50` are present in git history.

---
*Phase: 19-post-collection-processing-archive-export-stats*
*Completed: 2026-04-26*
