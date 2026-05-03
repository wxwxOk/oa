# Phase 27: 报销导出 + 验证收尾 - Context

**Gathered:** 2026-05-03 (auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

交付 v1.4 固定报销模块的明细导出与收尾验证：授权人员可在 `/reimbursements` 按当前列表筛选条件导出 Excel 明细，导出覆盖申请基础信息、附件数量、当前状态、部门审核结果、财务审核结果和最终通过时间；同时完成 v1.4 UAT、需求覆盖检查、归档材料和后续需求记录。Phase 27 只做明细导出、验证与文档归档；不新增统计看板、付款打款、会计凭证、财务系统对接、OCR、发票验真或复杂工作流。

</domain>

<decisions>
## Implementation Decisions

### 导出范围与筛选口径
- **D-01:** 导出入口复用固定报销列表的当前筛选条件：`status`、`category`、`dateFrom`、`dateTo`、`keyword`；导出全部匹配结果，不只导出当前分页页码。
- **D-02:** 导出范围走后端授权与可见性过滤，不能信任前端按钮；普通员工即使能查看自己的申请，也不能通过导出越权获取全部报销数据。
- **D-03:** 导出接口使用独立 `GET /api/v1/reimbursements/export`，必须声明在 `GET /:id` 之前，避免被动态详情路由吞掉。
- **D-04:** 导出建议设置与 Phase 19 归档导出一致的行数上限（默认 2,000 行）；超过上限返回清晰业务错误，提示用户缩小筛选范围。

### Excel 内容与口径
- **D-05:** 导出列锁定为固定明细列，不做动态表单字段展开：申请编号、标题、类别、金额、发生日期、事由、收款信息、备注、申请人、申请部门、提交时间、附件数量、当前状态、部门审核结果、部门审核人、部门审核时间、部门审核意见、财务审核结果、财务审核人、财务审核时间、财务审核意见、最终通过时间。
- **D-06:** 当前状态使用现有 `DRAFT`、`DEPARTMENT_REVIEW`、`FINANCE_REVIEW`、`APPROVED`、`REJECTED` 的中文标签；导出可同时保留状态枚举或只输出中文标签，由实现者按测试契约固定。
- **D-07:** 部门/财务审核结果从 `ReimbursementAction` 追加轨迹推导，优先读取对应节点最新的 `DEPARTMENT_APPROVE`/`DEPARTMENT_REJECT` 与 `FINANCE_APPROVE`/`FINANCE_REJECT`；不得新增客户端传入的“审核结果”字段。
- **D-08:** 最终通过时间只在 `APPROVED` 状态下输出 `completedAt`；驳回终态可保留完成时间字段为空或作为节点审核时间体现，避免把“最终通过时间”和“驳回完成时间”混淆。

### Excel 工具链与安全
- **D-09:** 后端继续使用已有 `exceljs` 依赖生成 XLSX，不引入新导出库，也不把导出交给前端 `xlsx`。
- **D-10:** 复用 Phase 19 `archive-export.service.ts` 的安全口径：服务端 workbook、冻结表头、合理列宽、`xlsx.writeBuffer()`、`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`、`Content-Disposition` 文件名。
- **D-11:** 所有字符串单元格必须做 Excel 公式注入防护，公式前缀 `= + - @ \t \r` 统一加前导单引号；该 helper 应在报销导出测试中被固定。
- **D-12:** 导出文件名使用清晰前缀 `reimbursements-export-<timestamp>.xlsx` 或同等语义；前端下载名可降级为 `reimbursements-YYYY-MM-DD.xlsx`，但不能使用无意义 blob 名。

### 前端入口与反馈
- **D-13:** 导出按钮继续放在固定报销列表页 `/reimbursements` 的工具区，不新增独立导出页面、报表页或统计看板。
- **D-14:** 前端仅在 `auth.hasPerm('reimbursement:export')` 时显示“导出 Excel”入口；移动端可用图标按钮但必须有可访问标签/tooltip。
- **D-15:** 前端导出调用 `useReimbursementStore.exportExcel(currentFilters)`，通过 authenticated axios blob 请求下载，不直接拼公开 URL，不使用 `window.open`。
- **D-16:** 导出成功反馈为“Excel 导出已开始”或同等清晰文案；失败反馈需要区分导出上限/权限/网络失败时的可理解错误，至少覆盖“当前筛选结果超过导出上限，请缩小筛选范围后重试。”。

### 验证、UAT 与归档收尾
- **D-17:** UAT 必须覆盖完整 v1.4 闭环：员工提交、附件访问、部门通过、部门驳回、财务通过、财务驳回、导出权限和按筛选导出。
- **D-18:** 自动验证优先使用聚焦套件：`backend/src/modules/reimbursement/__tests__/*`、`frontend/src/types/__tests__/reimbursement.test.ts`、`frontend/src/stores/__tests__/reimbursement.test.ts`、`frontend/src/pages/__tests__/ReimbursementPage.test.ts`，再运行 backend/frontend build。
- **D-19:** 需求覆盖检查以 `.planning/REQUIREMENTS.md` 的 v1.4 需求为准，Phase 27 收尾需要明确 `EXPORT-01`、`EXPORT-02`、`EXPORT-03`、`PERM-01`、`PERM-02`、`UX-02` 的完成证据。
- **D-20:** 归档材料应记录 focused tests/build 结果、已知非本阶段全量套件 caveat、UAT 勾选结果、后续需求记录和 v1.4 里程碑状态；不要在收尾阶段扩大实现范围。

### the agent's Discretion
- Excel 列宽、sheet 名称、状态是否同时输出枚举和值、前端按钮图标、导出 loading 样式和错误捕获细节由 planner/实现者按现有 OA 风格决定。
- 导出 service 是否抽出共享 Excel sanitize helper 由实现者决定，但报销导出必须有本域测试覆盖公式注入防护。
- UAT 文档格式、归档材料拆分为 `27-UAT.md` / `27-VERIFICATION.md` / summary 的具体边界由 planner 决定。

</decisions>

<specifics>
## Specific Ideas

- `[auto]` No existing Phase 27 context or plans were found; no pending todos matched this phase.
- `[auto]` Selected all gray areas and accepted recommended defaults for server-side ExcelJS export, current-filter export scope, backend permission enforcement, list-page export UX, and focused v1.4 closeout validation.
- 导出要像 Phase 19 归档导出一样服务端生成 XLSX，并继承 2,000 行上限、公式注入防护、清晰文件名和 blob 下载体验。
- Phase 27 是 v1.4 收尾阶段，重点是把 Phase 24-26 已交付闭环用导出和 UAT 串起来，而不是新增报销统计或财务支付能力。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 27 goal, dependency on Phase 26, success criteria and v1.4 coverage table.
- `.planning/REQUIREMENTS.md` — `EXPORT-01` through `EXPORT-03`, `PERM-01`, `PERM-02`, `UX-02` and v1.4 UAT checklist.
- `.planning/PROJECT.md` — v1.4 fixed reimbursement module, detail-export-only decision and out-of-scope list.
- `.planning/STATE.md` — Phase 26 complete, Phase 27 ready and accumulated v1.4 decisions.

### Locked reimbursement contracts
- `.planning/phases/24-api/24-CONTEXT.md` — reimbursement model, permission, list filter, attachment and export-deferred decisions.
- `.planning/phases/25-reimbursement-ui/25-CONTEXT.md` — fixed reimbursement route/store/list/detail/filter decisions and export exclusion from Phase 25.
- `.planning/phases/25-reimbursement-ui/25-VALIDATION.md` — focused frontend reimbursement test baseline and known full-suite caveat.
- `.planning/phases/26-reimbursement-review-signature/26-CONTEXT.md` — review action, signature, terminal state and Phase 27 export boundary decisions.
- `.planning/phases/26-reimbursement-review-signature/26-UI-SPEC.md` — current reimbursement UI review constraints and negative contract that Phase 27 may now explicitly extend for export.
- `.planning/phases/26-reimbursement-review-signature/26-VALIDATION.md` — focused reimbursement backend/frontend validation baseline after review/signature completion.
- `.planning/phases/26-reimbursement-review-signature/26-04-SUMMARY.md` — Phase 26 completion evidence and Phase 27 readiness.

### Existing export and fixed-module patterns
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-CONTEXT.md` — permission-gated export and archive visibility decisions.
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-RESEARCH.md` — ExcelJS server-side export findings and source references.
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-PATTERNS.md` — ExcelJS export, permission/module extension and event model patterns.
- `.planning/phases/21-crud/21-CONTEXT.md` — fixed-module frontend list/filter/menu conventions.
- `.planning/phases/22-excel/22-CONTEXT.md` — file operation feedback patterns and fixed-module store extension style.

### Backend source files
- `backend/package.json` — existing `exceljs` dependency and Bun build/test scripts.
- `backend/src/modules/approval/archive-export.service.ts` — ExcelJS workbook generation, 2,000 row cap, formula sanitization and page-through export pattern.
- `backend/src/modules/approval/archive.route.ts` — authenticated XLSX response headers and `Content-Disposition` filename pattern.
- `backend/src/modules/approval/__tests__/archive-export.test.ts` — formula injection and export cap contract style to mirror.
- `backend/src/modules/reimbursement/reimbursement.service.ts` — current filter normalization, visibility helpers, action serialization, review action data and list/detail behavior.
- `backend/src/modules/reimbursement/reimbursement.route.ts` — current route ordering, guards, list query schema, review routes and protected binary response style.
- `backend/src/modules/reimbursement/reimbursement.state.ts` — status and transition constants.
- `backend/prisma/schema.prisma` — reimbursement models, action types, attachment relation and `completedAt` fields.
- `backend/prisma/seed.ts` — `reimbursement:export` permission code and ADMIN/EMPLOYEE grant pattern.
- `backend/src/modules/reimbursement/__tests__/reimbursement.service.test.ts` — focused service/state/review tests to extend for export.
- `backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts` — route signature/guard contract tests to extend for `/export`.

### Frontend source files
- `frontend/package.json` — Vitest/Quasar scripts and existing dependencies.
- `frontend/src/types/reimbursement.ts` — reimbursement DTOs, filters, status labels, helpers and payload normalization to extend for export helpers if needed.
- `frontend/src/stores/reimbursement.ts` — centralized reimbursement API calls and blob request pattern to extend with `exportExcel`.
- `frontend/src/stores/approvalArchive.ts` — existing `exportExcel(filters)` store method using `responseType: 'blob'`.
- `frontend/src/pages/ApprovalArchivePage.vue` — existing blob download, object URL revoke and export feedback pattern.
- `frontend/src/pages/ReimbursementPage.vue` — fixed reimbursement list, filters, review scope controls and toolbar insertion point for export.
- `frontend/src/pages/ReimbursementDetailPage.vue` — terminal state, completed time and action trail UI that export/UAT must validate.
- `frontend/src/stores/__tests__/reimbursement.test.ts` — store API contract tests to extend for export.
- `frontend/src/pages/__tests__/ReimbursementPage.test.ts` — source contract tests to extend for export button, permission and negative scopes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/modules/approval/archive-export.service.ts`: provides the strongest server-side XLSX precedent: `ExcelJS.Workbook`, `MAX_ARCHIVE_EXPORT_ROWS = 2000`, `sanitizeExcelCell()`, frozen header row, paged list loading and `BizError` for oversized exports.
- `backend/src/modules/approval/archive.route.ts`: shows how Elysia returns XLSX bytes with content type and `Content-Disposition` filename.
- `backend/src/modules/reimbursement/reimbursement.service.ts`: already normalizes list filters, caps page size at 100, serializes `attachmentCount`, exposes status/action data and centralizes visibility logic.
- `backend/src/modules/reimbursement/reimbursement.route.ts`: already defines `reimbursementListQuery`, `serializeReimbursementListResponse()` and guarded binary file responses; export route should be added before `GET /:id`.
- `frontend/src/stores/approvalArchive.ts`: existing `exportExcel(filters)` with `responseType: 'blob'` can be mirrored in `useReimbursementStore`.
- `frontend/src/pages/ApprovalArchivePage.vue`: existing object URL download and positive/negative Notify copy can be adapted for reimbursement.
- `frontend/src/pages/ReimbursementPage.vue`: contains current filters, queue selector, refresh/new buttons, desktop table and mobile cards; export belongs in this toolbar/list context.

### Established Patterns
- Backend modules use Elysia route modules under `/api/v1`; routes use TypeBox query/body schemas and route-level `authGuard` plus service-level object/visibility checks.
- Lists return `{ rows, total, page, size }`; export should reuse list filters but page through all matching rows within an explicit cap.
- Protected binary responses are authenticated and return explicit headers; frontend consumes blobs through the Pinia store and object URLs.
- Permission UI uses `auth.hasPerm()`/route meta, but backend remains final authority.
- Focused tests and builds are the accepted confidence path for v1.4; full frontend suite has known unrelated browser-global environment caveats from prior phases.

### Integration Points
- Backend: add `backend/src/modules/reimbursement/reimbursement-export.service.ts` and wire `GET /reimbursements/export` in `reimbursement.route.ts` with `authGuard('reimbursement:export')`.
- Backend tests: extend `reimbursement.route.test.ts` and add/extend `reimbursement-export.service.test.ts` for columns, caps, formula sanitization and filter pass-through.
- Frontend: add `exportLoading` and `exportExcel(filters)` to `frontend/src/stores/reimbursement.ts`; wire “导出 Excel” in `ReimbursementPage.vue` using current filters and blob download.
- Frontend tests: extend reimbursement store and page source tests for endpoint, blob response, permission-gated export entry and feedback copy.
- Docs/closeout: create Phase 27 verification/UAT artifacts and update planning state after export implementation passes.

</code_context>

<deferred>
## Deferred Ideas

- 报销统计看板、图表分析、趋势汇总 — 明确不属于 v1.4，后续单独评估。
- 付款打款、会计凭证、财务系统对接 — 财务闭环集成方向，不进入 Phase 27。
- OCR、发票真伪查验、自动验重、自动金额识别 — 继续保持 v1.4 out of scope。
- 按金额动态分支、多级会签、委托、超时升级 — 固定两级审核稳定后再评估。
- 到访 Excel 导出 — v1.3 已明确不做，不能混入报销导出收尾。

</deferred>

---

*Phase: 27-reimbursement-export-validation*
*Context gathered: 2026-05-03*
