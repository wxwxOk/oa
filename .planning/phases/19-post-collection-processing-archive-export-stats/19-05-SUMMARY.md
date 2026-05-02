---
phase: 19-post-collection-processing-archive-export-stats
plan: 5
subsystem: api
tags: [approval, archive, prisma, elysia, audit]

requires:
  - phase: 19-01
    provides: Archive metadata Prisma models and Wave 0 archive tests
  - phase: 19-03
    provides: Approval permission and route guard compatibility
provides:
  - Template processing field configuration persistence
  - Approval and collection archive read/action service layer
  - /approval/archive backend route module
  - Authorized approval task detail archive metadata serialization
affects: [approval, template, archive, task-detail, applicant-visibility]

tech-stack:
  added: []
  patterns:
    - Query/service aggregation over ApprovalApplication and Submission
    - ArchiveRecordMeta current state plus ArchiveEvent append-only audit
    - Strict TypeBox operation schemas with actor/source fields derived server-side

key-files:
  created:
    - backend/src/modules/approval/archive.service.ts
    - backend/src/modules/approval/archive.route.ts
  modified:
    - backend/src/modules/template/template.route.ts
    - backend/src/modules/template/__tests__/template.approval-mode.test.ts
    - backend/src/modules/approval/archive.service.ts
    - backend/src/modules/approval/archive.route.ts
    - backend/src/modules/approval/task.service.ts
    - backend/src/modules/approval/task.route.ts
    - backend/src/modules/approval/__tests__/archive.service.test.ts
    - backend/src/modules/approval/__tests__/task.service.test.ts
    - backend/src/index.ts

key-decisions:
  - "Processing field config is stored on FormTemplate.processingSchema and never participates in formal schemaVersion bumps."
  - "Archive operations store tags, notes, processing values, and correction overlays in ArchiveRecordMeta/ArchiveEvent instead of formal submitted JSON."
  - "Approval archive notes, marks, and edits also append INTERNAL approval timeline events for authorized approver context."

patterns-established:
  - "ArchiveActor derives identity, role codes, and permissions from auth context; routes never accept trusted actor/source fields from bodies."
  - "Approval task detail may expose an archive object for assigned approvers while applicant own-detail remains filtered by its existing service."

requirements-completed: [OPS-01, OPS-02, OPS-03, OPS-04]

duration: 17 min
completed: 2026-04-26
---

# Phase 19 Plan 5: Archive Operations Backend Summary

**Approval and collection archive operations with processing fields, controlled corrections, strict routes, and internal task-detail metadata**

## Performance

- **Duration:** 17 min
- **Started:** 2026-04-26T07:28:20Z
- **Completed:** 2026-04-26T07:45:06Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added backend support for template `processingSchema` with lightweight field validation and no formal schema version bump.
- Implemented archive service aggregation over approval applications and public submissions with source-specific permissions.
- Added tags, internal notes, processing data, and controlled correction overlays with append-only archive events.
- Exposed `/approval/archive` routes with strict operation payload schemas and mark/edit permission gates.
- Extended assigned approval task detail with authorized archive tags and internal notes/events while preserving applicant own-detail filtering.

## Task Commits

1. **Task 1: Add template processing-field backend support** - `f3149ea` (feat)
2. **Task 2: Implement archive service read/actions** - `7b04dc8` (feat)
3. **Task 3: Expose archive routes and authorized task-detail metadata** - `bbc0b6e` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `backend/src/modules/approval/archive.service.ts` - Archive list/detail/action service for approval and collection sources.
- `backend/src/modules/approval/archive.route.ts` - `/approval/archive` Elysia module, schemas, serializers, and action guards.
- `backend/src/modules/template/template.route.ts` - Processing field schema validation and persistence.
- `backend/src/modules/approval/task.service.ts` - Assigned task detail archive metadata loading and serialization.
- `backend/src/modules/approval/task.route.ts` - Route serializer support for task-detail archive metadata.
- `backend/src/index.ts` - Registered `approvalArchiveModule` under `/api/v1`.
- `backend/src/modules/template/__tests__/template.approval-mode.test.ts` - OPS-03 processing schema regression coverage.
- `backend/src/modules/approval/__tests__/archive.service.test.ts` - Cleanup fix for robust archive service verification.
- `backend/src/modules/approval/__tests__/task.service.test.ts` - Task-detail archive metadata regression coverage.

## Decisions Made

- Processing config changes are operational metadata, so `processingSchema` is normalized and persisted without changing formal `schemaVersion`.
- Archive read/actions remain a service-layer aggregation over `ApprovalApplication` and `Submission`; no unified parent archive table was introduced.
- Controlled corrections store current overlays plus field-level history in `ArchiveRecordMeta.correctionData`, leaving `ApprovalApplication.formData` and `Submission.data` unchanged.
- Approval source archive notes/marks/edits append `payload.visibility = 'INTERNAL'` approval events for approver context.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed archive service test cleanup dependency order**
- **Found during:** Task 2 (Implement archive service read/actions)
- **Issue:** Running focused template tests before archive service tests left `ApprovalProcess` rows, and `archive.service.test.ts` deleted users before approval processes, causing a foreign-key failure.
- **Fix:** Added `approvalProcessNode.deleteMany()` and `approvalProcess.deleteMany()` to the archive service fixture cleanup before user deletion.
- **Files modified:** `backend/src/modules/approval/__tests__/archive.service.test.ts`
- **Verification:** `cd backend; bun test src/modules/approval/__tests__/archive.service.test.ts src/modules/approval/__tests__/application-submission.service.test.ts`
- **Committed in:** `7b04dc8`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Verification cleanup is now robust across focused test ordering. No production behavior or architecture changed outside plan scope.

## Verification Results

- `cd backend; bun test src/modules/template/__tests__/template.approval-mode.test.ts` - PASS, 9 tests.
- `cd backend; bun test src/modules/approval/__tests__/archive.service.test.ts src/modules/approval/__tests__/application-submission.service.test.ts` - PASS, 10 tests.
- `cd backend; bun test src/modules/approval/__tests__/archive.route.test.ts src/modules/approval/__tests__/task.service.test.ts src/modules/approval/__tests__/application-submission.service.test.ts` - PASS, 17 tests.
- `cd backend; bun test src/modules/template/__tests__/template.approval-mode.test.ts src/modules/approval/__tests__/archive.service.test.ts src/modules/approval/__tests__/archive.route.test.ts src/modules/approval/__tests__/task.service.test.ts src/modules/approval/__tests__/application-submission.service.test.ts; if ($LASTEXITCODE -eq 0) { bun run build }` - PASS, 30 tests and backend build.
- Acceptance grep checks for processing schema, archive service exports, audit hooks, strict route schemas, route registration, and task archive serialization all passed.
- Negative grep `rg "formData.*update|data.*update" backend/src/modules/approval/archive.service.ts` returned no matches.

## Known Stubs

None - stub scan only found normal null/object guards and `placeholder` field names used by the processing field contract.

## Issues Encountered

None beyond the auto-fixed fixture cleanup noted above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 19-06. Archive read/actions, route contracts, and internal metadata visibility are in place for downstream export, statistics, and notification work.

## Self-Check: PASSED

- Created files exist: `backend/src/modules/approval/archive.service.ts`, `backend/src/modules/approval/archive.route.ts`, and this SUMMARY.
- Task commits exist: `f3149ea`, `7b04dc8`, `bbc0b6e`.
- Only unrelated pre-existing dirty file remains outside this plan: `.planning/config.json`.

---
*Phase: 19-post-collection-processing-archive-export-stats*
*Completed: 2026-04-26*
