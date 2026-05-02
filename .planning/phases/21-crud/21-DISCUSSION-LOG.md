# Phase 21: 到访管理页面 + CRUD 筛选 - Discussion Log

**Gathered:** 2026-05-02
**Mode:** auto
**Status:** Context created

## Inputs Reviewed

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/phases/20-api/20-CONTEXT.md`
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-CONTEXT.md`
- `.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/FEATURES.md`
- `.planning/research/PITFALLS.md`
- `.planning/research/SUMMARY.md`
- `backend/src/modules/visit/visit.route.ts`
- `frontend/src/router/routes.ts`
- `frontend/src/layouts/MainLayout.vue`
- `frontend/src/composables/useResponsive.ts`
- `frontend/src/pages/ApprovalArchivePage.vue`
- `frontend/src/pages/ApprovalApplicationPage.vue`
- `frontend/src/stores/approvalArchive.ts`
- `frontend/src/stores/approvalApplication.ts`
- `frontend/src/components/FilterSheet.vue`
- `frontend/src/components/EmptyState.vue`

## Phase Boundary Confirmed

Phase 21 delivers the user-facing visit management page: independent menu, responsive list, filters, detail, create, edit and delete. Excel import parsing/preview remains Phase 22. Stats panel and conversion summary remain Phase 23.

## Existing Context Check

- Existing context: none.
- Existing plans: none.
- Relevant todos: none matched by `todo match-phase 21`.

## Auto-Selected Gray Areas

`--auto` selected all relevant gray areas without interactive prompts:

1. 页面入口与权限
2. 列表与响应式展示
3. 筛选交互
4. 新建、编辑、详情和删除
5. 前端数据层

## Auto Decisions

### 页面入口与权限

**Question:** Where should the visit page live?

Options considered:
- Independent `/visits` route and independent menu entry — matches roadmap “独立菜单” and keeps fixed ledger separate from approval/form modules.
- Put under “审批管理” — rejected because visits are a fixed ledger, not approval tasks/applications.
- Put under “收集统计表” — rejected because v1.3 explicitly does not reuse dynamic form collection as the main model.

**Selected:** Independent `/visits` route and independent “到访管理” menu entry gated by `visit:list`.

### 操作权限

**Question:** How should buttons be permission-gated?

Options considered:
- Use route `meta.perm` for page access and `v-perm` / `auth.hasPerm` for create/update/delete buttons — matches existing frontend permission pattern.
- Only hide route and leave buttons visible — rejected because Phase 21 must complete frontend portions of `PERM-02`.
- Client-side custom role checks — rejected because permissions already use code strings.

**Selected:** Route/menu use `visit:list`; create/update/delete buttons use `visit:create/update/delete`.

### 列表与响应式展示

**Question:** How should records be displayed on desktop and mobile?

Options considered:
- Desktop `QTable` + mobile cards — matches roadmap success criteria and existing `ApprovalArchivePage.vue` / `ApprovalApplicationPage.vue` patterns.
- Single responsive table everywhere — rejected due to mobile usability and prior responsive decisions.
- Full-page detail list without table — rejected because Phase 21 needs pageable ledger scanning.

**Selected:** Desktop `QTable` with server-side pagination; mobile `QCard` list.

### 列表字段密度

**Question:** Which fields belong in the list?

Options considered:
- Show key scan fields only, move full 15 fields to detail/edit — preserves readability and follows long-text pitfall guidance.
- Show all 15 fields in the table — rejected because long text and many columns would break layout.
- Show only name/date/status — rejected because operations users need channel, consultant and receptionist context.

**Selected:** List shows key scan fields: name, channel partner, consultant, receptionist, reception date, statuses, status category, updated time and actions. Full fields live in detail/edit.

### 筛选交互

**Question:** How should filters work?

Options considered:
- Desktop inline filters + mobile bottom filter sheet, backed by `/visits/filter-options` — matches existing responsive pattern and Phase 20 backend contract.
- Always show all filters inline — rejected for mobile crowding.
- Hard-code dropdown dictionaries — rejected because Phase 20 locked distinct values from records and no dictionary module.

**Selected:** Desktop top filter row; mobile bottom dialog/filter sheet; filter options from backend distinct endpoint.

### 日期处理

**Question:** How should dates be handled in the UI?

Options considered:
- `YYYY-MM-DD` date-only strings via date picker — matches Phase 20 date contract and v1.3 pitfall guidance.
- Render ISO timestamps directly — rejected due to timezone drift and poor UX.
- Add custom timezone handling — rejected as unnecessary for date-only business fields.

**Selected:** Use date pickers and submit/display date-only values.

### 新建、编辑和详情

**Question:** What editing pattern should Phase 21 use?

Options considered:
- Dedicated dialog/form component, maximized on mobile — matches Quasar patterns and keeps list page focused.
- Inline table editing — rejected as risky for 15 fields and long text.
- Separate full page per record — not required for Phase 21; dialog is enough for ledger CRUD.

**Selected:** Dedicated visit form/detail dialog with 15 fields, mobile maximized.

### 删除

**Question:** How should delete behave?

Options considered:
- Confirmation dialog with identifying row info, then refresh list — matches destructive-action pattern.
- Immediate delete from row action — rejected due to accidental deletion risk.
- Soft delete workflow — out of scope; backend currently deletes records.

**Selected:** Confirm deletion with name and contextual info before calling `DELETE /visits/:id`.

### 前端数据层

**Question:** How should frontend API access be structured?

Options considered:
- Add `types/visit.ts` + `stores/visit.ts` and call existing axios `api` relative URLs — matches Pinia per-feature pattern.
- Fetch directly inside page components — rejected because existing modules centralize API/state in stores.
- Introduce a new API client abstraction — rejected as over-engineering for a single module.

**Selected:** Add visit types and Pinia store with list/filter/detail/create/update/delete actions.

## Deferred Ideas Captured

- Excel import file parsing, header validation, preview and duplicate warning UI — Phase 22.
- Stats panel, conversion summary and charts — Phase 23.
- Excel export, automatic deduplication, dictionary management, follow-up reminders/tasks, sales workflow and public lead page — future/out of scope.

## Result

Created `21-CONTEXT.md` with implementation decisions, canonical references and code context for downstream research/planning.
