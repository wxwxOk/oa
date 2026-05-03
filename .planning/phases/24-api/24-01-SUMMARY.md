---
phase: 24-api
plan: 1
subsystem: testing
tags: [bun, elysia, prisma, rbac, reimbursement, uploads]

requires:
  - phase: 23-stats
    provides: shipped fixed-module visit backend/frontend patterns
  - phase: 19-post-collection-processing-archive-export-stats
    provides: RBAC, export, append-only event and route contract patterns
provides:
  - Wave 0 reimbursement backend contract tests
  - Permission seed contracts for reimbursement create, own, list, review, attachment and export codes
  - Prisma schema contracts for reimbursement applications, attachments, actions, enums and query indexes
  - Route and file-safety contracts for reimbursement API, object authorization and attachment storage
affects: [24-api, 25-reimbursement-ui, 26-reimbursement-review, 27-reimbursement-export]

tech-stack:
  added: []
  patterns:
    - Bun backend contract tests import future reimbursement modules directly
    - Route schema tests assert strict writable fields and trusted-field rejection
    - File service tests pin MIME, size, count, safe-name, path traversal and header contracts

key-files:
  created:
    - backend/src/modules/role/__tests__/reimbursement-permissions.seed.test.ts
    - backend/src/modules/reimbursement/__tests__/reimbursement.schema.test.ts
    - backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts
    - backend/src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts
  modified:
    - .planning/phases/24-api/24-VALIDATION.md

key-decisions:
  - "Phase 24 Wave 0 tests intentionally fail until reimbursement seed, schema, route and file-service implementations are added."
  - "Reimbursement write contracts reject trusted identity/status/audit fields and require applicant attribution from currentUser.id."
  - "Attachment contracts require Bun/Web-file-oriented implementation without multer, formidable or busboy."

patterns-established:
  - "Reimbursement route contracts inspect exported schemas/helpers and route signatures before implementation."
  - "Reimbursement file contracts centralize MIME whitelist, generated filenames, path safety and response headers."

requirements-completed: []
requirements-progressed: [REIM-01, REIM-02, REIM-03, REIM-04, INV-01, INV-02, INV-03, INV-04, PERM-01, PERM-02, PERM-03, NFR-01, NFR-02]

duration: 20min
completed: 2026-05-03
---

# Phase 24 Plan 1: Backend Contract Tests Summary

**Backend Wave 0 contracts for reimbursement permissions, fixed Prisma models, API schema/auth boundaries and attachment file safety.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-03T01:03:56Z
- **Completed:** 2026-05-03T01:23:23Z
- **Tasks:** 4
- **Files modified:** 4 test files + planning updates

## Accomplishments

- Added reimbursement permission seed contracts for all seven `reimbursement:*` codes, ADMIN all-permission inheritance and EMPLOYEE create/own/attachment defaults.
- Added Prisma schema source contracts for `ReimbursementStatus`, `ReimbursementActionType`, `ReimbursementApplication`, `ReimbursementAttachment`, `ReimbursementAction`, Decimal amount and query indexes.
- Added route contracts for `/reimbursements` list/detail/create/edit/submit and attachment endpoints, strict write body fields, pagination filters, serializers, route guards and object authorization helpers.
- Added attachment file-service contracts for MIME whitelist, 10MB file size, 20-file cap, generated stored names, traversal rejection, preview/download headers and dependency exclusions.

## Task Commits

No git commits were created in this execution session. The workspace already contained unrelated uncommitted changes, and `.planning/config.json` has `workflow.autoCommit: false`.

## Files Created/Modified

- `backend/src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` - Reimbursement permission constants, module grouping, ADMIN inheritance and EMPLOYEE baseline contracts.
- `backend/src/modules/reimbursement/__tests__/reimbursement.schema.test.ts` - Prisma source contracts for reimbursement enums, application fields, attachment metadata, action trail and indexes.
- `backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts` - Future route module, schema, serializer, route signature, guard and object-auth contracts.
- `backend/src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts` - Future attachment service constants, safe filename/path, MIME/size/count and response header contracts.
- `.planning/phases/24-api/24-VALIDATION.md` - Wave 0 file-existence and expected-red status updated.

## Decisions Made

- Kept Wave 0 tests strict and direct-importing future exports so implementation plans cannot silently drift from the locked Phase 24 contract.
- Kept reimbursement as a fixed business module contract: explicit Prisma columns, explicit route schemas and explicit object-level authorization helpers instead of generic JSON payload writes.
- Kept upload contracts dependency-light and aligned to Bun/Web file APIs; heavyweight multipart dependencies remain disallowed unless a later implementation proves they are necessary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Future-proofed seed test cleanup for reimbursement tables**
- **Found during:** Task 1 (Add reimbursement permission seed contracts)
- **Issue:** Once Phase 24 schema models exist, reimbursement rows may reference users/roles/departments during DB-backed seed tests.
- **Fix:** Added optional cleanup calls for future reimbursement Prisma delegates before existing approval/form/user cleanup.
- **Files modified:** `backend/src/modules/role/__tests__/reimbursement-permissions.seed.test.ts`
- **Verification:** Lints clean; focused Wave 0 test run reaches expected missing-implementation failures.
- **Committed in:** Not committed

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The cleanup addition is scoped to test setup only and does not expand Phase 24 behavior.

## Issues Encountered

- Focused Bun tests are expected to fail in Wave 0 because reimbursement implementation files and schema exports do not exist yet.
- Final focused run failures were from missing `reimbursement.route`, missing `reimbursement-file.service`, and missing reimbursement Prisma enums/models. Earlier seed focused run also failed on the intentionally missing `REIMBURSEMENT_PERMISSION_CODES` export.
- The local shell could not resolve `rg` as an executable in PowerShell, so acceptance checks were verified with the dedicated `rg` tool instead.

## Verification

- File existence checks for all four Wave 0 test files: passed.
- Acceptance `rg` checks for permission codes, schema contracts, route/schema/object-auth contracts and file-safety contracts: passed.
- IDE lints for the four created test files: no diagnostics.
- Focused Bun command run:
  - `cd backend && bun test src/modules/role/__tests__/reimbursement-permissions.seed.test.ts src/modules/reimbursement/__tests__/reimbursement.schema.test.ts src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts`
  - Result: expected red from missing future implementation exports/models.

## User Setup Required

None for contract scaffolding. A working PostgreSQL database will be needed when implementation plans make the DB-backed seed and service tests green.

## Next Phase Readiness

Phase 24 is not complete. The Wave 0 contracts are ready, and the phase needs follow-up implementation planning for schema/migration/seed/storage, application API/service and attachment API/service before phase-level completion.

## Self-Check: PASSED

- Verified all four planned test files exist.
- Verified the focused contract suite is red for the intended missing implementation reasons.
- Verified no task commits were expected or created in this session.

---
*Phase: 24-api*
*Completed: 2026-05-03*
