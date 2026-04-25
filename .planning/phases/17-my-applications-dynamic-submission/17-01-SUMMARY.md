---
phase: 17-my-applications-dynamic-submission
plan: "01"
subsystem: backend
tags: [approval, prisma, bun-test, form-validation]
requires:
  - phase: 15-approval-state-machine
    provides: approval application lifecycle helpers and task/timeline transitions
provides:
  - employee-owned draft creation and update service helpers
  - required-field validated submit helper
  - own application list/detail/cancel helpers
affects: [approval-applications, frontend-approval-submission]
tech-stack:
  added: []
  patterns: [server-derived approval snapshots, applicant-owned service boundary]
key-files:
  created:
    - backend/src/modules/approval/application-submission.service.ts
    - backend/src/modules/approval/__tests__/application-submission.service.test.ts
  modified: []
key-decisions:
  - "Employee submission helpers derive applicant, department, schema, and process snapshots from Prisma before creating drafts."
  - "Draft updates stay side-effect free; formal submit delegates to the existing approval state machine after required-field validation."
patterns-established:
  - "Internal application list/detail serializers expose canCancel from server-side ownership and status checks."
requirements-completed: [APP-01, APP-02, APP-03, APP-04, APP-05]
duration: 18min
completed: 2026-04-25
---

# Phase 17 Plan 01: Backend Application Submission Service Summary

**Employee-owned approval application service with derived snapshots, draft persistence, validated submit, own tracking, and cancel helpers**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-25T14:40:00Z
- **Completed:** 2026-04-25T15:00:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added service coverage for draft creation/update, submit validation, own list/detail, and applicant-only cancel.
- Implemented `application-submission.service.ts` over the existing approval state-machine helpers.
- Verified draft saves create no tasks/actions/timeline rows while submit and cancel preserve existing workflow transitions.

## Task Commits

1. **Task 1: Add service tests for draft, submit, own reads, and cancel** - `eb13379` (test)
2. **Task 2: Implement employee application submission service helpers** - `f605094` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `backend/src/modules/approval/application-submission.service.ts` - Employee-facing service API for available templates, drafts, submit, own list/detail, and cancel.
- `backend/src/modules/approval/__tests__/application-submission.service.test.ts` - Focused Phase 17 backend service tests.

## Decisions Made

- Available templates are filtered to `PUBLISHED + APPROVAL_REQUIRED` with an active bound approval process.
- Client payloads never accept application numbers, applicant identity, schema snapshots, or process snapshots.
- `IN_PROGRESS` is normalized to `SUBMITTED` and `APPROVING` in the own-list service.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification

- `cd backend && bun test src/modules/approval/__tests__/application-submission.service.test.ts`
- `cd backend && bun test src/modules/approval/__tests__/application-submission.service.test.ts src/modules/approval/__tests__/application.service.test.ts src/modules/template/__tests__/schema.validation.test.ts`
- `cd backend && bun test src/modules/approval src/modules/template`

All verification commands passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Backend service contracts are ready for the authenticated `/api/v1/approval/applications` routes in Plan 17-02.

---
*Phase: 17-my-applications-dynamic-submission*
*Completed: 2026-04-25*
