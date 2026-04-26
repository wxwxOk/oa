# Phase 19: 收集后处理、归档导出统计 - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

授权人员可对内部审批申请和公开收集记录做后续处理，包含标签/标记、内部备注、受控提交后编辑、模板处理字段、归档查询、Excel/PDF 导出、基础统计和站内通知。Phase 19 收尾 v2.0 审批闭环，但不引入附件、外部通知、复杂流程、平台级审计日志或 BI 报表平台。

</domain>

<decisions>
## Implementation Decisions

### 归档记录边界与权限
- **D-01:** 归档查询使用 service/query 层聚合 `ApprovalApplication` 和 `Submission`，每条归档结果带 `sourceType`（approval / collection）和源记录 ID；不在 Phase 19 新建统一父记录表，也不强制把公开收集记录迁移成审批申请。
- **D-02:** 归档默认不展示 `DRAFT` 申请；内部审批记录覆盖 `SUBMITTED/APPROVING/APPROVED/REJECTED/CANCELED`，公开收集记录以“已收集”类型进入统一查询。
- **D-03:** 查看范围按现有权限收敛：审批申请使用 `approval:application:department` / `approval:application:all`；公开收集沿用 `form:submission:list`；导出沿用 `approval:export` 并按可见范围裁剪结果。
- **D-04:** Phase 19 可以新增少量运维权限码用于受控编辑、标签/标记和统计，例如 `approval:archive:edit`、`approval:archive:mark`、`approval:archive:stats`；不要复用 `approval:task:handle` 作为归档后处理权限。

### 标签标记与内部备注
- **D-05:** 标签/标记、内部备注必须作为独立的运营元数据和追加事件保存，不写进 `ApprovalApplication.formData` 或 `Submission.data`，避免污染申请人正式提交内容。
- **D-06:** 首版标签采用自由文本加推荐快捷项的方式，默认推荐 `待跟进`、`已核对`、`资料不全`、`重点`；不做独立标签字典管理或模板级标签后台。
- **D-07:** 标签/标记和备注在归档列表、归档详情、审批任务详情中对授权人员可见；申请人自己的“我的申请”详情继续隐藏内部备注和处理信息，沿用 Phase 18 的 `visibility: INTERNAL` 过滤边界。
- **D-08:** 对审批申请的标记、备注和受控编辑应继续追加 `ApprovalAction` / `ApprovalTimelineEvent`，公共收集记录需要等价的 append-only 审计记录，至少记录操作者、动作、源记录、内容、原因和时间。

### 受控编辑与处理字段
- **D-09:** 提交后编辑采用“保留原始提交 + 修正覆盖层 + 字段级审计”的语义。内部归档详情和导出可以展示当前有效值，但必须能查看每个被修正字段的 before/after、编辑人、原因和时间。
- **D-10:** 任何提交后编辑都必须填写非空原因；后端拒绝无原因编辑、无权限编辑、非法源记录编辑和无变化编辑。
- **D-11:** 管理员可为模板启用处理字段，处理字段与申请人正式提交字段分开配置、分开存值，默认不进入申请人详情，也不改变 `formData` / `Submission.data`。
- **D-12:** 处理字段首版聚焦运营处理场景，支持文本、多行文本、日期、单选、多选、手机号等轻量字段；签名、动态表格和附件型处理字段不纳入 Phase 19。
- **D-13:** 处理字段值出现在内部归档详情、归档筛选/展示和 Excel 导出中；PDF/打印默认保持申请人正式提交内容，可在内部详情中附加“处理信息”区，但必须清楚区分正式提交和后续处理。

### 归档查询体验
- **D-14:** 新增统一“归档查询”入口，放在“审批管理”下，与“待我审批”“我的申请”“流程配置”并列；它是授权人员的运营查询页，不替代申请人和审批人的日常入口。
- **D-15:** 桌面端使用可筛选 `q-table`，移动端使用卡片列表和底部筛选 sheet；详情使用全页模式承载长表单、时间线、备注、标签、处理字段和导出动作，不使用窄抽屉承载复杂审批详情。
- **D-16:** 查询筛选必须覆盖模板、部门、申请人/填写者、状态、日期范围、标签/标记和 source type；默认按最近更新时间或完成时间倒序。
- **D-17:** 本阶段不做全文搜索、保存筛选条件、跨字段复杂条件组或高级报表查询。

### Excel/PDF 导出
- **D-18:** Excel 导出以当前筛选条件和当前用户权限范围为准，导出归档列表数据；导出列包含元信息、状态、部门/人员、标签/标记、处理字段和扁平化后的动态表单字段。
- **D-19:** Excel 列表导出默认不包含完整审计历史；审计历史在单条详情中查看，避免列表文件不可读。
- **D-20:** 单条申请/收集详情的 PDF 和打印复用现有 `#print-area`、`GridFormRenderer mode="print"`、`html2canvas + jsPDF` 路径，继续使用提交时 schema 快照，不改成服务端 PDF。
- **D-21:** Phase 19 不要求新增批量 PDF；已有公开收集批量 PDF 能力可以保留，但本阶段批量数据交付优先满足 Excel。

