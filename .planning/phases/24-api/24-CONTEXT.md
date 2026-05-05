# Phase 24: 报销数据模型 + 附件上传 API - Context

**Gathered:** 2026-05-02 (auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

建立 v1.4 固定报销模块的后端基础：新增报销申请、附件和审核轨迹 Prisma 模型，补齐报销权限种子，并交付 `/api/v1/reimbursements` 后端 API，支持草稿创建/编辑、提交进入部门初审、分页筛选列表、详情、附件上传、图片预览和原文件下载。Phase 24 只交付数据层、权限、附件存储和后端接口契约；员工申请页面属于 Phase 25，两级审核签字操作属于 Phase 26，Excel 明细导出和 UAT 收尾属于 Phase 27。

</domain>

<decisions>
## Implementation Decisions

### 固定数据模型与状态
- **D-01:** 报销采用固定业务模型，不复用 `ApprovalApplication` 或自定义表单 JSONB 作为主数据；新增独立 `ReimbursementApplication`、`ReimbursementAttachment`、`ReimbursementAction`/审核轨迹类表。
- **D-02:** `ReimbursementApplication` 保存显式业务字段：申请编号、标题、类别、发生日期、金额、事由、收款信息、备注、申请人/部门快照、当前状态、提交时间、完成时间、创建/更新时间。
- **D-03:** 金额使用 Prisma Decimal（建议 `@db.Decimal(12,2)`）并在后端校验 `> 0`；标题、类别、发生日期、金额、事由为必填，收款信息和备注可选。
- **D-04:** 状态使用枚举而不是自由字符串，至少覆盖 `DRAFT`、`DEPARTMENT_REVIEW`、`FINANCE_REVIEW`、`APPROVED`、`REJECTED`；Phase 24 只实现 `DRAFT -> DEPARTMENT_REVIEW` 提交流转，后续审核流转由 Phase 26 接入。
- **D-05:** 草稿阶段允许申请人更新核心字段和附件；一旦提交进入审核流，申请人不可直接修改核心字段，后续只能通过审核/驳回轨迹表达变化。

### 权限与可见性
- **D-06:** 新增报销权限码并统一放入 `backend/prisma/seed.ts` 的权限种子，建议最小集合为 `reimbursement:create`、`reimbursement:own`、`reimbursement:list`、`reimbursement:department-review`、`reimbursement:finance-review`、`reimbursement:attachment`、`reimbursement:export`。
- **D-07:** `ADMIN` 继续通过全量权限自动继承；`EMPLOYEE` 默认获得 `reimbursement:create`、`reimbursement:own`、`reimbursement:attachment`，但附件和详情仍必须做对象级权限校验。
- **D-08:** 普通员工只能查看自己提交的申请和附件；拥有 `reimbursement:list` 的用户可查看全部报销申请；拥有部门审核权限的用户仅处理/查看同部门待初审申请；拥有财务审核权限的用户可查看财务复核阶段申请。
- **D-09:** 前端按钮显隐不是安全边界；Phase 24 后端所有列表、详情、附件访问和提交接口都必须基于 `currentUser`、权限码和申请归属重新校验。

### 后端 API 契约
- **D-10:** 报销后端模块挂载为 `/api/v1/reimbursements`，保持与 `visitModule`、`approvalApplicationModule` 相同的 Elysia module + `authGuard` + TypeBox schema 风格。
- **D-11:** 列表接口 `GET /reimbursements` 返回 `{ rows, total, page, size }`，支持 `status`、`category`、`dateFrom`、`dateTo`、`keyword` 分页筛选；`page/size` 兜底并限制单页最大 100。
- **D-12:** 详情接口 `GET /reimbursements/:id` 返回申请基础信息、附件元数据和审核轨迹；日期统一序列化为 ISO 字符串，发生日期由前端按 `YYYY-MM-DD` 展示。
- **D-13:** 写入接口采用草稿优先契约：`POST /reimbursements` 创建草稿，`PUT /reimbursements/:id` 仅允许草稿申请人编辑，`POST /reimbursements/:id/submit` 校验必填和金额后进入部门初审。
- **D-14:** 类别先存为字符串，不新增报销类别字典/维护接口；筛选按现有字符串字段处理，避免 Phase 24 扩大为字典管理。

### 附件上传、预览与下载
- **D-15:** 附件使用本地文件系统存储，路径建议在仓库外或后端运行目录下的 `uploads/reimbursements/{applicationId}/`；数据库只保存相对路径和元数据，不向客户端暴露真实磁盘路径。
- **D-16:** 上传文件名使用服务端生成的安全文件名（如 nanoid + 扩展名），保留 `originalName`、`mimeType`、`size`、`uploaderId`、`createdAt` 供详情和下载展示。
- **D-17:** 支持的文件类型限定为图片和 PDF，建议后端白名单为 `image/jpeg`、`image/png`、`image/webp`、`application/pdf`；每个文件默认上限 10MB，每个申请默认最多 20 个附件。
- **D-18:** 附件接口建议为 `POST /reimbursements/:id/attachments`、`GET /reimbursements/:id/attachments/:attachmentId/preview`、`GET /reimbursements/:id/attachments/:attachmentId/download`、`DELETE /reimbursements/:id/attachments/:attachmentId`；删除仅允许草稿申请人或管理员，提交后附件不直接删除。
- **D-19:** 图片预览接口以内联响应返回图片内容；PDF 和原始附件通过下载接口返回，并设置清晰的 `Content-Type` 与 `Content-Disposition`。
- **D-20:** Phase 24 不做 OCR、发票查验、自动验重、自动识别金额、病毒扫描或云对象存储；只做类型/大小校验、本地留存和访问控制。

### 审核轨迹基础
- **D-21:** 新增报销审核轨迹采用追加写入模式，记录提交、部门通过/驳回、财务通过/驳回、签字、意见、操作者和时间，复用 Phase 15/18 的 action + timeline 思路但不复用通用审批表。
- **D-22:** 手写签名图片的最终上传/保存由 Phase 26 实现；Phase 24 的模型需要预留签名文件路径/MIME/大小或 action payload 字段，使部门初审和财务复核通过时能绑定签名。
- **D-23:** 提交动作在 Phase 24 需要写入轨迹，后续审核动作由 Phase 26 在同一轨迹表追加，保证申请详情可以按时间顺序展示完整闭环。

### the agent's Discretion
- 具体模型/字段命名可在保持语义清晰和 Prisma 风格一致的前提下由实现者决定。
- 附件目录的运行时配置名、默认目录和创建目录方式由实现者决定，但不得把上传文件提交到 Git。
- 是否拆分为 `reimbursement.route.ts`、`reimbursement.service.ts`、`reimbursement-file.service.ts` 由 planner 按任务粒度决定；不得把复杂文件逻辑全部堆在路由处理函数里。
- Phase 24 可补充小型状态机/权限 helper，以减少 Phase 26 审核实现重复。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 24 goal, dependencies, success criteria and Phase 25-27 boundaries.
- `.planning/REQUIREMENTS.md` — `REIM-01` through `REIM-04`, `INV-01` through `INV-04`, `PERM-01` through `PERM-03`, `NFR-01` and `NFR-02`.
- `.planning/PROJECT.md` — v1.4 fixed-module decision, out-of-scope list, stack constraints and reimbursement key decisions.
- `.planning/STATE.md` — current v1.4 position and watch-outs.

### Prior locked decisions and reusable patterns
- `.planning/phases/20-api/20-CONTEXT.md` — fixed business module backend pattern, permission seed pattern, `/api/v1/visits` route contract and Phase 21-23 boundary discipline.
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-CONTEXT.md` — append-only business event, RBAC/export and archive visibility decisions.
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-PATTERNS.md` — ExcelJS export, permission/module extension and event model patterns relevant to Phase 27 compatibility.
- `.planning/phases/15-approval-data-model-state-machine/15-CONTEXT.md` — explicit state machine and action/timeline modeling decisions.
- `.planning/phases/17-my-applications-dynamic-submission/17-CONTEXT.md` — applicant-owned create/list/detail and submit flow patterns.
- `.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md` — approval task/detail visibility and mobile-safe audit trail patterns for later Phase 26.

### Source files to inspect before planning
- `backend/prisma/schema.prisma` — current model, enum, relation, timestamp and index conventions.
- `backend/prisma/seed.ts` — centralized permission definitions, ADMIN full-permission assignment and EMPLOYEE baseline permissions.
- `backend/src/index.ts` — `/api/v1` module registration pattern.
- `backend/src/middlewares/auth.ts` — `authGuard(requiredPerm)` and `currentUser` derivation.
- `backend/src/utils/errors.ts` — `BizError`, `notFound`, `forbidden` and `unauthorized` response pattern.
- `backend/src/modules/visit/visit.route.ts` — fixed-module CRUD/list/filter/import backend pattern and `{ rows, total, page, size }` response style.
- `backend/src/modules/approval/application-submission.service.ts` — applicant-owned draft/submit/list/detail helper patterns.
- `backend/src/modules/approval/application.service.ts` — transaction-bound action/timeline append and state transition patterns.
- `backend/src/modules/approval/state-machine.ts` — compact explicit transition guard style.
- `backend/src/modules/approval/archive-export.service.ts` — ExcelJS workbook generation and export safety patterns for Phase 27 compatibility.
- `backend/package.json` — current backend dependencies; Phase 24 should prefer Bun/Elysia built-ins before adding upload dependencies.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/schema.prisma`: has `User`, `Department`, permission tables, approval action/timeline tables and `VisitRecord`; Phase 24 should add reimbursement relations to `User`/`Department` where needed and follow existing index/timestamp style.
- `backend/prisma/seed.ts`: `PERMISSIONS` array and `EMPLOYEE_PERMISSION_CODES` are the single seed source; adding reimbursement permissions here keeps ADMIN inheritance automatic.
- `backend/src/middlewares/auth.ts`: exposes `currentUser.id`, `realName`, roles and permissions for applicant attribution, reviewer authorization and object ACL checks.
- `backend/src/modules/visit/visit.route.ts`: closest fixed business API analogue for list/detail/create/update and date/keyword filters.
- `backend/src/modules/approval/application.service.ts`: transaction pattern for state changes plus append-only action/timeline writes.
- `backend/src/modules/approval/archive-export.service.ts`: already uses ExcelJS and includes export row cap/sanitization patterns that Phase 27 should reuse.

### Established Patterns
- Backend modules are Elysia route modules under `backend/src/modules/{domain}/`, registered in `backend/src/index.ts` under `/api/v1`.
- Route validation uses Elysia `t.Object` schemas with `additionalProperties: false` for write payloads.
- Business errors throw `BizError`/`notFound` and are normalized globally by `src/index.ts`.
- Lists return `{ rows, total, page, size }`, parse query strings defensively and cap `size` to 100.
- State changes that create side effects should run inside `prisma.$transaction`.

### Integration Points
- Prisma migration: add reimbursement enums/models, relations and query indexes in `backend/prisma/schema.prisma`.
- Permission seed: add reimbursement permission constants and definitions in `backend/prisma/seed.ts`; update EMPLOYEE baseline permissions.
- Backend module: add `backend/src/modules/reimbursement/` route/service files and register `reimbursementModule` in `backend/src/index.ts`.
- File storage: add a local upload directory strategy and ensure generated files are ignored by Git/Docker as needed.
- Later frontend phases will consume `/api/v1/reimbursements`, attachment preview/download endpoints and exact status values; avoid renaming these contracts after Phase 24.

</code_context>

<specifics>
## Specific Ideas

- v1.4 要像 v1.3 到访模块一样做固定业务模块：字段稳定、查询直接、权限清晰，不把通用表单系统扩展成文件上传平台。
- 报销附件以“留存凭证”为目标，图片可预览、PDF/原文件可下载即可；不做发票智能识别。
- 报销审核固定为部门初审 + 财务复核，Phase 24 只铺好状态和轨迹基础，避免提前实现 Phase 26 UI/签字交互。

</specifics>

<deferred>
## Deferred Ideas

- OCR、发票真伪查验、自动验重、自动金额识别 — 明确不属于 v1.4。
- 预算控制、付款打款、会计凭证、财务系统对接 — 财务系统集成方向，Phase 24 不建模。
- 报销统计看板和图表分析 — v1.4 只做明细导出。
- 金额动态分支、多级会签、委托、超时升级 — 固定两级审核稳定后再评估。

</deferred>

---

*Phase: 24-api*
*Context gathered: 2026-05-02*
