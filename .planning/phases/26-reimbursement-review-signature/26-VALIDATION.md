---
phase: 26
slug: reimbursement-review-signature
status: completed
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-03
completed: 2026-05-03
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for two-level reimbursement review and signature capture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test for backend, Vitest + Quasar/Vite for frontend |
| **Config file** | `backend/package.json`, `frontend/package.json` |
| **Quick run command** | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts src/modules/reimbursement/__tests__/reimbursement.route.test.ts; cd ../frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts` |
| **Full suite command** | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts && bun run build; cd ../frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts && bun run build` |
| **Estimated runtime** | ~120-240 seconds |

---

## Sampling Rate

- **After every task commit:** Run the focused test command for the changed backend or frontend side.
- **After every plan wave:** Run the quick run command above.
- **Before `$gsd-verify-work`:** Run the full suite command above.
- **Max feedback latency:** 240 seconds for focused reimbursement checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 0 | APPROVAL-01/APPROVAL-02/APPROVAL-03/APPROVAL-04/PERM-02 | backend service contract | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts` | ✅ | ✅ green |
| 26-01-02 | 01 | 0 | APPROVAL-01/APPROVAL-02/APPROVAL-03/PERM-02 | backend route/file contract | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts` | ✅ | ✅ green |
| 26-01-03 | 01 | 0 | APPROVAL-03/APPROVAL-05/UX-01/UX-02/PERM-01/PERM-02 | frontend type/store/source contract | `cd frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts` | ✅ | ✅ green |
| 26-02-01 | 02 | 1 | APPROVAL-03/APPROVAL-05 | backend file/state implementation | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts src/modules/reimbursement/__tests__/reimbursement.service.test.ts` | ✅ | ✅ green |
| 26-02-02 | 02 | 1 | APPROVAL-01/APPROVAL-02/APPROVAL-04/PERM-02 | backend service implementation | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts` | ✅ | ✅ green |
| 26-02-03 | 02 | 1 | APPROVAL-01/APPROVAL-02/APPROVAL-03/APPROVAL-05/PERM-02 | backend route implementation | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts && bun run build` | ✅ | ✅ green |
| 26-03-01 | 03 | 2 | APPROVAL-03/APPROVAL-05/UX-02 | frontend type/helper implementation | `cd frontend && bun test src/types/__tests__/reimbursement.test.ts` | ✅ | ✅ green |
| 26-03-02 | 03 | 2 | APPROVAL-01/APPROVAL-02/APPROVAL-03/APPROVAL-04/PERM-02/UX-02 | frontend store implementation | `cd frontend && bun test src/stores/__tests__/reimbursement.test.ts` | ✅ | ✅ green |
| 26-03-03 | 03 | 2 | APPROVAL-03/APPROVAL-05/UX-01 | frontend signature/timeline implementation | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts src/stores/__tests__/reimbursement.test.ts` | ✅ | ✅ green |
| 26-04-01 | 04 | 3 | APPROVAL-01/APPROVAL-02/PERM-01/PERM-02/UX-01 | review queue UI implementation | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts src/stores/__tests__/reimbursement.test.ts` | ✅ | ✅ green |
| 26-04-02 | 04 | 3 | APPROVAL-01/APPROVAL-02/APPROVAL-03/APPROVAL-04/APPROVAL-05/UX-01/UX-02 | detail review UX implementation | `cd frontend && bun test src/pages/__tests__/ReimbursementPage.test.ts src/stores/__tests__/reimbursement.test.ts && bun run build` | ✅ | ✅ green |
| 26-04-03 | 04 | 3 | all Phase 26 IDs | final focused backend/frontend gate | `cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts && bun run build; cd ../frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts && bun run build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/src/modules/reimbursement/__tests__/reimbursement.service.test.ts` — pins review input normalization, department/finance actionable predicates, legal transitions, signature required and rejection reason required.
- [x] `backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts` — pins review queue/action/signature route signatures and guards.
- [x] `backend/src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts` — pins PNG-only signature file constants, safe signature paths and inline preview headers.
- [x] `frontend/src/types/__tests__/reimbursement.test.ts` — pins review scope/action payload helpers and signature data URL conversion.
- [x] `frontend/src/stores/__tests__/reimbursement.test.ts` — pins review queue endpoints, multipart `signature` key, reject JSON payload and authenticated signature blob preview.
- [x] `frontend/src/pages/__tests__/ReimbursementPage.test.ts` — pins list queue labels, detail review buttons/dialog copy, mobile sticky actions, signature preview object URLs and negative scope strings.

---

## Requirements Coverage

| Requirement | Validation |
|-------------|------------|
| APPROVAL-01 | Backend service/route tests cover department queue, department approve/reject actions and required comment behavior; page tests cover department action copy. |
| APPROVAL-02 | Backend service/route tests cover finance queue, finance approve/reject actions and state changes; page/store tests cover finance action methods. |
| APPROVAL-03 | File/service/store/page tests cover PNG signature requirement, multipart `signature` key, saved metadata and Canvas signature UI. |
| APPROVAL-04 | Service/page tests cover terminal `REJECTED`, `completedAt`, reject node/person/time/reason display, and required reject reason. |
| APPROVAL-05 | Route/service/page tests cover full action trail serialization and timeline signature image rendering. |
| PERM-01 | Route/menu/page contracts preserve reimbursement permissions and menu entry while adding review controls under `/reimbursements`. |
| PERM-02 | Backend route/service tests cover real RBAC/object checks; frontend tests only cover visibility and never replace backend authorization. |
| UX-01 | Page source tests cover desktop table/detail side actions and mobile sticky review controls. |
| UX-02 | Store/page tests cover review success/failure copy, disabled invalid confirms and loading reset behavior. |

---

## Nyquist Checks

1. **Actionable queue boundary:** tests assert `/reimbursements/review/department` and `/reimbursements/review/finance` are distinct from `/reimbursements` visibility.
2. **Permission boundary:** backend tests assert `reimbursement:list` alone cannot review, while department/finance review permissions gate their own queues/actions.
3. **State boundary:** tests assert `DEPARTMENT_REVIEW -> FINANCE_REVIEW`, `DEPARTMENT_REVIEW -> REJECTED`, `FINANCE_REVIEW -> APPROVED`, `FINANCE_REVIEW -> REJECTED`, and reject repeat/stale actions.
4. **Signature boundary:** tests assert approve requires PNG `signature`, rejects non-PNG/empty/oversized signatures, and never writes data URLs to DB-facing action metadata.
5. **Attachment separation boundary:** tests assert signatures use `ReimbursementAction.signatureRelativePath` and do not create or render `ReimbursementAttachment` rows.
6. **Blob preview boundary:** tests assert signature preview uses `responseType: 'blob'`, `URL.createObjectURL`, `URL.revokeObjectURL`, and no protected endpoint strings in template `<img src>`.
7. **UI host boundary:** source tests assert fixed reimbursement pages are used and `/approval/applications`, `/approval/tasks`, `/reimbursements/export`, `导出 Excel`, `OCR`, and `发票验真` stay out of Phase 26 UI.
8. **Terminal time boundary:** service tests assert finance approve and both reject actions set `completedAt`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Canvas handwriting and signature confirmation | APPROVAL-03/UX-01 | Canvas pointer fidelity is better verified in a browser than source tests. | Open a department-review detail, click `部门初审通过`, draw a signature, confirm; repeat on mobile viewport. |
| Mobile sticky review controls with safe-area spacing | UX-01/UX-02 | Requires viewport and touch-layout smoke. | At 375px width, verify `mobile-review-actions` does not cover content and both approve/reject buttons are touchable. |
| End-to-end reviewer object permissions | APPROVAL-01/APPROVAL-02/PERM-02 | Requires seeded users/departments and runtime DB state. | Use different department and finance reviewer accounts; confirm unauthorized department reviewer cannot process another department's application. |
| Authenticated signature image preview | APPROVAL-03/APPROVAL-05 | Requires a real stored file and auth token. | After approval, reload detail and confirm timeline displays a signature image while network uses `/actions/:actionId/signature`. |

---

## Validation Sign-Off

### Automated Verification

- Backend focused suite: `21 pass`, `0 fail`, `113 expect() calls`.
- Frontend focused suite: `19 pass`, `0 fail`, `203 expect() calls`.
- Backend build: green (`bun run build`).
- Frontend build: green (`bun run build`, Quasar SPA build exit code 0).

- [x] All tasks have focused automated verification or Wave 0 contract dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verification.
- [x] Wave 0 covers backend and frontend missing references.
- [x] No watch-mode commands are required.
- [x] Feedback latency target is under 240 seconds for focused reimbursement checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-03
