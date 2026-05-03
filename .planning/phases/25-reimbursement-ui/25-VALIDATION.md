---
phase: 25
slug: reimbursement-ui
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-03
completed: 2026-05-03
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for the employee reimbursement frontend.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Quasar/Vite frontend build |
| **Config file** | `frontend/package.json`, `frontend/vitest.config.*` if present |
| **Quick run command** | `cd frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts` |
| **Full suite command** | `cd frontend && bun test && bun run build` |
| **Estimated runtime** | ~60-180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the focused test command for the files changed by that task.
- **After every plan wave:** Run `cd frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts`.
- **Before `$gsd-verify-work`:** Run `cd frontend && bun test && bun run build`.
- **Max feedback latency:** 180 seconds for focused frontend checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 0 | REIM-01/REIM-02/REIM-03 | type contract | `cd frontend && bun test src/types/__tests__/reimbursement.test.ts` | ✅ | ✅ green |
| 25-01-02 | 01 | 0 | REIM-01/REIM-02/REIM-03/REIM-04/INV-01/INV-03/PERM-02 | store contract | `cd frontend && bun test src/stores/__tests__/reimbursement.test.ts` | ✅ | ✅ green |
| 25-01-03 | 01 | 0 | REIM-01/REIM-02/REIM-03/REIM-04/INV-01/INV-03/UX-01/UX-02/PERM-01/PERM-02 | page source contract | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts` | ✅ | ✅ green |
| 25-02-01 | 02 | 1 | REIM-01/REIM-02/REIM-03 | type helper test | `cd frontend && bun test src/types/__tests__/reimbursement.test.ts` | ✅ | ✅ green |
| 25-02-02 | 02 | 1 | REIM-01/REIM-02/REIM-03/REIM-04/INV-01/INV-03/PERM-02 | store test | `cd frontend && bun test src/stores/__tests__/reimbursement.test.ts` | ✅ | ✅ green |
| 25-02-03 | 02 | 1 | PERM-01/PERM-02 | source contract | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts` | ✅ | ✅ green |
| 25-03-01 | 03 | 2 | REIM-01/REIM-02/UX-02 | source contract/build | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts && bun run build` | ✅ | ✅ green |
| 25-03-02 | 03 | 2 | INV-01/INV-03/PERM-02/UX-02 | source contract/build | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts src/stores/__tests__/reimbursement.test.ts && bun run build` | ✅ | ✅ green |
| 25-03-03 | 03 | 2 | REIM-01/REIM-02/INV-01/UX-01/UX-02 | source contract/build | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts && bun run build` | ✅ | ✅ green |
| 25-04-01 | 04 | 3 | REIM-03/REIM-04/PERM-01/PERM-02/UX-01 | page source contract | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts` | ✅ | ✅ green |
| 25-04-02 | 04 | 3 | REIM-02/REIM-03/INV-03/UX-01/UX-02 | page source contract | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts` | ✅ | ✅ green |
| 25-04-03 | 04 | 3 | all Phase 25 IDs | full frontend gate | `cd frontend && bun test && bun run build` | ✅ | ⚠️ pre-existing suite env failure; focused + build green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `frontend/src/types/__tests__/reimbursement.test.ts` — pins reimbursement DTO keys, status labels/colors, draft mutability, amount/date/file-size helpers and payload normalization.
- [x] `frontend/src/stores/__tests__/reimbursement.test.ts` — pins `/reimbursements` list/detail/create/update/submit paths, multipart `file` upload, authenticated blob preview/download, delete path and loading reset behavior.
- [x] `frontend/src/pages/__tests__/ReimbursementPage.test.ts` — pins route/menu `permAny`, page copy, fixed form fields, responsive list structures, attachment panel behavior, detail/timeline read-only behavior and negative scope strings.

---

## Requirements Coverage

| Requirement | Validation |
|-------------|------------|
| REIM-01 | Type/page contracts cover fixed fields; form page source contract covers create/save draft. |
| REIM-02 | Type helper tests cover required fields, amount > 0 and two-decimal normalization; page contract covers submitted read-only behavior. |
| REIM-03 | Store/page contracts cover own list/detail filters: status, category, date range and keyword. |
| REIM-04 | Route/menu contract uses read `permAny`; backend object visibility remains Phase 24 source of truth. |
| INV-01 | Attachment panel/source/store contracts cover multiple image/PDF upload through multipart `file`. |
| INV-03 | Store/page contracts cover authenticated blob preview/download and no direct protected URLs. |
| UX-01 | Page contracts cover desktop `QTable`, mobile cards, full-page form/detail and attachment operations. |
| UX-02 | Page/store contracts cover upload/submit/delete feedback and loading/error states. |
| PERM-01 | Route/menu source contract covers `报销管理` entry and reimbursement permission strings. |
| PERM-02 | Route/menu/button/store contracts cover frontend RBAC while preserving backend authorization. |

---

## Nyquist Checks

1. **API boundary:** store tests assert exact relative paths: `/reimbursements`, `/reimbursements/:id`, `/reimbursements/:id/submit`, `/reimbursements/:id/attachments`, preview/download/delete attachment paths.
2. **Multipart boundary:** store tests assert `FormData.append('file', file)` and no alternate upload key.
3. **Blob boundary:** store/page tests assert `responseType: 'blob'`, `URL.createObjectURL`, `URL.revokeObjectURL`, and absence of protected `<img src>` / `window.open` usage.
4. **Permission boundary:** source contracts assert route/menu read `permAny`, create/edit/submit `reimbursement:create`, and attachment `reimbursement:attachment`.
5. **State boundary:** helper/page contracts assert edit/upload/delete only for `DRAFT`; submitted statuses are read-only.
6. **Responsive boundary:** page contract asserts desktop `q-table`, mobile `reimbursement-card`, mobile filter `q-dialog`, and sticky mobile form actions.
7. **Scope boundary:** page contract asserts absence of review approval/rejection actions, signature capture, export, OCR, invoice verification and `/approval/applications` reuse.
8. **Date/amount boundary:** type tests assert date-only `YYYY-MM-DD` display for `occurredAt` and amount write normalization to a two-decimal string.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real browser file picker and rejected-file feedback | INV-01/UX-02 | Browser `File`/`QFile` behavior and native file selection are better smoke-tested manually. | Open `/reimbursements/new`, save draft, select invalid type/oversized file and valid image/PDF; confirm clear feedback. |
| Image preview object URL lifecycle | INV-03 | Automated source contracts pin code; visual preview needs browser smoke. | Upload or use an image attachment, click `预览`, close dialog, confirm no direct protected URL is used. |
| Mobile sticky actions and no horizontal overflow | UX-01/UX-02 | Requires viewport-specific visual check. | At 375px width, create/edit/submit and detail/attachment operations remain usable without horizontal scroll. |

---

## Validation Sign-Off

- [x] All Phase 25 requirements have automated contract coverage.
- [x] Wave 0 defines missing test files before implementation.
- [x] No watch-mode commands are required.
- [x] Focused feedback latency target is under 180 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-03
