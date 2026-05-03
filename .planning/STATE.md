---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: 报销管理
status: executing
last_updated: "2026-05-03T09:30:00.000Z"
last_activity: 2026-05-03 -- Phase 27 Plan 27-01 contracts completed
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 48
  completed_plans: 45
  percent: 94
---

# State

- Initialized: 2026-04-17
- Milestone: v1.4 报销管理 — ACTIVE
- Status: Phase 27 Plan 27-01 complete; ready to execute Plan 27-02

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-02)

**Core value:** 开箱即用的组织架构管理、表单审批和固定业务台账
**Current focus:** Phase 27 — reimbursement-export-validation

## Current Position

Phase: 27 (reimbursement-export-validation) — EXECUTING
Plan: 2 of 4
Status: Plan 27-01 complete; executing Plan 27-02
Last activity: 2026-05-03 -- Phase 27 Plan 27-01 contracts completed

Progress: [█████████░] 94%

## Roadmap Summary

- Phase 24: 报销数据模型 + 附件上传 API — complete
- Phase 25: 员工报销申请与详情页面 — complete
- Phase 26: 两级审核与手写签字 — complete
- Phase 27: 报销导出 + 验证收尾 — planned

## Performance Metrics

**Velocity:**

- Total plans completed: 105 (25 v1.0 + 13 v1.1 + 16 v1.2 + 32 v2.0 + 10 v1.3 + 4 v1.4 Phase 25 + 4 v1.4 Phase 26 + 1 v1.4 Phase 27)
- v1.2 commits: ~50
- v1.2 LOC added: 17,172

**Plan Execution:**

- Phase 19 Plan 19-01: 580s, 3 tasks, 7 files, completed 2026-04-26
- Phase 19 Plan 19-02: 370s, 3 tasks, 6 files, completed 2026-04-26
- Phase 19 Plan 19-03: 612s, 3 tasks, 6 files, completed 2026-04-26
- Phase 19 Plan 19-04: 345s, 3 tasks, 6 files, completed 2026-04-26
- Phase 19 Plan 19-05: 1006s, 3 tasks, 10 files, completed 2026-04-26
- Phase 19 Plan 19-06: 533s, 3 tasks, 5 files, completed 2026-04-26
- Phase 19 Plan 19-07: 515s, 3 tasks, 5 files, completed 2026-04-26
- Phase 19 Plan 19-08: 1080s, 3 tasks, 6 files, completed 2026-04-26
- Phase 19 Plan 19-09: 624s, 2 tasks, 4 files, completed 2026-04-26
- Phase 19 Plan 19-10: 395s, 2 tasks, 2 files, completed 2026-04-26
- Phase 20 Plan 20-01: same session, 3 tasks, 4 files, completed 2026-05-02
- Phase 20 Plan 20-02: same session, 3 tasks, 4 files, completed 2026-05-02
- Phase 20 Plan 20-03: same session, 3 tasks, 5 files, completed 2026-05-02
- Phase 21 Plan 21-01: same session, 3 tasks, 3 files, completed 2026-05-02
- Phase 21 Plan 21-02: same session, 3 tasks, 4 files, completed 2026-05-02
- Phase 21 Plan 21-03: same session, 4 tasks, 2 files, completed 2026-05-02
- Phase 22 Plan 22-01: same session, 3 tasks, 6 files, completed 2026-05-02
- Phase 22 Plan 22-02: same session, 4 tasks, 5 files, completed 2026-05-02
- Phase 23 Plan 23-01: same session, 3 tasks, 2 files, completed 2026-05-02
- Phase 23 Plan 23-02: same session, 5 tasks, 8 files, completed 2026-05-02
- Phase 24 Plan 24-01: same session, 4 tasks, 4 test files, completed 2026-05-03
- Phase 24 Plan 24-02: same session, 3 tasks, 5 files, completed 2026-05-03
- Phase 24 Plan 24-03: same session, 3 tasks, 5 files, completed 2026-05-03
- Phase 24 Plan 24-04: same session, 3 tasks, 3 implementation files plus planning updates, completed 2026-05-03
- Phase 25 Plan 25-01: same session, 3 tasks, 3 frontend contract test files, completed 2026-05-03
- Phase 25 Plan 25-02: same session, 3 tasks, 4 frontend shell files, completed 2026-05-03
- Phase 25 Plan 25-03: same session, 3 tasks, 3 form/attachment UI files, completed 2026-05-03
- Phase 25 Plan 25-04: same session, 4 tasks, 5 list/detail/validation files, completed 2026-05-03
- Phase 26 Plan 26-01: same session, 3 tasks, backend/frontend reimbursement review contracts, completed 2026-05-03
- Phase 26 Plan 26-02: same session, 3 tasks, backend review queues/actions/signatures/routes, completed 2026-05-03
- Phase 26 Plan 26-03: same session, 3 tasks, frontend review store/signature/timeline support, completed 2026-05-03
- Phase 26 Plan 26-04: same session, 3 tasks, reviewer queue/detail UI and validation closeout, completed 2026-05-03
- Phase 27 Plan 27-01: same session, 3 tasks, backend/frontend export contracts, completed 2026-05-03
- Phase 27 Plan 27-02: planned, backend export service and route
- Phase 27 Plan 27-03: planned, frontend export store and toolbar UX
- Phase 27 Plan 27-04: planned, final validation, UAT and v1.4 archive closeout

