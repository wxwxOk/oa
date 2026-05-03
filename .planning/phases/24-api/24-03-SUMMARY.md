---
phase: 24-api
plan: 3
subsystem: api
tags: [bun, elysia, prisma, reimbursement, rbac, pagination]

requires:
  - phase: 24-api plan 2
    provides: Reimbursement Prisma models, permission seed and storage baseline
  - phase: 19-post-collection-processing-archive-export-stats
    provides: RBAC, append-only action and paginated route patterns
  - phase: 23-stats
    provides: fixed business-module API conventions
provides:
  - Reimbursement state transition guard and department-review node constant
  - Reimbursement service helpers for validation, serialization, list/detail/create/update/submit
  - Object-level authorization for own/list/department-review/finance-review/admin scopes
  - Elysia `/reimbursements` route module registered under `/api/v1`
affects: [24-api, 25-reimbursement-ui, 26-reimbursement-review, 27-reimbursement-export]

tech-stack:
  added: []
  patterns:
    - Route bodies only accept writable reimbursement fields; identity and status derive from backend context
    - Service visibility scopes are enforced after authentication and before detail/attachment access
    - Submit transitions update status and append an audit action inside one Prisma transaction

key-files:
  created:
    - backend/src/modules/reimbursement/reimbursement.state.ts
    - backend/src/modules/reimbursement/reimbursement.service.ts
    - backend/src/modules/reimbursement/reimbursement.route.ts
    - backend/src/modules/reimbursement/__tests__/reimbursement.service.test.ts
  modified:
    - backend/src/index.ts

key-decisions:
  - "Draft create/update derives applicant and department snapshots from `currentUser` and Prisma user data, never from request body fields."
  - "Submit only allows DRAFT -> DEPARTMENT_REVIEW and appends a SUBMIT action at node `部门初审`."
  - "Read routes authenticate with `authGuard()` and then allow any reimbursement read/review scope before service-level object visibility, so list/reviewer users are not accidentally blocked by an own-only guard."

patterns-established:
  - "Reimbursement list responses use `{ rows, total, page, size }` and cap page size at 100."
  - "Detail serializers expose attachment/action metadata without leaking storage paths."

requirements-completed: [REIM-01, REIM-02, REIM-03, REIM-04, INV-02, PERM-01, PERM-02, PERM-03, NFR-02]

duration: 35min
completed: 2026-05-03
---

# Phase 24 Plan 3: Reimbursement Application API Summary

**Reimbursement draft, submit, list and detail API with backend-derived identity and object-level visibility.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-05-03T02:24:00Z
- **Completed:** 2026-05-03T02:59:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added reimbursement state transition helpers with the fixed DRAFT -> DEPARTMENT_REVIEW submit path.
- Added service validation for required fields, Decimal-compatible amount strings, date filters, capped pagination and object visibility.
- Added create, update, submit, list and detail service functions using backend-derived applicant snapshots and audit action creation.
- Added Elysia route module, strict request schemas, serializers and `/api/v1` registration.

## Task Commits

No git commits were created. The repository already had unrelated uncommitted changes and `.planning/config.json` has `workflow.autoCommit: false`.

## Files Created/Modified

- `backend/src/modules/reimbursement/reimbursement.state.ts` - Reimbursement status transition map and submit node constant.
- `backend/src/modules/reimbursement/reimbursement.service.ts` - Validation, authorization, serializers and application CRUD/submit service functions.
- `backend/src/modules/reimbursement/reimbursement.route.ts` - `/reimbursements` route module, schemas and application endpoints.
- `backend/src/modules/reimbursement/__tests__/reimbursement.service.test.ts` - Focused service/state contract coverage.
- `backend/src/index.ts` - Registers `reimbursementModule` under `/api/v1`.

## Decisions Made

- Kept writable payloads limited to business fields and rejected trusted identity/status/audit fields at schema and service boundaries.
- Kept list/detail authorization split into authentication plus explicit reimbursement read-scope checks, then service-level object visibility.
- Kept submit behavior minimal for Phase 24: department-review entry and submit audit action only; approval/rejection handlers stay in Phase 26.

## Deviations from Plan

### Auto-fixed Issues

**1. [Authorization Correctness] Avoided own-only runtime guards for read routes**
- **Found during:** Route implementation review.
- **Issue:** Guarding list/detail only with `authGuard('reimbursement:own')` would block users that have only `reimbursement:list`, `reimbursement:department-review`, or `reimbursement:finance-review` even though object authorization allows them.
- **Fix:** Read routes now use `authGuard()` plus `assertCanReadReimbursements`, then defer record-level checks to `canViewReimbursement`/`assertCanViewReimbursement`.
- **Files modified:** `backend/src/modules/reimbursement/reimbursement.route.ts`
- **Verification:** Phase 24 route/source contract and focused backend suite pass.
- **Committed in:** Not committed.

---

**Total deviations:** 1 auto-fixed authorization correctness issue.
**Impact on plan:** Aligns runtime behavior with the planned own/list/reviewer/admin visibility model; no scope expansion.

## Issues Encountered

- Prisma reimbursement delegates are referenced through runtime delegates to keep service code executable across generated-client and migration timing during local contract tests.

## Verification

- `bun test src/modules/reimbursement/__tests__ src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` — passed with 25 tests, 0 failures.
- `bun run build` from `backend/` — passed.
- IDE diagnostics for edited reimbursement files — clean.

## User Setup Required

None for API code. Runtime use still requires applying the Phase 24 Prisma migration from Plan 2.

## Next Phase Readiness

Application API behavior is ready for attachment file handlers and Phase 25 frontend integration.

---
*Phase: 24-api*
*Completed: 2026-05-03*
