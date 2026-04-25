---
phase: 17-my-applications-dynamic-submission
plan: "04"
subsystem: frontend
tags: [quasar, approval, dynamic-form, responsive-ui]
requires:
  - phase: 17-03
    provides: approval application DTOs and Pinia store
provides:
  - My Applications list page
  - internal draft continuation form page
  - status chip component and navigation/route wiring
affects: [approval-application-detail, phase-17-e2e]
tech-stack:
  added: []
  patterns: [desktop table plus mobile card list, authenticated dynamic form fill]
key-files:
  created:
    - frontend/src/components/approval/ApplicationStatusChip.vue
    - frontend/src/pages/ApprovalApplicationPage.vue
    - frontend/src/pages/ApprovalApplicationFormPage.vue
  modified:
    - frontend/src/router/routes.ts
    - frontend/src/layouts/MainLayout.vue
key-decisions:
  - "Starting an application creates an internal draft before routing to `/approval/applications/:id/edit`."
  - "Draft save serializes signatures but does not block on required-field validation; submit validates through GridFormRenderer."
patterns-established:
  - "Approval UI uses authenticated store APIs only; public `/f/:code` is not reused."
requirements-completed: [APP-01, APP-02, APP-03]
duration: 24min
completed: 2026-04-25
---

# Phase 17 Plan 04: My Applications List and Form Summary

**Authenticated My Applications list, template picker, and dynamic draft form using the shared renderer**

## Performance

- **Duration:** 24 min
- **Started:** 2026-04-25T15:26:00Z
- **Completed:** 2026-04-25T15:50:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `我的申请` navigation under `审批管理` with `approval:application:own`.
- Built the list page with status/date filters, desktop table, mobile cards, template picker, and draft/detail routing.
- Built the draft form page with applicant snapshot, `GridFormRenderer mode="fill"`, save draft, and submit actions.

## Task Commits

1. **Tasks 1-3: Status chip, list page, form page, routes, navigation** - `664bbba` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `frontend/src/components/approval/ApplicationStatusChip.vue` - Reusable status chip using centralized status helpers.
- `frontend/src/pages/ApprovalApplicationPage.vue` - My Applications list and template picker.
- `frontend/src/pages/ApprovalApplicationFormPage.vue` - Authenticated draft continuation and submit form.
- `frontend/src/router/routes.ts` - List and edit routes.
- `frontend/src/layouts/MainLayout.vue` - `我的申请` menu entry.

## Decisions Made

- The template picker lists only backend-provided available approval templates.
- Mobile list uses cards and a bottom filter sheet; desktop uses the UI-SPEC table.
- Users without create permission can still view the list if they have own-list permission.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification

- `cd frontend && bun run test --run src/types/__tests__/approvalApplication.test.ts src/stores/__tests__/approvalApplication.test.ts && bun run build`
- Playwright mocked-auth smoke: desktop list has draft/detail actions and no horizontal overflow; draft form shows `保存草稿` and `提交申请`.

All verification commands passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

List-to-detail routing is ready for the Phase 17 detail, timeline, and cancel page.

---
*Phase: 17-my-applications-dynamic-submission*
*Completed: 2026-04-25*
