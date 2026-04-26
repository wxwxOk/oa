---
phase: 19-post-collection-processing-archive-export-stats
plan: 7
subsystem: api
tags: [elysia, prisma, exceljs, approval, archive, stats]

requires:
  - phase: 19-01
    provides: Phase 19 archive/export/stats Wave 0 backend contract tests
  - phase: 19-03
    provides: ArchiveRecordMeta and ArchiveEvent Prisma models for operational archive state
  - phase: 19-05
    provides: Archive list/detail service, filters, actor visibility, processing data, and route module baseline
provides:
  - ExcelJS archive export workbook generation with 2,000 row cap and spreadsheet formula sanitization
  - Archive statistics aggregation by template, status, department, month, and source type
  - Permission-gated /approval/archive/export and /approval/archive/stats backend routes
affects: [approval-archive, archive-export, archive-stats, phase-19-frontend-archive]

tech-stack:
  added: []
  patterns:
    - Export services use archive list filters plus actor visibility before generating XLSX data
    - Spreadsheet-bound strings are sanitized before insertion into ExcelJS rows
    - Archive stats aggregate normalized approval and collection records after source-specific visibility checks

key-files:
  created:
    - backend/src/modules/approval/archive-export.service.ts
    - backend/src/modules/approval/archive-stats.service.ts
  modified:
    - backend/src/modules/approval/archive.route.ts
    - backend/src/modules/approval/__tests__/archive.route.test.ts
    - backend/src/modules/approval/__tests__/archive-stats.test.ts

key-decisions:
  - "Excel export enforces the locked Phase 19 cap of 2,000 rows before workbook generation."
  - "Export reuses archive list filters and actor visibility, then loads archive detail data only when list rows lack effective/processing fields."
  - "Archive stats require approval:archive:stats and separately apply approval application visibility plus form submission list visibility."

patterns-established:
  - "Excel export returns an ExcelJS Workbook from service code; route code owns XLSX response headers and buffer serialization."
  - "Archive stats normalize approval rows and collection rows into a service-side aggregate record before producing frontend-ready datasets."

requirements-completed: [OPS-05, OPS-06]

duration: 9min
completed: 2026-04-26
---

# Phase 19 Plan 7: Archive Export and Stats Summary

**ExcelJS archive list export with formula sanitization and 2,000-row cap, plus visibility-scoped archive statistics APIs**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-26T08:05:27Z
- **Completed:** 2026-04-26T08:14:02Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added archive Excel export service with `MAX_ARCHIVE_EXPORT_ROWS = 2000`, formula-leading string sanitization, metadata columns, processing fields, and flattened form values.
- Added archive stats service returning `byTemplate`, `byStatus`, `byDepartment`, `byMonth`, and `bySourceType` datasets while excluding `DRAFT` approvals and mapping collection rows to `COLLECTED`.
- Added `/approval/archive/export` and `/approval/archive/stats` routes with `approval:export` and `approval:archive:stats` guards, query-only filters, and XLSX response headers.

## Task Commits

1. **Task 1: Add Excel export service** - `c34eb1a` (feat)
2. **Task 2: Add archive statistics service** - `f8859d4` (feat)
3. **Task 3: Add export and stats routes** - `58a7305` (feat)

## Files Created/Modified

- `backend/src/modules/approval/archive-export.service.ts` - ExcelJS workbook generation, formula cell sanitization, export row cap enforcement, and archive-detail enrichment for exported rows.
- `backend/src/modules/approval/archive-stats.service.ts` - Visibility-scoped archive aggregation for template/status/department/month/source-type datasets.
- `backend/src/modules/approval/archive.route.ts` - Adds permission-gated export and stats routes under `/approval/archive`.
- `backend/src/modules/approval/__tests__/archive.route.test.ts` - Adds route registration contract coverage for `/export` and `/stats`.
- `backend/src/modules/approval/__tests__/archive-stats.test.ts` - Adds missing cleanup for approval process and notification fixture data.

