# Phase 27: 报销导出 + 验证收尾 - Research

**Researched:** 2026-05-03
**Domain:** 固定报销模块、Excel 明细导出、RBAC 边界、v1.4 验证归档
**Confidence:** HIGH

<user_constraints>
## Locked Decisions from `27-CONTEXT.md`

- Export all rows matching current reimbursement list filters: `status`, `category`, `dateFrom`, `dateTo`, `keyword`; do not export only the current page.
- Backend `reimbursement:export` authorization is authoritative; frontend visibility is only a UX affordance.
- Export endpoint is `GET /api/v1/reimbursements/export` and must be registered before `GET /:id`.
- Use server-side `exceljs`, no new export dependency and no frontend-side XLSX generation.
- Reuse the Phase 19 export safety shape: 2,000-row cap, frozen header row, clear XLSX headers, clear filename and formula-injection sanitization.
- Export columns are fixed reimbursement detail columns; department/finance review result fields are derived from `ReimbursementAction`, not client input.
- Frontend export lives on `/reimbursements`, calls `useReimbursementStore.exportExcel(currentFilters)`, uses authenticated blob download and avoids `window.open`.
- Closeout must include focused tests, builds, UAT, requirement coverage evidence, milestone archive material and follow-up notes.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Planning Support |
|----|-------------|------------------|
| EXPORT-01 | 有权限用户可按当前筛选条件导出报销列表 Excel | Add a permission-gated backend export route that reuses normalized list filters and pages through all matching visible rows within a cap. |
| EXPORT-02 | 导出内容包含申请基础信息、附件数量、当前状态、部门审核结果、财务审核结果和最终通过时间 | Build a reimbursement-specific workbook from application rows plus action trail data; derive review columns from latest department/finance actions. |
| EXPORT-03 | 本期只做明细导出，不做统计报表、图表看板或财务支付流程 | Keep UI as a list toolbar action and explicitly preserve negative contracts for dashboard/payment/OCR/reporting surfaces. |
| PERM-01 | 报销权限码至少覆盖导出 | Reuse seeded `reimbursement:export`; add route and UI tests proving export is guarded and visible only to authorized users. |
| PERM-02 | 前后端均使用 RBAC；禁止仅依赖前端隐藏按钮 | Test both backend `authGuard('reimbursement:export')` and frontend `auth.hasPerm('reimbursement:export')` button visibility. |
| UX-02 | 导出操作需要明确成功/失败反馈 | Mirror archive export feedback: success `Excel 导出已开始`, oversized export guidance, and generic failure fallback. |

</phase_requirements>

## Existing Implementation Assets

### Backend

- `backend/src/modules/approval/archive-export.service.ts` is the canonical ExcelJS implementation:
  - `MAX_ARCHIVE_EXPORT_ROWS = 2000`
  - `sanitizeExcelCell()` prefixes formula-leading strings.
  - `workbook.addWorksheet(..., { views: [{ state: 'frozen', ySplit: 1 }] })`
  - paged export loading with fixed page size.
