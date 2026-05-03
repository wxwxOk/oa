---
phase: 27
slug: reimbursement-export-validation
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-03
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for reimbursement Excel export and v1.4 closeout.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test for backend, Vitest + Quasar/Vite for frontend |
| **Config file** | `backend/package.json`, `frontend/package.json` |
| **Quick run command** | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-export.service.test.ts; cd ../frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts` |
| **Full suite command** | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts src/modules/reimbursement/__tests__/reimbursement-export.service.test.ts && bun run build; cd ../frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts && bun run build` |
| **Estimated runtime** | ~120-240 seconds |

---

## Sampling Rate

- **After every task commit:** Run the focused command listed for that task.
- **After every plan wave:** Run the quick run command above.
- **Before `$gsd-verify-work`:** Run the full suite command above and complete UAT checklist evidence.
- **Max feedback latency:** 240 seconds for focused reimbursement checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 0 | EXPORT-01/EXPORT-02/EXPORT-03/PERM-02 | backend export service contract | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement-export.service.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 0 | EXPORT-01/PERM-01/PERM-02 | backend route contract | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.route.test.ts` | ✅ | ⬜ pending |
| 27-01-03 | 01 | 0 | EXPORT-01/PERM-02/UX-02 | frontend store/page contract | `cd frontend && bun test src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts` | ✅ | ⬜ pending |
| 27-02-01 | 02 | 1 | EXPORT-02/EXPORT-03 | workbook implementation | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement-export.service.test.ts` | ✅ after W0 | ⬜ pending |
| 27-02-02 | 02 | 1 | EXPORT-01/PERM-02 | export paging/filter implementation | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts src/modules/reimbursement/__tests__/reimbursement-export.service.test.ts` | ✅ after W0 | ⬜ pending |
| 27-02-03 | 02 | 1 | EXPORT-01/PERM-01/PERM-02/UX-02 | route/header implementation | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-export.service.test.ts && bun run build` | ✅ | ⬜ pending |
| 27-03-01 | 03 | 2 | EXPORT-01/UX-02 | frontend store implementation | `cd frontend && bun test src/stores/__tests__/reimbursement.test.ts` | ✅ | ⬜ pending |
| 27-03-02 | 03 | 2 | EXPORT-01/PERM-02/UX-02 | export toolbar UX | `cd frontend && bun test src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts` | ✅ | ⬜ pending |
| 27-03-03 | 03 | 2 | EXPORT-03/PERM-02/UX-02 | frontend build and negative scope | `cd frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts && bun run build` | ✅ | ⬜ pending |
| 27-04-01 | 04 | 3 | all Phase 27 IDs | final focused gate | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts src/modules/reimbursement/__tests__/reimbursement-export.service.test.ts && bun run build; cd ../frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts && bun run build` | ✅ | ⬜ pending |
| 27-04-02 | 04 | 3 | EXPORT-01/EXPORT-02/EXPORT-03/PERM-01/PERM-02/UX-02 | UAT and coverage docs | Manual evidence plus source review | ✅ docs | ⬜ pending |
| 27-04-03 | 04 | 3 | v1.4 closeout | archive/state docs | Source review | ✅ docs | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/modules/reimbursement/__tests__/reimbursement-export.service.test.ts` — pins export cap, formula sanitization, fixed headers, review-result derivation and filter paging.
- [ ] `backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts` — pins `/export` route order, `authGuard('reimbursement:export')`, XLSX headers and list query schema reuse.
- [ ] `frontend/src/stores/__tests__/reimbursement.test.ts` — pins `exportLoading`, `/reimbursements/export`, blob response and current-filter params.
- [ ] `frontend/src/pages/__tests__/ReimbursementPage.test.ts` — pins permission-gated `导出 Excel`, object URL cleanup, feedback copy and negative scope boundaries.

---

## Requirements Coverage

| Requirement | Validation |
|-------------|------------|
| EXPORT-01 | Backend export service/route tests cover current-filter export, export paging and `reimbursement:export` guard; frontend tests cover current-filter blob call. |
| EXPORT-02 | Export service tests cover fixed reimbursement columns, attachment count, status label, department/finance action-derived result fields and approved-only final approval time. |
| EXPORT-03 | Backend/frontend source tests and closeout docs preserve negative contracts for statistics dashboards, payment/accounting, OCR and report surfaces. |
| PERM-01 | Route/page tests prove the seeded `reimbursement:export` permission is used by API and UI. |
| PERM-02 | Route guard and service visibility tests keep backend authoritative; page tests only verify visibility. |
| UX-02 | Store/page tests cover success, oversize guidance, generic failure feedback and loading reset. |

---

## Nyquist Checks

1. **Route-order boundary:** tests assert `/reimbursements/export` is registered before dynamic `/:id` detail routes.
2. **Permission boundary:** tests assert export uses `authGuard('reimbursement:export')`; own/list visibility alone is not export permission.
3. **Filter boundary:** tests assert `status/category/dateFrom/dateTo/keyword` pass through while export overrides `page/size` for full filtered export.
4. **Workbook boundary:** tests assert fixed columns only and no dynamic form/statistics/payment fields.
5. **Action-derived review boundary:** tests assert department/finance result columns come from latest review actions, not client fields.
6. **Formula safety boundary:** tests assert `=`, `+`, `-`, `@`, tab and carriage-return-leading strings are escaped.
7. **Blob lifecycle boundary:** tests assert authenticated blob download, `URL.createObjectURL()` and `URL.revokeObjectURL()`, with no `window.open`.
8. **Closeout boundary:** docs verify UAT-1 through UAT-6 and v1.4 requirement coverage without expanding scope.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real XLSX download opens correctly | EXPORT-01/EXPORT-02/UX-02 | Browser download and spreadsheet rendering need runtime smoke. | Log in as a user with `reimbursement:export`, apply status/date filters, click `导出 Excel`, open the XLSX and verify columns plus filtered rows. |
| Permission denial from browser session | PERM-02 | Runtime token/role behavior is best smoke-tested end to end. | Log in as an ordinary employee, confirm no export control is visible and direct `/api/v1/reimbursements/export` request is rejected. |
| v1.4 UAT flow | EXPORT-01/EXPORT-02/PERM-02/UX-02 | Full submit/review/export path requires seeded users and files. | Execute UAT-1 through UAT-6 from `.planning/REQUIREMENTS.md` and record evidence in Phase 27 closeout docs. |

---

## Validation Sign-Off

- [x] All planned tasks have focused automated verification or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verification.
- [x] Wave 0 covers backend and frontend missing references.
- [x] No watch-mode commands are required.
- [x] Feedback latency target is under 240 seconds for focused reimbursement checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** planned 2026-05-03