## Accumulated Context

### Decisions

Archived to PROJECT.md Key Decisions table.

- [Phase 24]: 报销管理采用固定 Prisma 业务模型，不复用 ApprovalApplication 或表单 JSON 作为主数据。
- [Phase 24]: 报销金额使用 Decimal(12,2)，状态和动作使用固定枚举，常用列表筛选字段保留索引。
- [Phase 24]: EMPLOYEE 默认仅拥有 reimbursement:create、reimbursement:own、reimbursement:attachment；list/review/export 权限保持显式授权。
- [Phase 24]: 报销列表/详情先通过 authGuard() 登录鉴权，再按 own/list/department-review/finance-review/admin 读权限和对象可见性过滤，避免 reviewer/list 用户被 own-only guard 阻断。
- [Phase 24]: 报销附件本地存储只在数据库保存相对路径；文件服务统一限制 JPEG/PNG/WebP/PDF、10MB 单文件和 20 个附件上限。
- [Phase 24]: Phase 24 focused backend suite and backend build are green; repository-wide backend suite still has existing non-Phase-24 approval archive/task failures.
- [Phase 25]: 报销前端采用固定业务模块和 `/reimbursements` 路由族，不复用动态审批申请页面。
- [Phase 25]: 报销管理菜单为顶层入口，列表/详情使用 own/list/department-review/finance-review 的 `permAny` 读权限。
- [Phase 25]: 附件上传必须先保存草稿获得申请 ID；图片预览和下载统一通过 `useReimbursementStore` 的 authenticated blob 请求和 object URL。
- [Phase 25]: Phase 25 仅交付员工创建、我的报销、详情和附件操作；部门/财务审核、签名和导出继续留给 Phase 26/27。
- [Phase 25]: Focused reimbursement frontend contracts and Quasar build are green；full frontend suite still has existing `localStorage`/`document` test environment failures outside Phase 25 scope.
- [Phase 26]: 报销审核固定为部门初审到财务复核两级流转，状态流为 `DEPARTMENT_REVIEW -> FINANCE_REVIEW -> APPROVED/REJECTED`。
- [Phase 26]: 审核签名作为 `ReimbursementAction` 证据保存，使用独立 signature 相对路径和受保护预览端点，不写入普通附件表。
- [Phase 26]: 部门/财务审核队列使用 `/reimbursements/review/department` 与 `/reimbursements/review/finance`，和普通可见列表保持边界清晰。
- [Phase 26]: 前端签名预览通过 authenticated blob 请求和 object URL 渲染，不在模板中直连受保护文件 URL。
- [Phase 26]: Phase 26 focused backend/frontend suites and backend/frontend builds are green; export remains Phase 27 scope.
- [Phase 27]: 报销导出锁定为 `/reimbursements` 当前筛选条件明细 Excel，不新增统计看板、OCR、付款打款、会计凭证或复杂流程。
- [Phase 27]: 导出后端使用 `reimbursement:export` 权限、ExcelJS 服务端生成、2,000 行上限、公式注入防护和固定报销明细列。
- [Phase 27]: 导出前端入口为报销列表工具栏的 `导出 Excel`，通过 authenticated blob 下载并回收 object URL。
- [Phase 27]: Plans 27-01 through 27-04 cover Wave 0 contracts、后端导出、前端导出 UX 与 v1.4 验证归档收尾。

