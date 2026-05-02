---
phase: 16-process-config-template-binding
plan: 05
subsystem: backend-template-public-api
tags: [template-binding, public-collection, required-validation, approval, rbac]
requires:
  - phase: 16-process-config-template-binding
    provides: Template business mode/process binding schema, process validation service, approval RBAC seed, and Wave 0 backend test contracts
provides:
  - Backend required-field validator for schema v2 form submissions
  - Public fill route safeguards for collection-only templates
  - Template business mode and approval process binding API behavior
  - Approval publish/share-link/schema-version safety checks
affects: [phase-16-plan-06, phase-16-plan-07, phase-17, public-collection, approval-submission]
tech-stack:
  added: []
  patterns: [shared-template-route-helpers, backend-required-field-validation, approval-binding-permission-check]
key-files:
  created:
    - .planning/phases/16-process-config-template-binding/16-05-SUMMARY.md
  modified:
    - backend/src/modules/template/schema.validation.ts
    - backend/src/modules/public/public.route.ts
    - backend/src/modules/template/template.route.ts
key-decisions:
  - "Public share links remain collection-only: approval-required templates return TEMPLATE_OFFLINE semantics from public routes and cannot generate new share links."
  - "Template binding changes are handled by the existing template route and require approval:template:bind when a route currentUser is present."
  - "Only changed schema JSON on published templates increments schemaVersion; business mode and process binding changes do not."
patterns-established:
  - "Exported template route helpers keep route behavior and backend tests on the same business-rule path."
  - "Required form-data validation flattens row and group fields while intentionally skipping dynamic-table columns."
requirements-completed: [CFG-01, CFG-05, DYN-01, DYN-02]
duration: 12 min
completed: 2026-04-25
---

# Phase 16 Plan 05: Template Binding Backend Summary

**Template approval binding guards and backend required-field validation that preserve public collection semantics**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-25T11:34:29Z
- **Completed:** 2026-04-25T11:46:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `validateFormDataRequiredFields()` to enforce required text, textarea, date, phone, radio, checkbox, and signature fields on the backend.
- Updated public fill GET/submit routes to serve only published `COLLECTION_ONLY` templates and reject approval-required templates with `410 TEMPLATE_OFFLINE`.
- Extended template list/detail/update/status/share behavior with `businessMode`, `approvalProcessId`, `approvalProcess`, approval publish validation, binding permission checks, share-link blocking, and schema-version rules.
- Preserved server-side `schemaVersion` snapshots for public submissions and prevented client-provided schema version influence.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add backend required-field validator and public route enforcement** - `c8f01b1` (feat)
2. **Task 2: Extend template route with business mode and approval process binding** - `0e14a86` (feat)

## Files Created/Modified

- `backend/src/modules/template/schema.validation.ts` - Adds required-field form-data validation and loosens group/dynamic-table `id` validation for existing schema compatibility.
- `backend/src/modules/public/public.route.ts` - Imports required-field validation, selects `businessMode`, blocks approval-required public links, and validates data before `Submission` creation.
- `backend/src/modules/template/template.route.ts` - Adds exported template helpers, business mode/process binding fields, publish validation, disconnect confirmation, share-link guard, and `approval:template:bind` checks.
- `.planning/phases/16-process-config-template-binding/16-05-SUMMARY.md` - Execution summary for this plan.

## Decisions Made

- Kept template approval binding in the existing template route family instead of creating separate approval-template routes.
- Used a route-level manual permission check for binding changes so users still need normal form edit access plus `approval:template:bind` or ADMIN role.
- Wrapped publish/process validation failures for approval-required templates with `请选择启用且有效的审批流程`, matching the route contract and tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored backend dependencies from the pinned lockfile**
- **Found during:** Task 1 verification
- **Issue:** Initial schema validation test failed before running because `@sinclair/typebox/value` was unavailable in this isolated worktree.
- **Fix:** Ran `bun install --frozen-lockfile` in `backend`.
- **Files modified:** None tracked; dependency folders are ignored.
- **Verification:** Schema validation tests loaded and passed afterward.
- **Committed in:** No tracked commit required.

**2. [Rule 1 - Bug] Aligned backend schema validation with Wave 0 schema tests**
- **Found during:** Task 1 verification
- **Issue:** `SchemaV2Body` rejected group and dynamic-table payloads without `id`, while the Phase 16 Wave 0 tests define those as accepted shapes.
- **Fix:** Made `id` optional for backend group and dynamic-table TypeBox validation.
- **Files modified:** `backend/src/modules/template/schema.validation.ts`
- **Verification:** `bun test src/modules/template/__tests__/schema.validation.test.ts` passed with 15 tests.
- **Committed in:** `c8f01b1`

**3. [Rule 3 - Blocking] Used process-local Docker PostgreSQL configuration for DB-backed tests**
- **Found during:** Task 2 verification
- **Issue:** The assigned worktree has no `.env`, so Prisma-backed template tests need a `DATABASE_URL`.
- **Fix:** Read the running `oa-postgres` container configuration and set `DATABASE_URL` only for the verification process.
- **Files modified:** None.
- **Verification:** Combined template approval-mode/schema validation test command passed with 22 tests, followed by a passing backend build.
- **Committed in:** No tracked commit required.

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking).
**Impact on plan:** All fixes were necessary for compatibility or local verification. Product scope stayed within Plan 16-05.

## Issues Encountered

- No authentication gates occurred.
- The exact worktree lacks a root/backend `.env`; DB-backed verification succeeded with a process-local `DATABASE_URL` derived from the running Docker PostgreSQL container.

## Verification

- `cd backend && bun test src/modules/template/__tests__/schema.validation.test.ts` - passed, 15 tests.
- `cd backend && bun run build` - passed after Task 1.
- `cd backend && bun test src/modules/template/__tests__/template.approval-mode.test.ts src/modules/template/__tests__/schema.validation.test.ts && bun run build` - passed with process-local `DATABASE_URL`, 22 tests and backend build.
- Task 1 acceptance string checks for `validateFormDataRequiredFields`, `FORM_REQUIRED_FIELD_MISSING`, `^1\\d{10}$`, `dynamic-table`, `businessMode`, `COLLECTION_ONLY`, and `TEMPLATE_OFFLINE` - passed.
- Task 2 acceptance string checks for `businessMode`, `approvalProcessId`, `approvalProcess`, `disconnectPublicCollection`, `approval:template:bind`, `PUBLIC_COLLECTION_DISCONNECT_REQUIRED`, `APPROVAL_TEMPLATE_SHARE_DISABLED`, `请选择启用且有效的审批流程`, and `validateProcessDefinition` - passed.

## Known Stubs

None. Stub-pattern scan only matched legitimate schema property names, null checks, and local object/array initializers in backend code.

## Threat Flags

None. The public submission, publish, share-link, and approval binding surfaces were included in the plan threat model and mitigated by the implemented guards.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 16 Plan 06 and Plan 07. Frontend work can consume `businessMode`, `approvalProcessId`, and `approvalProcess` from template list/detail responses, and can pass `disconnectPublicCollection` when confirming a published public collection disconnect.

---
*Phase: 16-process-config-template-binding*
*Completed: 2026-04-25*

## Self-Check: PASSED

- Confirmed all created/modified files exist on disk.
- Confirmed task commits `c8f01b1` and `0e14a86` exist in git history.
- Confirmed `.planning/STATE.md` and `.planning/ROADMAP.md` were not modified.
