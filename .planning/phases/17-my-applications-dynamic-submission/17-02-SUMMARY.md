---
phase: 17-my-applications-dynamic-submission
plan: "02"
subsystem: backend
tags: [elysia, approval, authenticated-api, route-contracts]
requires:
  - phase: 17-01
    provides: employee approval application service helpers
provides:
  - authenticated approval application route module
  - route serializers for list/detail responses
  - /api/v1 route registration
affects: [frontend-approval-store, approval-api]
tech-stack:
  added: []
  patterns: [TypeBox route contract schemas, pure route serializers]
key-files:
  created:
    - backend/src/modules/approval/application.route.ts
    - backend/src/modules/approval/__tests__/application.route.test.ts
  modified:
    - backend/src/index.ts
key-decisions:
  - "Approval application APIs are registered only under authenticated `/api/v1/approval/applications`."
  - "Route body schemas expose form data and IDs only; trusted snapshots and applicant identity are not accepted."
patterns-established:
  - "Route tests validate serializers and schema surface without requiring JWT setup."
requirements-completed: [APP-01, APP-02, APP-03, APP-04, APP-05]
duration: 14min
completed: 2026-04-25
---

# Phase 17 Plan 02: Backend Application Routes Summary

**Authenticated `/api/v1/approval/applications` API for templates, drafts, submit, own tracking, and cancel**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-25T15:00:00Z
- **Completed:** 2026-04-25T15:14:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added route contract tests for module prefix, request schema safety, and list/detail serializers.
- Implemented `approvalApplicationModule` with create-gated template/draft/submit endpoints and own-gated list/detail/cancel endpoints.
- Registered the module in the authenticated `/api/v1` backend group while leaving public `/api/public/f` unchanged.

## Task Commits

1. **Task 1: Add route contract tests** - `93a65a6` (test)
2. **Tasks 2-3: Implement route module and register under `/api/v1`** - `b54599a` (feat)
3. **Serializer hardening: mutation response cancel visibility** - `877c835` (fix)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `backend/src/modules/approval/application.route.ts` - Authenticated route module and serializers for Phase 17 application APIs.
- `backend/src/modules/approval/__tests__/application.route.test.ts` - Pure contract coverage for route schemas and serializers.
- `backend/src/index.ts` - Registers `approvalApplicationModule` inside the authenticated API group.

## Decisions Made

- `GET /templates`, draft create/update, and submit use `approval:application:create`.
- Own list/detail/cancel use `approval:application:own`.
- Routes delegate all ownership, snapshot, validation, and state-machine rules to the service layer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Mutation responses needed server-computed `canCancel`**
- **Found during:** Plan 17-05 visual/API contract review
- **Issue:** Create/update/submit/cancel route handlers serialize raw application records, which do not carry the list-service `canCancel` property.
- **Fix:** Route serializer now computes `canCancel` from mutation response status when the service row did not provide it.
- **Files modified:** `backend/src/modules/approval/application.route.ts`
- **Verification:** `cd backend && bun test src/modules/approval/__tests__/application.route.test.ts`
- **Committed in:** `877c835`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Keeps frontend action visibility consistent without expanding API scope.

## Issues Encountered

None.

## Verification

- `cd backend && bun test src/modules/approval/__tests__/application.route.test.ts src/modules/approval/__tests__/application-submission.service.test.ts`
- `cd backend && bun test src/modules/approval src/modules/template && bun run build`

All verification commands passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Frontend store work can now target the authenticated `/approval/applications` API surface.

---
*Phase: 17-my-applications-dynamic-submission*
*Completed: 2026-04-25*
