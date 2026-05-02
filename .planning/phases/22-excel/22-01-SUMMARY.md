---
phase: 22-excel
plan: 1
subsystem: frontend-import-parser
tags: [vue, xlsx, visit, import]

requires:
  - phase: 20-api
    provides: JSON-only `/api/v1/visits/import` contract
  - phase: 21-crud
    provides: Visit frontend DTOs and date-only conventions
provides:
  - Fixed 15-column visit import contracts
  - Pure Excel row parser, validator and duplicate warning helpers
  - Focused parser/type contract tests
affects: [22-excel]

tech-stack:
  added: [xlsx]
  patterns: [SheetJS array rows, frontend parse/backend validate boundary, date-only normalization]

key-files:
  created:
    - frontend/src/components/visit/visitImport.ts
    - frontend/src/components/visit/__tests__/visitImport.test.ts
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/src/types/visit.ts
    - frontend/src/types/__tests__/visit.test.ts

key-decisions:
  - "Excel parsing stays frontend-only and produces standard VisitWritePayload rows."
  - "The parser ignores row 1, strictly validates row 2 headers, and parses data from row 3 onward."
  - "Potential duplicates are warnings keyed by name + receptionDate + consultant and never remove valid rows."

requirements-progressed: [IMPORT-01, IMPORT-02, IMPORT-03]

duration: same-session
completed: 2026-05-02
---

# Phase 22 Plan 1 Summary

**Excel import dependency, contracts and parser**

## Performance

- **Duration:** same session
- **Started:** 2026-05-02
- **Completed:** 2026-05-02
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Installed `xlsx` in the frontend package only.
- Added fixed import header constants plus preview, invalid-row, duplicate-warning, payload and response contracts.
- Created a pure visit import parser that ignores the title row, validates the 15-column header row and parses data rows.
- Normalized Excel serial dates, `YYYY-MM-DD` / `YYYY/MM/DD` strings and `Date` objects without timezone drift.
- Split valid and invalid rows, preserved Excel row numbers and generated duplicate warnings without auto-skipping or merging rows.
- Added focused tests for header mismatch, blank row skipping, row number preservation, date normalization and duplicate warnings.

## Task Commits

No git commits were created in this execution session.

## Files Created/Modified

- `frontend/package.json` - Added the frontend `xlsx` dependency.
- `frontend/package-lock.json` - Updated dependency lock metadata for `xlsx`.
- `frontend/src/types/visit.ts` - Added Phase 22 import headers and preview/import response contracts.
- `frontend/src/types/__tests__/visit.test.ts` - Pinned import contract constants and absence of extra payload-key helpers.
- `frontend/src/components/visit/visitImport.ts` - Added pure parser, validators, date normalization and duplicate-warning helpers.
- `frontend/src/components/visit/__tests__/visitImport.test.ts` - Added parser behavior coverage for the sample Excel shape.

## Decisions Made

- Kept parser output aligned with existing `VisitWritePayload` so the backend remains file-format agnostic.
- Treated duplicate detection as user-facing context only; valid rows stay valid and are still eligible for import.
- Kept dictionary/enum validation out of scope; backend still performs final row validation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Environment] Install dependency in frontend workspace only**
- **Found during:** Dependency installation
- **Issue:** An initial root-level `npm install xlsx` created accidental root npm metadata.
- **Fix:** Removed the accidental root npm files and installed `xlsx` under `frontend` with the existing dependency constraints.
- **Verification:** `cd frontend && npm ls xlsx` reported `xlsx@0.18.5`.
- **Committed in:** Not committed

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** No application behavior change; dependency scope now matches Phase 22.

## Issues Encountered

- The frontend package manager required legacy peer dependency resolution because the existing Quasar/Vite stack pins an older optional ESLint peer range.

## User Setup Required

- None.

## Next Phase Readiness

The parser and contracts are ready for the Phase 22 dialog/store integration to submit normalized valid rows through the existing JSON import endpoint.

---
*Phase: 22-excel*
*Completed: 2026-05-02*
