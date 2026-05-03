---
phase: 25-reimbursement-ui
plan: 02
subsystem: ui
tags: [vue, pinia, router, reimbursement, rbac]
requires:
  - phase: 25-reimbursement-ui plan 01
    provides: Reimbursement frontend contracts
  - phase: 24-api
    provides: `/reimbursements` backend API contract
provides:
  - Reimbursement frontend DTOs, constants and helpers
  - Authenticated reimbursement Pinia store
  - `/reimbursements` route family
  - Top-level `报销管理` menu entry
affects: [25-reimbursement-ui, 26-reimbursement-review, 27-reimbursement-export]
tech-stack:
  added: []
  patterns: [Pinia feature store, relative axios API paths, route meta permAny]
key-files:
  created:
    - frontend/src/types/reimbursement.ts
    - frontend/src/stores/reimbursement.ts
  modified:
    - frontend/src/router/routes.ts
    - frontend/src/layouts/MainLayout.vue
key-decisions:
  - "Frontend reimbursement API calls use relative `/reimbursements` paths and keep `/api/v1` hidden behind axios base config."
  - "Read routes and menu use `permAny` across own/list/department-review/finance-review permissions."
  - "Create/edit/submit routes use `reimbursement:create`; attachment operations stay in the attachment panel through `reimbursement:attachment`."
patterns-established:
  - "Reimbursement list filters omit blank values before calling the backend."
  - "Preview/download APIs return authenticated blobs through the store."
requirements-completed: [REIM-01, REIM-02, REIM-03, REIM-04, INV-01, INV-03, PERM-01, PERM-02]
duration: same session
completed: 2026-05-03
---

# Phase 25 Plan 02 Summary

**Reimbursement DTO helpers, Pinia store actions, authenticated routes and top-level RBAC menu wiring.**

## Performance

- **Duration:** same session
- **Started:** 2026-05-03
- **Completed:** 2026-05-03
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `frontend/src/types/reimbursement.ts` with statuses, labels/colors, fixed write/list keys, attachment constants, formatting helpers and payload normalization.
- Added `useReimbursementStore` for list/detail/create/update/submit/upload/preview/download/delete operations.
- Added `/reimbursements`, `/reimbursements/new`, `/reimbursements/:id/edit` and `/reimbursements/:id` routes plus top-level `报销管理` menu item.

## Task Commits

No git commits were created. The repository already had unrelated uncommitted changes and `.planning/config.json` has `workflow.autoCommit: false`.

## Files Created/Modified

- `frontend/src/types/reimbursement.ts` - Reimbursement DTOs, constants and helpers.
- `frontend/src/stores/reimbursement.ts` - Pinia store for Phase 24 reimbursement endpoints.
- `frontend/src/router/routes.ts` - Reimbursement route family.
- `frontend/src/layouts/MainLayout.vue` - `报销管理` menu entry.

## Decisions Made

- Reused the visit-store pattern for filters, loading flags and normalized write payloads.
- Kept permissions declarative in route/menu metadata and action checks; backend object authorization remains authoritative.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

None.

## Verification

- `cd frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts` — passed after all Phase 25 UI files were present.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03 can build the form and attachment UI on top of the completed type/store/route shell.

---
*Phase: 25-reimbursement-ui*
*Completed: 2026-05-03*