### 基础统计
- **D-22:** 统计只做 v2.0 MVP 基础聚合：按模板、状态、部门和月份统计记录数量；可按 source type 区分审批申请和公开收集。
- **D-23:** 统计默认排除草稿；公开收集记录计入“已收集”，审批申请按当前申请状态计入。
- **D-24:** 前端统计可以复用 Dashboard / `FormStatsPanel` 的表格加图表模式；图表库沿用现有 `vue-chartjs`，不引入大型 BI 依赖。
- **D-25:** 字段级统计、金额汇总、漏斗分析、趋势预测、导出统计报表和自定义仪表盘全部延期。

### 站内通知
- **D-26:** Phase 19 只实现站内通知，不做企业微信、钉钉、短信或邮件。
- **D-27:** 通知事件覆盖新待办、申请通过、申请驳回和未读数量；标签、备注、处理字段和受控编辑默认不发送通知。
- **D-28:** 通知应写入用户级通知记录，包含类型、标题、摘要、关联 source、目标路由、read/unread 和创建时间；点击通知跳转到对应待办详情或申请详情。
- **D-29:** 新待办通知必须跟任务创建事务一致；通过/驳回通知必须跟终态流转一致，避免任务或申请状态已变但通知缺失。
- **D-30:** 首版未读数可通过登录后/页面聚焦/固定间隔轮询刷新，不要求 WebSocket/SSE 实时推送。

### the agent's Discretion
- 具体 Prisma 模型名、路由拆分、DTO 命名、列表列顺序、Excel 库选择、导出行数上限、统计图表样式和空状态文案可由研究和规划阶段按现有项目风格决定。
- 若实现复杂度需要分批，优先顺序应为：数据模型与权限/审计基础 -> 归档查询 -> 标签备注/处理字段 -> 受控编辑 -> Excel/PDF -> 统计 -> 通知。
- UI 视觉应延续现有 Quasar OA 工具风格，保持紧凑、可扫描、移动端可用，不做营销式页面。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 19 goal, dependency on Phase 18, success criteria and v2.0 milestone boundary.
- `.planning/REQUIREMENTS.md` — `OPS-01` through `OPS-07`, plus future attachment/external notification/advanced workflow out-of-scope boundaries.
- `.planning/PROJECT.md` — v2.0 core value, active requirements, stack constraints and key decisions.
- `.planning/research/CLIENT_CHAT_NEXT_FEATURES.md` — client-derived archive/export/statistics, post-collection edit, tags/remarks, notifications and MVP boundary.

### Prior locked decisions
- `.planning/phases/15-approval-data-model-state-machine/15-CONTEXT.md` — separate `ApprovalApplication` and `Submission`, query-layer Phase 19 aggregation, state machine and append-only event foundation.
- `.planning/phases/16-process-config-template-binding/16-CONTEXT.md` — approval permissions, template mode split, required validation and schema version rules.
- `.planning/phases/17-my-applications-dynamic-submission/17-CONTEXT.md` — applicant own-route boundary, snapshot rendering and Phase 19 deferrals.
- `.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md` — task route separation, internal remark visibility, mobile detail patterns and Phase 19 deferrals.

### Export, stats and implementation patterns
- `.planning/milestones/v1.1-phases/09-data-view-print-stats/09-CONTEXT.md` — existing submission list, print/PDF and form stats decisions to extend.
- `.planning/milestones/v1.2-phases/13-pdf/13-CONTEXT.md` — locked `html2canvas + jsPDF` PDF path, `#print-area`, A4 pagination and print fidelity decisions.
- `.planning/phases/17-my-applications-dynamic-submission/17-PATTERNS.md` — approval application route/store/list/detail patterns.
- `.planning/phases/18-approval-task-inbox-mobile-approval/18-PATTERNS.md` — approval task service/route/detail/timeline/mobile patterns.