- `backend/src/modules/approval/archive.route.ts` is the canonical XLSX response route:
  - `authGuard('approval:export')`
  - `workbook.xlsx.writeBuffer()`
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="archive-export-<timestamp>.xlsx"`
- `backend/src/modules/reimbursement/reimbursement.service.ts` already owns:
  - actor shape and permission helpers.
  - `ReimbursementListFilters` and normalization.
  - visibility filtering for own/list/department-review/finance-review/admin users.
  - serialization of `attachmentCount`, status, actions and `completedAt`.
- `backend/src/modules/reimbursement/reimbursement.route.ts` already owns:
  - `reimbursementListQuery` for the target filter contract.
  - fixed `/reimbursements` route module.
  - review routes and route-order constraints.

### Frontend

- `frontend/src/stores/approvalArchive.ts` provides the closest export store pattern: `exportLoading`, `exportExcel(filters)`, `responseType: 'blob'`.
- `frontend/src/pages/ApprovalArchivePage.vue` provides the closest download pattern: object URL, temporary anchor, `link.click()`, `URL.revokeObjectURL()`, positive/negative `Notify` copy.
- `frontend/src/stores/reimbursement.ts` is the only place reimbursement API calls should be added.
- `frontend/src/pages/ReimbursementPage.vue` already contains the target toolbar, current filter state, review scope selector, desktop table and mobile card host.

## Research Findings

### 1. Export service should be reimbursement-specific

The archive export service has dynamic form and processing-field concerns that do not apply to fixed reimbursement rows. The planner should add `backend/src/modules/reimbursement/reimbursement-export.service.ts` rather than over-generalizing archive export. Reuse the small safety patterns, not the archive domain model.

Recommended exports:

- `MAX_REIMBURSEMENT_EXPORT_ROWS = 2000`
- `sanitizeReimbursementExcelCell(value: unknown): unknown` or a shared helper imported from archive if refactoring stays small.
- `buildReimbursementWorkbook({ rows })`
- `exportReimbursementsExcel(actor, filters, dependencies?)`

### 2. Export must not trust ordinary list visibility alone

`reimbursement:export` is a distinct permission. A user may view their own reimbursement but still not be allowed to export. The route guard should use `authGuard('reimbursement:export')`, then the service can reuse the current actor visibility/list filters so export output is still scoped to what that actor can see.

### 3. Review-result columns should be action-derived

The latest action per review node is the source of truth:

- Department result: latest `DEPARTMENT_APPROVE` or `DEPARTMENT_REJECT` action.
- Finance result: latest `FINANCE_APPROVE` or `FINANCE_REJECT` action.
- Reviewer, time and comment come from the same action row.
- Final approval time is `completedAt` only when status is `APPROVED`.

This keeps export aligned with Phase 26 audit semantics and avoids adding denormalized review result fields.

### 4. Frontend export should be a list action, not a new page

Phase 27 has a UI touch but no new screen. The export control belongs in `ReimbursementPage.vue` next to refresh/create/filter controls. The desktop button can show `导出 Excel`; the mobile control can use an icon button with `aria-label` and tooltip. It should be hidden unless `auth.hasPerm('reimbursement:export')` is true.

### 5. Closeout is a real deliverable

The last plan should not add feature scope. It should verify and document:

- focused backend reimbursement suite.
- focused frontend reimbursement type/store/page suite.
- backend and frontend builds.
- UAT checklist UAT-1 through UAT-6.
- requirement coverage for all v1.4 items, with Phase 27 evidence for export/feedback/permission rows.
- known caveats from prior phases without re-litigating unrelated full-suite failures.

## Validation Architecture

Phase 27 should use a four-wave validation structure:

1. **Wave 0 contracts:** failing-but-specific backend export service/route tests and frontend store/page tests for export controls.
2. **Backend implementation:** make export workbook, row cap, formula sanitization, filter paging and route header tests green.
3. **Frontend implementation:** make store blob download and list toolbar feedback tests green.
4. **Closeout:** run focused backend/frontend suites, builds, UAT checklist and requirements coverage archive.

Recommended focused commands:

```bash
cd backend && bun test src/modules/reimbursement/__tests__/reimbursement.service.test.ts src/modules/reimbursement/__tests__/reimbursement.route.test.ts src/modules/reimbursement/__tests__/reimbursement-export.service.test.ts
cd frontend && bun test src/types/__tests__/reimbursement.test.ts src/stores/__tests__/reimbursement.test.ts src/pages/__tests__/ReimbursementPage.test.ts
cd backend && bun run build
cd frontend && bun run build
```

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Export authorization | Backend route | Frontend visibility | `PERM-02` requires backend enforcement; frontend only improves discoverability. |
| Export filter normalization | Backend service | Frontend store | Backend must own final scope; frontend passes current list filters. |
| Workbook generation | Backend service | Tests | Existing ExcelJS dependency and security pattern are backend-owned. |
| Blob download | Frontend store/page | Browser APIs | Existing archive UX already uses authenticated blob + object URL. |
| UAT/coverage closeout | Planning docs | Automated tests | Phase 27 includes milestone closeout, not only code. |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| `/export` swallowed by `/:id` route | Register export route before `GET /:id` and add route-order/source tests. |
| Formula injection in user-controlled strings | Mirror archive `sanitizeExcelCell()` contract and test `=`, `+`, `-`, `@`, tab and carriage return prefixes. |
| Export rows diverge from list filters | Add dependency-injected service tests proving `status/category/dateFrom/dateTo/keyword` pass through while page/size are overridden by export paging. |
| Ordinary employees export visible own rows despite no export permission | Add route/source tests for `authGuard('reimbursement:export')` and preserve backend permission checks. |
| Frontend object URL leak | Test `URL.revokeObjectURL()` and avoid `window.open`. |
| Scope creep into dashboard/payment/OCR | Keep negative source contracts and document deferred ideas. |

## Primary Recommendation

Plan Phase 27 as four executable plans: Wave 0 contracts, backend export, frontend export UX, and closeout validation/archive. This preserves the existing GSD wave pattern, gives export enough backend/frontend coverage, and leaves the final wave focused on v1.4 UAT and milestone evidence rather than feature expansion.
