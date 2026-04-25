---
phase: 16-process-config-template-binding
plan: 04
subsystem: backend-api-rbac
tags: [department, default-approver, approval, rbac, seed]
requires:
  - phase: 16-process-config-template-binding
    provides: Department default approver Prisma fields and approval RBAC test contracts from plans 16-01 and 16-02
provides:
  - Department list/tree API responses with default approver id and display object
  - Department approver option endpoint scoped to department update permission
  - Active-user validation for nullable department default approvers on create/update
  - Phase 16 approval permission seed exports and ADMIN/EMPLOYEE role assignments
affects: [phase-16-plan-08, phase-17, approval-rbac, department-api]
tech-stack:
  added: []
  patterns: [elysia-auth-guarded-options-endpoint, prisma-seed-exported-fixtures, explicit-employee-permission-allowlist]
key-files:
  created: []
  modified:
    - backend/src/modules/department/department.route.ts
    - backend/prisma/seed.ts
key-decisions:
  - "Department default approver maintenance uses the existing department:update permission and validates selected users are ACTIVE."
  - "EMPLOYEE seed permissions use an explicit allowlist: existing list permissions plus approval application create/own, without approval task handling."
patterns-established:
  - "Department tree nodes carry defaultApproverId and a selected defaultApprover display object for frontend reuse."
  - "Seed data can be imported by tests through exported constants and seedDatabase() while still running as a script via import.meta.main."
requirements-completed: [CFG-04, CFG-05]
duration: 7 min
completed: 2026-04-25
---

# Phase 16 Plan 04: Department Approver API And Approval RBAC Seed Summary

**Department default approver API support plus Phase 16 approval permission seed exports and role assignments**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-25T11:18:50Z
- **Completed:** 2026-04-25T11:25:47Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `defaultApproverId` and `defaultApprover` to department list and tree responses.
- Added `GET /departments/approver-options`, returning only active users and guarded by `department:update`.
- Added create/update validation that rejects missing or disabled default approvers with `DEPARTMENT_APPROVER_INVALID`.
- Exported `APPROVAL_PERMISSION_CODES`, `EMPLOYEE_PERMISSION_CODES`, and `seedDatabase()` from `backend/prisma/seed.ts`.
- Seeded all 12 Phase 16 approval permission codes, granted all permissions to ADMIN, and granted only approval application create/own to EMPLOYEE.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend department route with default approver fields and options** - `9f4aa96` (feat)
2. **Task 2: Seed approval permission codes and role assignments** - `b6eab0f` (feat)

## Files Created/Modified

- `backend/src/modules/department/department.route.ts` - Includes default approver fields in department responses, active approver options, and active-user validation for create/update.
- `backend/prisma/seed.ts` - Adds approval permission constants/objects, explicit EMPLOYEE allowlist, importable `seedDatabase()`, and `import.meta.main` script entrypoint.
- `.planning/phases/16-process-config-template-binding/16-04-SUMMARY.md` - Execution summary for this plan.

## Decisions Made

- Kept approver option access under `department:update`, matching D-20 and avoiding any dependency on `user:list`.
- Used a route-local validation helper in `department.route.ts` because the default approver write path is currently limited to department create/update.
- Preserved the existing EMPLOYEE list permissions while avoiding any approval admin or task handling grants.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored backend dependencies from the lockfile**
- **Found during:** Task 1 verification
- **Issue:** `bun run build` could not resolve `elysia`, `@elysiajs/*`, and other backend dependencies because `backend/node_modules` was absent in this worktree.
- **Fix:** Ran `bun install --frozen-lockfile` in `backend` using the existing lockfile.
- **Files modified:** None tracked; dependencies are ignored.
- **Verification:** `bun run build` passed after dependency restore.
- **Committed in:** No tracked file changes; verification supported task commit `9f4aa96`.

**2. [Rule 3 - Blocking] Used the running Postgres container configuration for seed verification**
- **Found during:** Task 2 verification
- **Issue:** The assigned worktree has no `.env`, and the example/previous local database password did not match the running `oa-postgres` container.
- **Fix:** Inspected the running container environment and set `DATABASE_URL` for the verification process only, with credentials redacted from this summary.
- **Files modified:** None.
- **Verification:** RBAC seed test passed with 3 tests and 8 assertions, followed by a passing backend build.
- **Committed in:** No tracked file changes; verification supported task commit `b6eab0f`.

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both fixes were local verification-environment setup only. No implementation scope changed.

## Issues Encountered

- The exact no-env RBAC seed test failed with Prisma `DATABASE_URL` missing, as this worktree has no `.env`.
- A first local override failed because the database password in `.env.example` did not match the active `oa-postgres` container.
- Both were resolved without editing environment files or shared planning state.

## Verification

- `cd backend && bun run build` - passed after dependency restore for Task 1.
- `cd backend && bun test src/modules/role/__tests__/approval-permissions.seed.test.ts && bun run build` - passed with process-local `DATABASE_URL` from the running Postgres container.
- RBAC seed test result: 3 pass, 0 fail, 8 assertions.
- Task acceptance string checks for `defaultApproverId`, `defaultApprover`, `/approver-options`, `DEPARTMENT_APPROVER_INVALID`, approval seed exports, all 12 approval codes, and `import.meta.main` - passed.
- Stub scan on modified files found only legitimate empty-array initialization/null checks, not UI stubs or placeholders.

## Known Stubs

None.

## Threat Flags

None - new security-relevant surfaces were covered by the plan threat model and implemented with the planned `department:update` guard, active-user validation, and RBAC seed assignments.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required. Local test execution in this worktree needs a valid `DATABASE_URL`, but no project file was changed for it.

## Next Phase Readiness

Ready for Phase 16 Plan 08 frontend department approver UI and downstream approval application work. The backend department API and RBAC seed contracts expected by Wave 0 tests are now available.

## Self-Check: PASSED

- Confirmed created/modified files exist on disk.
- Confirmed task commits `9f4aa96` and `b6eab0f` exist in git history.
- Confirmed `.planning/STATE.md` and `.planning/ROADMAP.md` were not modified.

---
*Phase: 16-process-config-template-binding*
*Completed: 2026-04-25*
