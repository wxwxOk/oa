---
phase: 16-process-config-template-binding
plan: 09
subsystem: approval-process-config
gap_closure: true
tags: [approval-process, template-binding, regression-test]
requires:
  - phase: 16-process-config-template-binding
    provides: Approval process configuration API and published-template binding guard from Plan 16-03
provides:
  - Full-update deactivation guard for published approval-template bindings
  - Regression test for PUT-style bound-process deactivation
affects: [phase-16-verification, phase-17-approval-submission]
tech-stack:
  added: []
  patterns: [published-template-binding-guard]
key-files:
  created:
    - .planning/phases/16-process-config-template-binding/16-09-SUMMARY.md
  modified:
    - backend/src/modules/approval/process.route.ts
    - backend/src/modules/approval/__tests__/process-config.service.test.ts
key-decisions:
  - "The full process update path now uses the same bound published approval-template guard as status disable and delete."
  - "The guard only applies to active -> inactive transitions so normal edits and inactive draft updates remain allowed."
patterns-established:
  - "Any process deactivation path must call `assertNotBoundByPublishedApprovalTemplate` before mutating process state."
requirements-completed: [CFG-02, CFG-03]
duration: 7 min
completed: 2026-04-25
---

# Phase 16 Plan 09: Approval Process Gap Closure Summary

**Closed the verifier gap that allowed full process edit to deactivate a process bound by a published approval template.**

## Performance

- **Duration:** 7 min
- **Completed:** 2026-04-25
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added the missing guard in `updateApprovalProcessConfig` before it writes `isActive: false`.
- Scoped the guard to `existing.isActive && input.isActive === false`, preserving active edits and inactive draft updates.
- Added regression coverage proving a full update cannot deactivate a process referenced by a published `APPROVAL_REQUIRED` template.
- Confirmed the rejected update leaves the previous process name, description, active state, and ordered node rows unchanged.

## Task Commits

1. **Plan artifact:** `c405ca5` - `docs(16-09): plan approval process gap closure`
2. **Implementation and regression:** `2f45ca2` - `fix(16-09): guard bound process deactivation on full update`

## Files Created/Modified

- `backend/src/modules/approval/process.route.ts` - Adds the full-update active-to-inactive binding guard.
- `backend/src/modules/approval/__tests__/process-config.service.test.ts` - Adds the published-template full-update deactivation regression test.
- `.planning/phases/16-process-config-template-binding/16-09-SUMMARY.md` - Execution summary for the gap-closure plan.

## Verification

- `cd backend && bun test src/modules/approval/__tests__/process-config.service.test.ts` - 15 pass.
- Phase 16 backend target set:
  - `process-config.service.test.ts` - 15 pass.
  - `template.approval-mode.test.ts` - 7 pass.
  - `schema.validation.test.ts` - 15 pass.
  - `approval-permissions.seed.test.ts` - 3 pass.
- Phase 15 regression set:
  - `application.service.test.ts` - 10 pass.
  - `state-machine.test.ts` - 6 pass.
- `cd backend && bun run build` - passed.
- `cd frontend && bun run build` - passed.
- `cd backend && bunx prisma validate` - passed.
- `cd backend && bunx prisma generate` - passed.
- `node $HOME/.codex/get-shit-done/bin/gsd-tools.cjs verify schema-drift 16` - `drift_detected: false`.

## Known Stubs

None.

## Threat Flags

None. This closes an elevation/data-integrity gap by aligning all process deactivation paths with the same published-template binding guard.

## User Setup Required

None.

## Next Phase Readiness

Ready for Phase 16 re-verification. The previously failed must-have should now pass: disabling a process bound by published `APPROVAL_REQUIRED` templates is blocked across status, delete, and full update paths.

## Self-Check: PASSED

- Confirmed the guard is present in the full update helper before state mutation.
- Confirmed regression test fails the dangerous operation and checks unchanged persisted data.
- Confirmed targeted tests, regression tests, backend build, frontend build, Prisma checks, and schema drift check all pass.

---
*Phase: 16-process-config-template-binding*
*Completed: 2026-04-25*