## Decisions Made

- Export rows use archive list filters with `size = MAX_ARCHIVE_EXPORT_ROWS + 1` so the service can detect over-limit result sets before workbook generation.
- Full audit history remains omitted from list export; details remain the source for event/correction history.
- Stats aggregate approval and collection rows after source-specific visibility checks instead of exposing raw cross-source counts directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Verification] Hardened stats test fixture cleanup**
- **Found during:** Task 2 (Add archive statistics service)
- **Issue:** `archive-stats.test.ts` failed before service assertions because existing `ApprovalProcess` rows referenced users and blocked `prisma.user.deleteMany()`.
- **Fix:** Added `userNotification`, `approvalProcessNode`, and `approvalProcess` cleanup to the stats fixture, matching established approval test cleanup order.
- **Files modified:** `backend/src/modules/approval/__tests__/archive-stats.test.ts`
- **Verification:** `cd backend && bun test src/modules/approval/__tests__/archive-stats.test.ts` passed with 2 tests.
- **Committed in:** `f8859d4`

**2. [Rule 2 - Missing Critical Verification] Added route contract coverage for export/stats endpoints**
- **Found during:** Task 3 (Add export and stats routes)
- **Issue:** The route/export/stats suite passed before route implementation because no test asserted `/approval/archive/export` or `/approval/archive/stats` registration.
- **Fix:** Added a RED route-signature assertion, confirmed it failed, then implemented the routes.
- **Files modified:** `backend/src/modules/approval/__tests__/archive.route.test.ts`, `backend/src/modules/approval/archive.route.ts`
- **Verification:** `cd backend && bun test src/modules/approval/__tests__/archive.route.test.ts src/modules/approval/__tests__/archive-export.test.ts src/modules/approval/__tests__/archive-stats.test.ts` passed with 12 tests.
- **Committed in:** `58a7305`

---

**Total deviations:** 2 auto-fixed (1 blocking verification, 1 missing critical verification)
**Impact on plan:** Verification was strengthened without expanding user-facing scope beyond OPS-05 and OPS-06.

## Issues Encountered

- Task 2 initially hit a pre-existing fixture cleanup blocker; fixed in the targeted stats test file.
- Task 3 RED gate initially passed unexpectedly; fixed by adding endpoint registration assertions before implementation.
- No authentication gates or external setup blockers occurred.

## Verification

- `cd backend && bun test src/modules/approval/__tests__/archive-export.test.ts` - passed, 4 tests.
- `cd backend && bun test src/modules/approval/__tests__/archive-stats.test.ts` - passed, 2 tests.
- `cd backend && bun test src/modules/approval/__tests__/archive.route.test.ts src/modules/approval/__tests__/archive-export.test.ts src/modules/approval/__tests__/archive-stats.test.ts` - passed, 12 tests.
- `cd backend && bun run build` - passed, bundled `src/index.ts`.
- Acceptance `rg` checks for export controls, audit-history omission, stats datasets, DRAFT exclusion, route permissions, XLSX headers, and export filename pattern all passed.

## Known Stubs

None - stub scan found no placeholder/TODO/FIXME text. Empty default objects/arrays and null checks in services are implementation guards, not UI/data stubs.

## Threat Flags

None - the new export/stats routes, archive data to spreadsheet boundary, source visibility, formula sanitization, and export DoS cap are explicitly covered by this plan's threat model.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

OPS-05 and OPS-06 backend capabilities are ready for the remaining Phase 19 frontend/export/statistics integration plans. Export and stats endpoints are route-gated, filter-compatible with archive list semantics, and covered by focused backend tests.

## Self-Check: PASSED

- Verified all created/modified plan files exist.
- Verified task commits exist: `c34eb1a`, `f8859d4`, `58a7305`.

---
*Phase: 19-post-collection-processing-archive-export-stats*
*Completed: 2026-04-26*