### Source files to inspect before planning
- `backend/prisma/schema.prisma` — current `ApprovalApplication`, `Submission`, `ApprovalAction`, `ApprovalTimelineEvent`, permission and index baseline.
- `backend/src/modules/approval/application.service.ts` — approval transaction primitives and `appendApplicationEvent` for `COMMENT/MARK/EDIT`.
- `backend/src/modules/approval/task.service.ts` — assignee-scoped task queries, internal comment payload and timeline serialization.
- `backend/src/modules/approval/application-submission.service.ts` — applicant own-detail filtering for internal `COMMENT` visibility.
- `backend/src/modules/submission/submission.route.ts` — existing public collection list/detail query pattern.
- `backend/src/modules/form-stats/form-stats.route.ts` — current groupBy statistics pattern.
- `frontend/src/pages/SubmissionPage.vue` — existing collection list, drawer detail, print/PDF and batch PDF flow.
- `frontend/src/composables/usePdfExport.ts` — reusable PDF export implementation.
- `frontend/src/pages/ApprovalTaskDetailPage.vue` and `frontend/src/components/approval/ApplicationTimeline.vue` — internal detail, timeline, remark and mobile action patterns.
- `frontend/src/router/routes.ts` and `frontend/src/layouts/MainLayout.vue` — route/menu permission integration points.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/schema.prisma`: already has `ApprovalActionType.EDIT`, `MARK`, `COMMENT`, approval timelines, public `Submission`, template business mode and approval/view/export permissions.
- `backend/src/modules/approval/application.service.ts`: `appendApplicationEvent` already accepts `COMMENT/MARK/EDIT` for approval applications, giving Phase 19 a starting point for operational events.
- `backend/src/modules/approval/task.service.ts`: internal remarks use `payload: { visibility: 'INTERNAL' }`; this should become the visibility precedent for Phase 19 operational notes.
- `backend/src/modules/approval/application-submission.service.ts`: own-application detail filters internal comments, which protects applicant-facing views from operations-only notes.
- `backend/src/modules/submission/submission.route.ts` and `frontend/src/stores/submission.ts`: existing public collection list/detail flow with template, sharer, date and submitter filters.
- `backend/src/modules/form-stats/form-stats.route.ts`: existing Prisma `groupBy` aggregation style for lightweight stats.
- `frontend/src/pages/SubmissionPage.vue`, `frontend/src/components/submission/SubmissionDetail.vue`, `frontend/src/composables/usePdfExport.ts`: existing print/PDF implementation and dynamic form detail rendering.
- `frontend/src/pages/ApprovalApplicationDetailPage.vue` and `frontend/src/pages/ApprovalTaskDetailPage.vue`: full-page snapshot detail, `GridFormRenderer mode="print"`, responsive long-form layout and timeline side panel.
- `frontend/src/components/approval/ApplicationTimeline.vue`: already maps `COMMENT` to “内部备注” and preserves line breaks.
- `backend/prisma/seed.ts`: approval permission seed already includes application department/all scope, task permissions and `approval:export`.

### Established Patterns
- Backend feature modules use Elysia route modules under `backend/src/modules/*`, `authGuard`, TypeBox schemas, Prisma, `BizError` and explicit serializers.
- Approval writes that affect state, tasks or timeline should be transaction-bound and should reuse centralized service helpers rather than route-level mutations.
- Frontend uses Vue 3 + Quasar + Pinia, desktop `q-table`, mobile cards, bottom filter sheet patterns, `Notify`/`Dialog`, and permission-gated menu/routes.
- Historical form detail rendering is snapshot-based: `schemaSnapshot` plus stored data is the display source, never current template schema.
- Public collection routes and authenticated approval routes are intentionally separated; Phase 19 may aggregate in read models but should preserve source ownership.

### Integration Points
- Add backend archive/operations modules near approval modules, with service helpers that normalize approval applications and submissions into archive rows.
- Extend Prisma with operational metadata/audit structures for tags, marks, processing fields, controlled edits and notifications.
- Extend seed permissions and role tests for any new archive/edit/mark/stats notification permissions.
- Add frontend archive store/types/pages and menu entry under `审批管理`, plus detail routes for archive records.
- Reuse existing PDF detail DOM where possible; add an internal processing section only where it is clearly separated from formal submitted content.

</code_context>

<specifics>
## Specific Ideas

- Auto mode selected all recommended defaults; no interactive user corrections were provided.
- The target experience should feel like an operations console for internal staff: search records, mark status, add notes, correct data with reason, export what is currently filtered, and see simple aggregate progress.
- Tags should start practical and lightweight with preset chips for `待跟进`、`已核对`、`资料不全`、`重点`, while still allowing free-text labels.
- Original submitted values must remain recoverable after any correction because approvals, PDF output and dispute tracing depend on trustworthy history.
- Notifications should be useful but quiet: task assignment and final approval result only, with unread count visible in navigation/header.

</specifics>

<deferred>
## Deferred Ideas

- Enterprise WeChat, DingTalk, SMS and email notification channels.
- Attachment/image/file upload fields and attachment export.
- Full BI/custom dashboard, field-level analytics, amount aggregation and generated reports.
- Dedicated tag taxonomy management, template-level tag dictionaries and tag color governance.
- Unified parent record table replacing `Submission` and `ApprovalApplication`.
- WebSocket/SSE realtime notification delivery.
- Batch PDF for approval archive records beyond the existing collection batch PDF behavior.

</deferred>

---

*Phase: 19-post-collection-processing-archive-export-stats*
*Context gathered: 2026-04-26*
