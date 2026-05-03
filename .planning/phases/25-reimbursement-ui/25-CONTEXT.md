# Phase 25: 员工报销申请与详情页面 - Context

**Gathered:** 2026-05-03 (auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

交付 v1.4 固定报销模块的员工侧前端：新增报销管理入口，员工可在 PC/Mobile 填写固定报销字段、保存/编辑草稿、上传图片/PDF 发票附件、提交进入部门初审，并在“我的报销”列表和详情页追踪状态、查看附件、图片预览/PDF 或原文件下载、阅读已产生的审核轨迹。Phase 25 只消费 Phase 24 已锁定的 `/api/v1/reimbursements` 后端契约；部门/财务审核队列、通过/驳回、Canvas 手写签字属于 Phase 26，Excel 明细导出和 UAT/归档属于 Phase 27。

</domain>

<decisions>
## Implementation Decisions

### 页面入口与权限
- **D-01:** 新增固定业务模块入口 `/reimbursements`，页面和菜单文案使用“报销管理”/“我的报销”，不放入动态“审批管理”模板申请流，也不复用公开表单填写页。
- **D-02:** 报销列表和详情路由使用 `permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review']`，避免只持有全量/审核查看权限的用户被员工 own 权限挡住；普通员工仍由后端对象级可见性限制为只看本人申请。
- **D-03:** 新建/编辑/提交入口按 `reimbursement:create` 显示；附件上传、预览、下载、删除入口按 `reimbursement:attachment` 显示；前端按钮显隐不是安全边界，后端 Phase 24 权限和对象校验仍是最终裁决。
- **D-04:** Phase 25 不新增部门审核、财务审核、通过/驳回、签名采集或导出菜单；如页面需要操作区，只展示员工侧创建、草稿编辑、提交和附件操作。

### 列表、筛选与状态展示
- **D-05:** `/reimbursements` 使用固定台账式列表：桌面端 `QTable` + server-side pagination，移动端卡片列表，延续 `VisitPage.vue` 和 `ApprovalApplicationPage.vue` 的加载骨架、错误重试、EmptyState、底部筛选弹窗模式。
- **D-06:** 列表接口严格消费 `GET /reimbursements` 的 `{ rows, total, page, size }` 契约，筛选只提交 `status`、`category`、`dateFrom`、`dateTo`、`keyword`、`page`、`size`，空筛选不传。
- **D-07:** 桌面表格优先展示可扫描字段：申请编号、标题、类别、金额、发生日期、状态、附件数量、申请人、更新时间和操作；移动卡片优先展示标题/状态、申请编号、类别/金额、发生日期、附件数量和更新时间。
- **D-08:** 状态值保持 Phase 24 枚举：`DRAFT`、`DEPARTMENT_REVIEW`、`FINANCE_REVIEW`、`APPROVED`、`REJECTED`；前端新增状态 label/color helper，分别展示“草稿”“部门初审”“财务复核”“已通过”“已驳回”。
- **D-09:** 类别是自由字符串，不新增类别字典、筛选选项 API 或类别维护 UI；表单和筛选都使用文本输入或自由输入控件。
- **D-10:** 日期输入、筛选和展示统一使用 `YYYY-MM-DD`，发生日期从后端 ISO 字符串展示为日期部分，避免 locale/timezone 漂移。

### 申请表单与草稿提交流程
- **D-11:** 报销申请使用固定字段表单，不复用 `GridFormRenderer` 或 `ApprovalApplication` 动态模板：标题、类别、发生日期、金额、事由为必填，收款信息和备注可选。
- **D-12:** 前端校验与后端口径一致：标题/类别/事由 trim 后不能为空，金额必须为大于 0 的数值并按两位小数提交，发生日期必须有效；后端仍二次校验。
- **D-13:** 申请表单建议使用全页模式而不是窄抽屉：`/reimbursements/new` 创建，`/reimbursements/:id/edit` 编辑草稿，桌面端居中卡片/分区，移动端单列并使用 sticky 底部“保存草稿/提交申请”操作区。
- **D-14:** 附件上传依赖已有申请 ID；新建页在保存草稿成功前禁用附件区并提示“先保存草稿后上传附件”，不做本地待上传队列和无 ID 上传。
- **D-15:** 如果用户在新建页直接点“提交申请”，前端应先通过固定字段校验并创建草稿，再调用 `POST /reimbursements/:id/submit`；提交成功后进入详情页并显示部门初审状态。
- **D-16:** 只有 `DRAFT` 状态允许员工编辑核心字段、上传附件和删除附件；一旦提交进入 `DEPARTMENT_REVIEW` 或后续状态，表单字段、附件删除和重新提交入口隐藏/禁用。
- **D-17:** 附件不是 Phase 24 后端强制必填字段，Phase 25 不新增前端硬阻断；可在提交前提示“建议上传发票或凭证”，但不得与后端契约产生必填不一致。

### 附件上传、预览与下载
- **D-18:** 上传控件使用 Quasar `QFile`/按钮选择，前端先限制 `image/jpeg`、`image/png`、`image/webp`、`application/pdf`、单文件 10MB、最多 20 个附件；后端仍最终校验。
- **D-19:** 后端上传接口每次接收单个 `file` 字段，前端多选文件时按顺序逐个 `FormData` 上传到 `POST /reimbursements/:id/attachments`，并在每个失败项上给出清晰反馈。
- **D-20:** 附件列表展示原始文件名、类型、大小、上传时间和操作；图片显示“预览/下载”，PDF 显示“下载”，不做 OCR、验真、自动识别金额或自动去重。
- **D-21:** 图片预览和下载必须通过 axios authenticated blob 请求，不能直接把受保护的 preview/download URL 塞进 `<img src>` 或浏览器新窗口；图片预览使用 `URL.createObjectURL` 并在关闭/卸载时 revoke。
- **D-22:** PDF 和原文件下载使用 `GET /reimbursements/:id/attachments/:attachmentId/download` 的 blob 响应，并优先用附件 `originalName` 作为下载文件名。
- **D-23:** 删除附件只在草稿状态显示，调用 `DELETE /reimbursements/:id/attachments/:attachmentId` 后刷新详情/附件列表；提交后附件只能查看和下载。

### 详情页与审核轨迹
- **D-24:** 报销详情使用全页详情模式，桌面端可采用主内容 + 右侧信息栏，移动端单列；详情展示申请基础信息、金额/发生日期/收款信息/备注、当前审核状态、附件列表和审核轨迹。
- **D-25:** 当前审核状态按状态枚举解释：`DRAFT` 为草稿，`DEPARTMENT_REVIEW` 为部门初审中，`FINANCE_REVIEW` 为财务复核中，终态展示通过/驳回和完成时间。
- **D-26:** 审核轨迹只读展示 Phase 24/26 写入的 `actions`：提交、部门通过/驳回、财务通过/驳回、意见、操作者和时间；Phase 25 不提供审核动作表单或签名采集。
- **D-27:** 详情中如后续动作已带签名元数据，可预留只读展示区域，但签名上传、签名校验和审核操作仍归 Phase 26 实现。
- **D-28:** 草稿详情/编辑入口应突出“继续编辑”和“提交申请”；非草稿详情只展示只读信息和附件查看下载。

### 前端数据层与测试
- **D-29:** 新增 `frontend/src/types/reimbursement.ts`，集中定义 DTO、状态常量、筛选 keys、写入 payload、附件/action 类型、金额/日期/文件大小格式化和 payload normalization helper。
- **D-30:** 新增 `frontend/src/stores/reimbursement.ts`，集中封装 `/reimbursements` API：`fetchList`、`fetchDetail`、`createDraft`、`updateDraft`、`submitDraft`、`uploadAttachment`、`previewAttachmentBlob`、`downloadAttachment`、`deleteAttachment`，维护 list/detail/action/upload/download loading。
- **D-31:** 新增页面/组件优先拆分为列表页、表单页、详情页、状态 chip、附件列表/上传组件和只读轨迹组件，避免把上传、表单和详情逻辑全部堆进单个页面。
- **D-32:** 规划时应补充聚焦前端契约测试：路由/menu 权限、store API 路径和 FormData 字段名、状态 helper、金额/日期 normalization、列表桌面/移动元素、草稿前附件禁用、blob 预览/下载调用和提交后只读行为。

### the agent's Discretion
- 表单分组标题、状态 chip 颜色、列表列宽、空状态文案、文件图标、附件上传进度样式和错误提示细节可由 planner/实现按现有 Quasar OA 风格决定。
- 详情页是否拆成 `ReimbursementDetailPage.vue` + 子组件，或在首版少量组件内实现，由 planner 按可维护性决定，但数据/API 层必须独立于页面。
- 对于拥有 `reimbursement:list` 或后续审核查看权限的用户，Phase 25 可先复用同一个列表/详情体验，不新增“全部报销/待审核”专用工作台。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 25 goal, dependency on Phase 24, success criteria and Phase 26/27 boundaries.
- `.planning/REQUIREMENTS.md` — `REIM-01` through `REIM-04`, `INV-01`, `INV-03`, `UX-01`, `UX-02`, `PERM-01` and `PERM-02`.
- `.planning/PROJECT.md` — v1.4 fixed-module decision, out-of-scope list, stack constraints and reimbursement key decisions.
- `.planning/STATE.md` — Phase 24 complete, Phase 25 current focus, Phase 24 backend verification caveat and watch-outs.

### Locked reimbursement backend contract
- `.planning/phases/24-api/24-CONTEXT.md` — locked reimbursement model, status, permission, API, attachment and audit-trail decisions that Phase 25 must consume.
- `.planning/phases/24-api/24-RESEARCH.md` — Phase 24 backend contract rationale, endpoint list, attachment constraints and frontend-deferred manual checks.
- `.planning/phases/24-api/24-VERIFICATION.md` — focused reimbursement backend suite/build green and known unrelated approval full-suite failures.
- `backend/src/modules/reimbursement/reimbursement.route.ts` — exact Elysia routes, query/body schemas, auth guards, attachment endpoints and `file` upload field.
- `backend/src/modules/reimbursement/reimbursement.service.ts` — DTO serialization, amount/date normalization, visibility filters, draft mutation and submit behavior.
- `backend/src/modules/reimbursement/reimbursement.state.ts` — status values and legal state transitions.
- `backend/src/modules/reimbursement/reimbursement-file.service.ts` — MIME whitelist, 10MB limit, 20 attachment cap, safe path and response header rules.
- `backend/prisma/schema.prisma` — reimbursement enums/models/relations/indexes and Decimal amount shape.
- `backend/prisma/seed.ts` — reimbursement permission codes and employee/admin grants.
- `backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts` — route/API contract tests for list/detail/create/update/submit and object access.
- `backend/src/modules/reimbursement/__tests__/reimbursement-file.service.test.ts` — file safety contract tests for upload/preview/download behavior.

### Frontend patterns to reuse
- `.planning/phases/21-crud/21-CONTEXT.md` — fixed-module frontend route/menu/list/filter/form/detail decisions and Phase 22/23 boundary discipline.
- `.planning/phases/17-my-applications-dynamic-submission/17-CONTEXT.md` — applicant-owned create/list/detail, draft/submit and mobile sticky action decisions.
- `.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md` — full-page detail, mobile card/filter sheet, timeline and sticky action safety patterns.
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-CONTEXT.md` — permission-gated operations, append-only event display and export boundary patterns.
- `.planning/phases/22-excel/22-CONTEXT.md` — file selection UI, local validation, per-operation feedback and fixed-module store extension patterns.
- `frontend/src/router/routes.ts` — route metadata conventions and lazy page registration.
- `frontend/src/router/index.ts` — `meta.perm` / `meta.permAny` route guard behavior.
- `frontend/src/layouts/MainLayout.vue` — menu config, desktop/mobile navigation and permission filtering.
- `frontend/src/boot/axios.ts` — authenticated axios instance, refresh handling and global negative Notify behavior.
- `frontend/src/boot/perm.ts` — `v-perm` action visibility directive.
- `frontend/src/stores/auth.ts` — `hasPerm` / `hasAnyPerm` helpers for menus and conditional UI.
- `frontend/src/composables/useResponsive.ts` — canonical PC/Mobile breakpoint helper.
- `frontend/src/pages/VisitPage.vue` — fixed-module `QTable`, mobile cards, filter sheet, skeleton/error/empty state and toolbar action pattern.
- `frontend/src/components/visit/VisitFormDialog.vue` — fixed business form grouping, q-form and mobile maximized dialog reference.
- `frontend/src/components/visit/VisitImportDialog.vue` — `QFile`, file type selection, local validation and per-operation feedback pattern.
- `frontend/src/stores/visit.ts` — fixed-module Pinia list/detail/action loading and empty-filter param building pattern.
- `frontend/src/types/visit.ts` — DTO/filter keys/normalization helper organization pattern.
- `frontend/src/pages/ApprovalApplicationFormPage.vue` — authenticated applicant form save/submit and mobile sticky bottom action pattern.
- `frontend/src/pages/ApprovalApplicationDetailPage.vue` — full-page detail, summary card, status chip and timeline layout.
- `frontend/src/pages/ApprovalTaskDetailPage.vue` — detail-side/mobile sticky action layout reference for later Phase 26 compatibility.
- `frontend/src/components/approval/ApplicationTimeline.vue` — timeline rendering pattern to adapt for reimbursement actions.
- `frontend/src/components/approval/ApplicationStatusChip.vue` — status chip component pattern to clone/adapt.
- `frontend/src/components/EmptyState.vue` — reusable empty-state component.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/modules/reimbursement/reimbursement.route.ts`: provides locked `/reimbursements` list/detail/create/update/submit and attachment upload/preview/download/delete endpoints; upload body field is `file`.
- `backend/src/modules/reimbursement/reimbursement.service.ts`: serializes `amount` as string, dates as ISO strings, adds `attachmentCount`, and implements own/list/department/finance visibility that the UI must not second-guess.
- `backend/src/modules/reimbursement/reimbursement-file.service.ts`: defines image/PDF MIME whitelist, 10MB file limit and 20 attachment cap for mirrored frontend validation.
- `frontend/src/router/routes.ts` and `frontend/src/router/index.ts`: already support `permAny`, which Phase 25 should use for reimbursement read routes.
- `frontend/src/layouts/MainLayout.vue`: `MenuConfig` supports `permAny` and nested/flat menu filtering for adding a reimbursement entry without new navigation infrastructure.
- `frontend/src/pages/VisitPage.vue`: strongest fixed-module precedent for desktop table, mobile card, top filters, mobile filter sheet, permission buttons and EmptyState.
- `frontend/src/stores/visit.ts` and `frontend/src/types/visit.ts`: established fixed-module API/store/type organization, including filter merging and payload normalization helpers.
- `frontend/src/pages/ApprovalApplicationFormPage.vue`: existing sticky mobile save/submit pattern for applicant-owned flow.
- `frontend/src/pages/ApprovalApplicationDetailPage.vue` and `frontend/src/components/approval/ApplicationTimeline.vue`: detail summary + timeline layout and read-only action history display.
- `frontend/src/components/visit/VisitImportDialog.vue`: useful `QFile`/FileReader feedback style, but reimbursement upload must send files to backend as multipart, not parse locally.
- `frontend/src/boot/axios.ts`: authenticated requests mean protected preview/download should be implemented as blob requests through `api`, not unauthenticated direct URLs.

### Established Patterns
- 前端业务域使用独立 `types/*.ts` + `stores/*.ts` + page/component 组合，API 调用集中在 Pinia store。
- 桌面列表用 `QTable` + `@request` server-side pagination，移动端用 `QCard` 列表和底部筛选弹窗。
- 路由入口由 `meta.perm`/`meta.permAny` 控制，按钮/操作由 `v-perm` 或 `auth.hasPerm` 控制，后端仍负责真实权限与对象范围。
- 日期型筛选和业务日期展示使用 `YYYY-MM-DD`，不在 UI 暴露 ISO 时区细节。
- 长表单、附件列表和时间线优先使用全页详情/编辑体验；移动端通过 sticky action 和底部 padding 避免操作区遮挡内容。
- 成功操作使用 Quasar positive Notify；上传/提交失败需要保留当前页面状态并显示可理解的负向反馈。

### Integration Points
- 新增 `frontend/src/types/reimbursement.ts`，定义 Phase 24 DTO/status/filter/write/attachment/action 契约和 helper。
- 新增 `frontend/src/stores/reimbursement.ts`，封装 `/reimbursements` API、multipart upload、authenticated blob preview/download 和 loading 状态。
- 新增 `frontend/src/pages/ReimbursementPage.vue`、`ReimbursementFormPage.vue`、`ReimbursementDetailPage.vue`，以及可选 `frontend/src/components/reimbursement/*` 子组件。
- 修改 `frontend/src/router/routes.ts` 增加 `/reimbursements`、`/reimbursements/new`、`/reimbursements/:id/edit`、`/reimbursements/:id` 路由。
- 修改 `frontend/src/layouts/MainLayout.vue` 增加报销管理菜单，使用 `permAny` 与 Phase 24 reimbursement read permissions 对齐。
- 增加聚焦前端测试，覆盖 store API 契约、路由/menu 权限、状态 helper、固定表单校验、附件禁用/上传/下载和响应式列表关键结构。

</code_context>

<specifics>
## Specific Ideas

- `[auto]` No existing Phase 25 context or plans were found; no pending todos matched this phase.
- `[auto]` Selected all gray areas and accepted recommended defaults for route/menu permissions, fixed-module responsive list, free-text filters, draft-first upload flow, authenticated blob preview/download, read-only detail timeline and frontend data-layer split.
- 报销体验应像内部台账 + 申请中心：字段固定、入口清晰、保存草稿后上传凭证、提交后只读追踪，不把用户带回动态审批模板系统。
- 附件上传的关键 UX 是“先生成草稿 ID，再上传附件”；不要设计成未保存表单也能直接上传。
- 图片预览/附件下载的关键技术约束是 authenticated blob 请求；不要规划直接公开文件 URL。
- Phase 25 保持员工侧克制：看得到状态和轨迹，但不处理审核动作。

</specifics>

<deferred>
## Deferred Ideas

- 部门初审列表、财务复核列表、通过/驳回操作、驳回原因输入、Canvas 手写签名采集、签名上传和审核操作面板 — Phase 26。
- 报销 Excel 明细导出、导出权限入口、端到端 UAT、里程碑归档材料 — Phase 27。
- OCR、发票真伪查验、自动验重、自动识别金额、预算/付款/会计凭证/财务系统对接、统计看板、金额分支、会签、委托和超时升级 — 明确不属于 v1.4/Phase 25。
- 通用自定义表单附件字段 — v1.4 只给固定报销模块做发票附件。

</deferred>

---

*Phase: 25-reimbursement-ui*
*Context gathered: 2026-05-03*
