---
phase: 13-pdf
plan: 03
subsystem: pdf-export
tags: [jspdf, html2canvas, pagination, smart-break, header-footer]

requires:
  - phase: 13-01
    provides: "print-mode DOM with data-break attributes and data-thead markers"
  - phase: 13-02
    provides: "test contracts for findBestBreak, computePageSlices, injectHeaderFooter"
provides:
  - "Smart breakpoint-based PDF pagination (no row/group/table truncation)"
  - "Dynamic table header repeat on page breaks"
  - "Page header (form title) + footer (submit time + page N/M)"
  - "Canvas safety threshold check"
affects: [pdf-visual-verify]

tech-stack:
  added: []
  patterns: ["DOM coordinate breakpoint scanning", "canvas slice rendering with table header repeat"]

key-files:
  created: []
  modified:
    - frontend/src/composables/usePdfExport.ts

key-decisions:
  - "Merge remaining content into current page when remainder fits in one page height (avoids tiny trailing pages)"
  - "Batch export uses scale=1.5 and quality=0.9 for memory efficiency vs single export scale=2"

patterns-established:
  - "data-break attribute scanning: querySelectorAll('[data-break]') + getBoundingClientRect() for breakpoint collection"
  - "Page slice model: computePageSlices returns PageSlice[] with needsTableHeader flag for table header repeat"

requirements-completed: [PDF-01, PDF-02, PDF-03]

duration: 5min
completed: 2026-04-22
---

# Phase 13 Plan 03: Smart Pagination + Header/Footer Summary

**Rewrote usePdfExport.ts with DOM-coordinate breakpoint pagination, dynamic table header repeat, and per-page header/footer injection -- all 12 Plan 02 tests GREEN**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-22T01:05:26Z
- **Completed:** 2026-04-22T01:11:19Z
- **Tasks:** 1/2 (Task 2 is human-verify checkpoint)
- **Files modified:** 1

## Accomplishments

### Task 1: usePdfExport.ts Rewrite

Completely rewrote the PDF export composable with:

1. **collectBreakpoints()** -- scans `[data-break]` elements via getBoundingClientRect, handles row/group/table/table-row types
2. **findBestBreak()** -- binary-style search for best cut point at or before page bottom
3. **computePageSlices()** -- iterative page slicing with smart break selection, forced pixel-cut fallback with console.warn, table header repeat marking
4. **injectHeaderFooter()** -- per-page header (form title centered at y=8mm) and footer (submit time left + page N/M right at y=289mm)
5. **renderPageSlice()** -- canvas slice rendering with optional table header prepend
6. **exportToPdf()** -- single export with scale=2, reads data-form-title/data-submit-time from element
7. **exportBatchToPdf()** -- batch export with scale=1.5, quality=0.9, cancelRef support

### Task 2: PDF Visual Verification (CHECKPOINT)

This task requires human verification of the PDF output. The user needs to:
- Start dev server and navigate to a v2 template submission
- Export PDF and verify grid layout, grouping, dynamic tables, signatures, Chinese text, header/footer, pagination

## Key Files

- `frontend/src/composables/usePdfExport.ts` -- complete rewrite (352 lines added, 132 removed)

## Decisions Made

- Merged remaining content into current page when remainder fits in one page height, avoiding tiny trailing pages (discovered via failing test)
- Kept batch export at lower scale (1.5) and quality (0.9) vs single export (2, 0.95) for memory efficiency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed trailing micro-page in computePageSlices**
- **Found during:** Task 1 (test verification)
- **Issue:** When remaining content after a break was slightly larger than one page but the next break point created a tiny leftover slice, the algorithm produced 3 slices instead of expected 2
- **Fix:** Added check: if remaining content after best break fits in one page, extend current slice to totalHeight
- **Files modified:** frontend/src/composables/usePdfExport.ts
- **Committed in:** c432ae4

---

**Total deviations:** 1 auto-fixed (bug)
**Impact on plan:** Minor algorithm refinement, no scope change.

## Issues Encountered

None beyond the auto-fixed deviation.

## Verification Results

- All 12 Plan 02 tests pass GREEN (findBestBreak: 4, computePageSlices: 4, injectHeaderFooter: 4)
- Full test suite: 69 tests across 7 files all pass
- Task 2 (visual verification) pending human checkpoint

## Next Phase Readiness

- Code implementation complete, awaiting visual verification checkpoint
- PDF export ready for end-to-end testing once Plan 01 DOM changes are merged

## Self-Check: PASSED

- [x] frontend/src/composables/usePdfExport.ts exists
- [x] .planning/phases/13-pdf/13-03-SUMMARY.md exists
- [x] Commit c432ae4 exists

---
*Phase: 13-pdf*
*Completed: 2026-04-22*