- [Phase 19]: Phase 19 Wave 0 tests intentionally fail until future archive, export, stats, and notification modules are implemented.
- [Phase 19]: Archive route contracts reject trusted fields and only accept operation payload fields for tags, notes, processing data, corrections, and reasons.
- [Phase 19]: Notification contracts require transaction-supplied writes and userId = currentUser.id scoping for list/count/read operations.
- [Phase 19]: Archive operational state is stored in ArchiveRecordMeta and ArchiveEvent, not in submitted form JSON.
- [Phase 19]: Archive metadata exact-source invariants are enforced with a PostgreSQL CHECK constraint.
- [Phase 19]: Phase 19 host-side Prisma verification uses localhost for the Docker PostgreSQL service when .env uses compose DNS.
- [Phase 19]: Archive operation payload constants export both plan names and Wave 0 compatibility aliases while excluding trusted fields.
- [Phase 19]: Notification types accept TASK_ASSIGNED as a backend compatibility alias for NEW_TASK.
- [Phase 19]: Route permAny is additive and preserves the existing single meta.perm guard behavior.
- [Phase 19]: Processing field config is stored on FormTemplate.processingSchema and does not bump formal schemaVersion.
- [Phase 19]: Archive operations store tags, notes, processing values, and correction overlays in ArchiveRecordMeta/ArchiveEvent, not submitted JSON.
- [Phase 19]: Approval task detail may expose archive tags/internal notes to assigned approvers while applicant own-detail remains filtered.
- [Phase 19]: Notification rows are written inside the same Prisma transaction that creates approval tasks or terminal approval/rejection state changes.
- [Phase 19]: Notification list/count/read routes derive scope from currentUser.id and expose no client-supplied user scope.
- [Phase 19]: Unread count route returns unreadCount for frontend consumers while preserving the existing unread alias from the backend contract test.
- [Phase 19]: Excel export enforces the locked Phase 19 cap of 2,000 rows before workbook generation.
- [Phase 19]: Export reuses archive list filters and actor visibility, then loads archive detail data only when list rows lack effective/processing fields.
- [Phase 19]: Archive stats require approval:archive:stats and separately apply approval application visibility plus form submission list visibility.
- [Phase 19]: 归档详情继续把正式提交内容放在 #print-area 内，并把处理字段、备注、标签和修正历史作为内部运营信息分区展示。
- [Phase 19]: 归档统计保留在归档查询页内，并仅通过 approval:archive:stats 权限展示。
- [Phase 19]: 归档列表和详情路由只做客户端 permAny 可见性控制，后端仍负责实际数据授权。
- [Phase 19]: approvalArchive 类型常量使用当前前端构建链兼容的类型断言，避免 Vite/esbuild 无法解析 satisfies。
- [Phase 19]: Template processingSchema is typed and saved through the template store while remaining outside formal schema flattening helpers.
- [Phase 19]: Form Designer exposes only text, textarea, date, radio, checkbox, and phone processing field types for internal operations.
- [Phase 19]: Processing field editing uses a separate Quasar dialog with explicit copy that internal processing fields do not overwrite formal submitted content.
- [Phase 19]: Notifications remain in-app only and polling-based: mount/login, window focus, and 60-second interval refresh unread count.
- [Phase 19]: Desktop notification access uses q-menu while mobile uses a full-screen q-dialog to keep rows touch-safe.
- [Phase 19]: Notification target navigation is constrained to approval task/application routes before marking a row read.
- [v1.3]: 到访信息管理采用固定业务模块，不复用自定义表单模板作为主数据模型。
- [v1.3]: Excel 导入由前端解析第 2 行表头并提交标准化 JSON，后端二次校验后批量创建。
- [Phase 20]: VisitRecord 使用固定业务表、nullable string 状态字段和筛选索引，不引入字典、枚举或自动去重约束。
- [Phase 20]: `/api/v1/visits` 后端端点按 `visit:*` 权限拆分鉴权，写入只接受显式业务字段，`creatorId` 从当前登录用户派生。
- [Phase 20]: 到访导入后端只接收标准化 JSON rows；Excel 解析、预览和重复提示保留在 Phase 22 前端范围。
- [Phase 21]: `/visits` 使用独立顶层菜单和 `visit:list` 路由权限，CRUD 按钮分别按 `visit:create/update/delete` 显隐。
- [Phase 21]: Visit 前端 API 调用集中在 Pinia store，列表请求自动忽略空筛选条件。
- [Phase 21]: 到访业务日期统一按 `YYYY-MM-DD` 展示，避免 locale/timezone 漂移。
- [Phase 21]: 到访列表 PC 使用 QTable、移动端使用卡片，长文本只在详情/编辑弹窗完整展示。
- [Phase 22]: 到访 Excel 导入使用前端 `xlsx`/FileReader 解析首个 sheet，严格按第 2 行 15 列表头校验并从第 3 行解析数据。
- [Phase 22]: 导入预览区分有效行、无效行和错误原因；潜在重复只按「姓名 + 接待日期 + 咨询师」提示，不自动跳过、合并或 upsert。
- [Phase 22]: 导入确认只通过 visit store 提交 `{ rows: VisitWritePayload[] }` 到 `/visits/import`，后端继续二次校验并派生 `creatorId`。
- [Phase 23]: 后端 `/visits/stats` 继续由 `visit:stats` 鉴权，并统一产出意向/签约计数与转化率，前端只负责格式化展示。
- [Phase 23]: 统计聚合中的空值统一归入 `未填写`，避免渠道/人员/状态维度 totals 难以解释。
- [Phase 23]: 到访统计入口保留在 `/visits` 页面工具区并仅用 `visit:stats` 显示；统计日期筛选独立于列表筛选，不引入导出、字典、自动合并或跟进工作流。

### Blockers/Concerns

v1.4 has no active blocker. Confirmed scope: fixed reimbursement module, department initial review + finance final review, image/PDF invoice attachments, Canvas handwritten signatures, and Excel detail export only.

Keep out of scope for v1.4: OCR, invoice verification, automatic duplicate checks, payment/accounting integration, statistics dashboard, amount-based branching, countersignature, delegation, and timeout escalation.

## Session

- Last session: 2026-05-03
- Stopped At: Phase 27 planned; ready to execute Plan 27-01
- Resume File: .planning/phases/27-reimbursement-export-validation/27-01-PLAN.md
