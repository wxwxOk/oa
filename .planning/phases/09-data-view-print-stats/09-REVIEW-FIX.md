---
phase: 09-data-view-print-stats
fixed_at: 2026-04-20T12:30:00Z
review_path: .planning/phases/09-data-view-print-stats/09-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-04-20T12:30:00Z
**Source review:** .planning/phases/09-data-view-print-stats/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Non-null assertion on canvas getContext may crash

**Files modified:** `frontend/src/composables/usePdfExport.ts`
**Commit:** 5ca7958
**Applied fix:** Replaced `getContext('2d')!` non-null assertions at lines 40 and 108 with proper null checks that throw a descriptive error when the browser exhausts canvas resources.

### WR-01: Redundant fetchDetail call on SubmissionPage mount

**Files modified:** `backend/src/modules/submission/submission.route.ts`, `frontend/src/pages/SubmissionPage.vue`
**Commit:** 0abbaae
**Applied fix:** Added `template: { select: { name: true } }` to the list endpoint's include, then replaced the extra `fetchDetail` call on mount with reading `template.name` directly from the first list row.

### WR-02: Batch export renderFn assumes #print-area exists

**Files modified:** `frontend/src/pages/SubmissionPage.vue`
**Commit:** d94b58c
**Applied fix:** Replaced `document.getElementById('print-area')!` with a null-checked version that throws a descriptive error if the element is missing.

### WR-03: SubmissionDetail schema access without null check

**Files modified:** `frontend/src/components/submission/SubmissionDetail.vue`
**Commit:** ae2ef76
**Applied fix:** Changed `schema` cast from `as any[]` to `as any[] | null` and replaced `schema?.find(...)` with an explicit `Array.isArray(schema)` guard in the `signatureField` computed.

### WR-04: form-stats route missing pagination

**Files modified:** `backend/src/modules/form-stats/form-stats.route.ts`
**Commit:** 923b2eb
**Applied fix:** Added a `limit` query parameter (default 100, max 500) and sorted results by `submissionCount` descending before slicing.

### WR-05: submission.route.ts missing templateId ownership validation

**Files modified:** `backend/src/modules/submission/submission.route.ts`
**Commit:** ab76f62
**Applied fix:** Added a check after fetching the submission that verifies `submission.templateId` matches the URL's `params.templateId`, throwing 404 if mismatched.

---

_Fixed: 2026-04-20T12:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
