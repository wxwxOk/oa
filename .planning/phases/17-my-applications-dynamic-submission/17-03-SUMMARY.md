---
phase: 17-my-applications-dynamic-submission
plan: "03"
subsystem: frontend
tags: [pinia, vitest, approval, dto]
requires:
  - phase: 17-02
    provides: authenticated approval application API routes
provides:
  - approval application frontend DTOs
  - centralized status label/color/cancel helpers
  - Pinia store for templates, drafts, list/detail, submit, and cancel
affects: [approval-application-ui]
tech-stack:
  added: []
  patterns: [typed API store wrapper, centralized status UI helpers]
key-files:
  created:
    - frontend/src/types/approvalApplication.ts
    - frontend/src/types/__tests__/approvalApplication.test.ts
    - frontend/src/stores/approvalApplication.ts
    - frontend/src/stores/__tests__/approvalApplication.test.ts
  modified: []
key-decisions:
  - "Frontend payload types document only allowed fields and exclude trusted snapshots/applicant identity."
  - "Cancel visibility requires both server `canCancel` and an in-progress status."
patterns-established:
  - "Approval application store uses the authenticated shared `api` instance only."
requirements-completed: [APP-01, APP-02, APP-03, APP-04, APP-05]
duration: 12min
completed: 2026-04-25
---

# Phase 17 Plan 03: Frontend Contracts and Store Summary

**Typed frontend approval application contracts and Pinia store for authenticated employee application workflows**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-25T15:14:00Z
- **Completed:** 2026-04-25T15:26:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added DTOs for available templates, application rows/details, timeline, tasks, filters, and action payloads.
- Centralized UI-SPEC status labels/colors plus in-progress and cancel visibility helpers.
- Implemented `useApprovalApplicationStore` against `/approval/applications` with tested loading flag cleanup.

## Task Commits

1. **Task 1: Add approval application DTOs and status helper tests** - `0a678ae` (test), `5f988a9` (feat)
2. **Task 2: Add approval application Pinia store and store tests** - `cfece26` (test), `d76a40b` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `frontend/src/types/approvalApplication.ts` - DTOs, payload types, and status/cancel helper functions.
- `frontend/src/types/__tests__/approvalApplication.test.ts` - Status and payload key helper tests.
- `frontend/src/stores/approvalApplication.ts` - Pinia store for authenticated application API calls.
- `frontend/src/stores/__tests__/approvalApplication.test.ts` - API path/payload and loading flag tests.

## Decisions Made

- Store actions never call `/public/f`; all calls use authenticated `/approval/applications` endpoints.
- `SUBMITTED` and `APPROVING` are both rendered as `审批中` with `primary` color.
- Store `submit` sends an empty body when no new form data is supplied.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The plan command used `bun test --run`, but this frontend project runs Vitest via `bun run test --run`. Verification used the project script.

## Verification

- `cd frontend && bun run test --run src/types/__tests__/approvalApplication.test.ts`
- `cd frontend && bun run test --run src/types/__tests__/approvalApplication.test.ts src/stores/__tests__/approvalApplication.test.ts`
- `cd frontend && bun run test --run src/types src/stores`

All verification commands passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The UI pages can now consume typed helpers and the authenticated application store.

---
*Phase: 17-my-applications-dynamic-submission*
*Completed: 2026-04-25*
