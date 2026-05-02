---
phase: 22
slug: excel
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-02
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest for frontend, Bun test for backend regression |
| **Config file** | `frontend/package.json`, backend Bun test runner |
| **Quick run command** | `cd frontend && npm run test -- src/components/visit/__tests__/visitImport.test.ts src/types/__tests__/visit.test.ts` |
| **Full suite command** | `cd frontend && npm run test -- src/components/visit/__tests__/visitImport.test.ts src/stores/__tests__/visit.test.ts src/pages/__tests__/VisitPage.test.ts src/types/__tests__/visit.test.ts && npm run build` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run test -- src/components/visit/__tests__/visitImport.test.ts src/types/__tests__/visit.test.ts`
- **After every plan wave:** Run `cd frontend && npm run test -- src/components/visit/__tests__/visitImport.test.ts src/stores/__tests__/visit.test.ts src/pages/__tests__/VisitPage.test.ts src/types/__tests__/visit.test.ts`
- **Before `$gsd-verify-work`:** Full frontend focused suite, frontend build and backend import regression must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 0 | IMPORT-01 | dependency | `cd frontend && npm ls xlsx` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 0 | IMPORT-01, IMPORT-02 | unit | `cd frontend && npm run test -- src/components/visit/__tests__/visitImport.test.ts src/types/__tests__/visit.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | IMPORT-04 | unit | `cd frontend && npm run test -- src/stores/__tests__/visit.test.ts` | ✅ | ⬜ pending |
| 22-02-02 | 02 | 1 | IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04 | source contract | `cd frontend && npm run test -- src/pages/__tests__/VisitPage.test.ts` | ✅ | ⬜ pending |
| 22-02-03 | 02 | 1 | IMPORT-04 | backend regression | `cd backend && bun test src/modules/visit/__tests__/visit-import.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/visit/__tests__/visitImport.test.ts` — parser tests for IMPORT-01, IMPORT-02 and IMPORT-03
- [ ] `frontend/src/components/visit/visitImport.ts` — pure parser helper under test
- [ ] `frontend/package.json` — `xlsx` dependency installed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real workbook preview readability | IMPORT-02, IMPORT-03 | Source tests can verify contracts but not visual density of real Excel previews | Open `/visits`, choose a sample `.xlsx`, verify valid/invalid/duplicate preview sections are readable on desktop and mobile widths |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-02
