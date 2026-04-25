---
phase: 16-process-config-template-binding
plan: 03
subsystem: backend
tags: [approval, process-config, elysia, prisma, rbac]
requires:
  - phase: 15-approval-data-model-state-machine
    provides: Approval process models and runtime snapshot contracts
  - phase: 16-process-config-template-binding
    provides: Template process binding schema and department default approver relation
provides:
  - Approval process structural and active-runtime validation helpers
  - Concrete process snapshot resolution for fixed-user, role, and department-manager sources
  - Guarded approval process configuration REST API under authenticated `/api/v1`
  - Transaction rollback tests for invalid process create/update
affects: [phase-16-plan-04, phase-16-plan-05, phase-16-plan-06, phase-17]
tech-stack:
  added: []
  patterns: [transactional-process-node-replacement, concrete-assignee-snapshot, permission-guarded-elysia-module]
key-files:
  created:
    - backend/src/modules/approval/process-config.service.ts
    - backend/src/modules/approval/process.route.ts
  modified:
    - backend/src/index.ts
    - backend/src/modules/approval/__tests__/process-config.service.test.ts
key-decisions:
  - "Process create/update routes validate proposed rows inside the same Prisma transaction before commit."
  - "Role approver source remains MVP-singleton: exactly one active user is required before save/runtime use."
  - "Route transaction helpers are exported for tests so rollback coverage exercises the same create/update path without constructing authenticated HTTP requests."
patterns-established:
  - "Structural validation allows inactive valid drafts; active-runtime validation adds the inactive-process guard."
  - "Process route responses expose read-only requiredActions as APPROVE/REJECT for each node."
requirements-completed: [CFG-02, CFG-03, CFG-04, DYN-02]
duration: 10 min
completed: 2026-04-25
---

# Phase 16 Plan 03: Approval Process Configuration Backend Summary

**Guarded approval process CRUD with transactional node validation and concrete approver snapshot resolution**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-25T11:17:46Z
- **Completed:** 2026-04-25T11:27:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added process validation helpers for node order, blank names, fixed active users, singleton active role users, department-manager node shape, and inactive runtime rejection.
- Added snapshot resolution returning `assigneeId`, `assigneeName`, and source labels for fixed-user, role, and department-manager nodes.
- Added authenticated `/api/v1/approval/processes` routes for list/detail/create/update/status/delete/validate with `approval:process:*` guards.
- Added rollback tests proving invalid create/update attempts do not commit partial process or node rows.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement process validation and approver snapshot resolution service** - `8e70cdf` (feat)
2. **Task 2: Add guarded approval process configuration routes** - `b30b5ee` (feat)

## Files Created/Modified

- `backend/src/modules/approval/process-config.service.ts` - Process structure/runtime validators and concrete approver snapshot helpers.
- `backend/src/modules/approval/process.route.ts` - Permission-guarded process configuration API with transactional node replacement.
- `backend/src/index.ts` - Registers `approvalProcessModule` under authenticated `/api/v1`.
- `backend/src/modules/approval/__tests__/process-config.service.test.ts` - Adds create/update rollback and inactive valid draft runtime rejection coverage.

## Decisions Made

- Exported route-level create/update helpers so tests cover the same Prisma transaction path used by HTTP handlers while avoiding unrelated JWT setup in service tests.
- Kept route node order strict rather than silently normalizing invalid submitted orders; invalid order gets the same business error code as service validation.
- Kept process validation and snapshot resolution free of approval application/task creation, preserving Phase 17 submission as the runtime integration point.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored backend dependencies from the pinned lockfile**
- **Found during:** Task 1 verification
- **Issue:** Initial `bun test` failed before running tests because `@prisma/client` was not installed in this isolated worktree.
- **Fix:** Ran `bun install --frozen-lockfile` in `backend`.
- **Files modified:** None tracked; dependencies are ignored.
- **Verification:** Process-config tests loaded Prisma Client successfully afterward.
- **Committed in:** No tracked commit required.

**2. [Rule 3 - Blocking] Used Docker PostgreSQL credentials for local verification**
- **Found during:** Task 1 verification
- **Issue:** This worktree has no `.env`, so Prisma had no `DATABASE_URL`; compose defaults did not match the running container password.
- **Fix:** Read the running `oa-postgres` container environment and passed a masked host-side `DATABASE_URL` only to verification commands.
- **Files modified:** None.
- **Verification:** Plan-level backend test/build command passed.
- **Committed in:** No tracked commit required.

**3. [Rule 1 - Bug] Fixed Bun assertion against PrismaPromise**
- **Found during:** Task 2 verification
- **Issue:** Bun's `.resolves` matcher rejected PrismaPromise in the rollback count assertions.
- **Fix:** Awaited the counts directly before asserting unchanged process/node totals.
- **Files modified:** `backend/src/modules/approval/__tests__/process-config.service.test.ts`
- **Verification:** Targeted process-config tests passed.
- **Committed in:** `b30b5ee`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking).
**Impact on plan:** All fixes were necessary for local verification or test correctness; no product scope changed.

## Issues Encountered

- The first test attempt failed due missing backend dependencies in the isolated worktree.
- The next test attempt failed due missing `DATABASE_URL`; verification succeeded with an ephemeral Docker-backed `DATABASE_URL`.
- No authentication gates occurred.

## Verification

- `cd backend && bun test src/modules/approval/__tests__/process-config.service.test.ts` - passed with 14 tests.
- `cd backend && bun run build` - passed.
- `cd backend && bun test src/modules/approval/__tests__/process-config.service.test.ts && bun run build` - passed as one chained plan-level command with `DATABASE_URL=postgresql://oa:***@127.0.0.1:5432/oa_db?schema=public`.
- Acceptance string checks for service exports, route guards, `$transaction`, binding-block error code, index registration, and rollback test names - passed.

## Known Stubs

None. Stub-pattern scan only matched intentional empty query/node initializers and null checks, not unimplemented UI/data placeholders.

## Threat Flags

None. The new approval process API and assignee-resolution trust boundaries were included in the plan threat model and mitigated with route guards plus structural/runtime validation.

## User Setup Required

None. Local verification requires the existing Docker PostgreSQL container or an equivalent `DATABASE_URL`; no tracked env file was created.

## Next Phase Readiness

Ready for Phase 16 Plan 04. The backend can now validate process definitions, expose guarded process CRUD, and provide concrete snapshots for later template publish and application submission paths.

## Self-Check: PASSED

- Confirmed created files exist: `process-config.service.ts`, `process.route.ts`, and the updated rollback test file.
- Confirmed task commits `8e70cdf` and `b30b5ee` exist in git history.
- Confirmed `.planning/STATE.md` and `.planning/ROADMAP.md` were not modified.

---
*Phase: 16-process-config-template-binding*
*Completed: 2026-04-25*
