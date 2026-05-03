# Phase 27 UAT Checklist

**Date:** 2026-05-03
**Status:** Passed
**Evidence:** User confirmed manual testing passed during v1.4 milestone closeout.

| ID | Scenario | Status | Tester / Date | Account / Role | Evidence Notes |
|----|----------|--------|---------------|----------------|----------------|
| UAT-1 | Employee fills reimbursement info, uploads image/PDF invoice attachments and submits. | Passed | User confirmed / 2026-05-03 | Employee with reimbursement create/own/attachment permissions | Application enters department review and detail can view image/download PDF. |
| UAT-2 | Department reviewer approves with Canvas handwritten signature. | Passed | User confirmed / 2026-05-03 | Department reviewer | Status moves to finance review and timeline records signature evidence. |
| UAT-3 | Finance reviewer approves with Canvas handwritten signature. | Passed | User confirmed / 2026-05-03 | Finance reviewer | Status becomes approved and final approval time is recorded. |
| UAT-4 | Department reviewer rejects with reason; finance reviewer rejects with reason. | Passed | User confirmed / 2026-05-03 | Department reviewer and finance reviewer | Employee detail shows rejection node, reviewer, time and reason. |
| UAT-5 | Ordinary employee attempts unauthorized access to another user's attachment/review/export surfaces. | Passed | User confirmed / 2026-05-03 | Ordinary employee without export/review/list permissions | Backend rejects access; unauthorized UI surfaces are unavailable. |
| UAT-6 | Export-authorized user filters by status/date and exports Excel. | Passed | User confirmed / 2026-05-03 | User with reimbursement export and list visibility | Downloaded XLSX contains current-filter rows and fixed detail columns. |

## Negative Scope Confirmation

Phase 27 remains detail-export-only. OCR, 发票验真, 统计看板, 付款, 会计凭证 and 复杂工作流 remain out of scope.

## Completion Rule

UAT-1 through UAT-6 passed, so Phase 27 and v1.4 can be marked complete.
