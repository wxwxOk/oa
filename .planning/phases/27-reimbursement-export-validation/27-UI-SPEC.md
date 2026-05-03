# Phase 27: 报销导出 + 验证收尾 - UI Spec

**Date:** 2026-05-03
**Scope:** `/reimbursements` 列表页的导出入口与反馈；不新增页面。

## Export Entry

- Host page: `frontend/src/pages/ReimbursementPage.vue`.
- Desktop placement: existing header toolbar, next to refresh/create actions.
- Mobile placement: same header toolbar as an icon button with `aria-label="导出报销 Excel"` and tooltip.
- Visibility: render only when `auth.hasPerm('reimbursement:export')` is true.
- Button label: desktop uses `导出 Excel`; mobile can omit visible label but must retain accessible label and tooltip.
- Loading: bind to `store.exportLoading` and prevent duplicate clicks while export is active.

## Behavior

- Trigger: call `useReimbursementStore.exportExcel(currentFilters)`.
- Filters: pass only current reimbursement list filters `status`, `category`, `dateFrom`, `dateTo`, `keyword`; do not add a new `reviewScope` export parameter.
- Download: create an object URL from the authenticated blob, click a temporary anchor and always revoke the object URL.
- Filename: `reimbursements-YYYY-MM-DD.xlsx` or clearer equivalent.
- Forbidden: no direct public URL, no `window.open`, no new report/export page.

## Feedback Copy

- Success: `Excel 导出已开始`.
- Oversized export: `当前筛选结果超过导出上限，请缩小筛选范围后重试。`
- Generic failure: `导出失败，请稍后重试。` or equally clear copy.

## Negative Scope Contract

Phase 27 may add `导出 Excel` and `/reimbursements/export`. It must still not add:

- OCR or `发票验真`.
- Statistics dashboard, chart analysis or reporting page.
- Payment/accounting/voucher workflow.
- `/approval/applications` or `/approval/tasks` as reimbursement export hosts.
- `window.open` for protected file access.
