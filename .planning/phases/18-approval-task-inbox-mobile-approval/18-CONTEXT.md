# Phase 18: 待我审批与移动审批 - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

审批人可在 PC/Mobile 上处理分配给自己的审批任务：查看待办列表和已办历史，按提交时快照查看申请详情和时间线，提交通过/驳回意见，并添加内部处理备注。Phase 18 只覆盖审批人任务处理闭环；标签/标记、字段级提交后编辑、处理字段、归档查询、导出、统计、站内通知和高级流程仍属于 Phase 19 或后续阶段。

</domain>

<decisions>
## Implementation Decisions

### 审批待办入口与权限
- **D-01:** 新增独立的审批人入口“待我审批”，作为“审批管理”下与“我的申请”“流程配置”并列的菜单项；不要把审批人待办混入申请人自己的“我的申请”列表。
- **D-02:** 后端新增审批任务视角的 authenticated API，推荐语义为 `/api/v1/approval/tasks`；列表和详情读取 `ApprovalTask` 并关联 `ApprovalApplication`，不复用只能查看本人申请的 `/approval/applications` own-route。
- **D-03:** 待办列表只展示当前登录用户有权处理的任务：`ApprovalTask.assigneeId = currentUser.id`，待办默认限定 `status = PENDING`。后端必须继续在 approve/reject 时用 `approveTask` / `rejectTask` 校验任务仍是 pending 且 assignee 是当前用户。
- **D-04:** 权限沿用 Phase 16 种子权限：`approval:task:list` 控制待办/已办入口和只读详情，`approval:task:handle` 控制通过、驳回和内部备注动作。普通员工默认没有处理权限，管理员通过角色配置授予审批人。
- **D-05:** Phase 18 不提供部门待办、全部待办、代办、转交或管理员代审批入口；这些会扩大权限模型，保留给后续阶段。

### 筛选与已办历史
- **D-06:** “待我审批”默认进入待办视图，只显示当前用户的 `PENDING` 任务，并按分配时间或申请更新时间倒序展示最新任务。
- **D-07:** 列表筛选支持模板、申请人、部门、状态和日期范围；PC 使用横向筛选区，Mobile 使用底部筛选 sheet，延续 Phase 17 的响应式模式。
- **D-08:** 已办历史必须与待办清晰分离，推荐使用 tab 或分段控件：“待办”与“已处理”。已处理视图展示当前用户已处理过的任务，主要包括 `APPROVED` 和 `REJECTED`，并显示申请当前状态以区分“已通过并转入后续节点”“最终通过”和“已驳回”。
- **D-09:** 被申请人撤销或他人动作关闭的 `CANCELED` 任务不算审批人“已处理”主记录；如展示，应作为“已关闭/已失效”状态，不与审批人主动通过/驳回混淆。
- **D-10:** 列表行/卡片至少展示申请编号、模板名称和版本、申请人、部门、任务节点、任务状态、申请状态、分配/处理时间和主要操作。

### 审批详情与快照渲染
- **D-11:** 审批详情使用任务 ID 作为主入口，展示该任务、关联申请、当前节点、表单内容和完整审批动态；详情应能从待办和已办历史进入。
- **D-12:** 表单内容必须使用 `ApprovalApplication.schemaSnapshot` + `formData` 只读渲染，复用 `GridFormRenderer mode="print"`；不得读取当前模板 schema 覆盖历史申请。
- **D-13:** 详情布局复用 Phase 17 申请详情的全页模式：桌面双列（左侧表单和申请信息，右侧当前任务/时间线/处理区），移动端单列，避免抽屉承载长表单。
- **D-14:** 时间线复用或扩展 `ApplicationTimeline`，按时间从旧到新展示 `SUBMIT`、`ASSIGN`、`APPROVE`、`REJECT`、`CANCEL`、`COMMENT` 等事件；意见和备注必须保留换行并在窄屏正常换行。
- **D-15:** 审批人详情可以展示审批所需的申请人/部门快照和完整节点动态，但不能允许审批人直接修改申请人的原始 `formData`。

### 通过/驳回处理流
- **D-16:** 通过和驳回动作只在当前用户的 `PENDING` 任务详情中显示；列表可以提供“查看/处理”入口，但不做首版列表内快捷审批，避免误操作。
- **D-17:** 通过使用确认弹窗，审批意见可选，最多 200 字；驳回使用确认弹窗，驳回意见必填，最多 200 字。两种动作都要显示当前申请编号、模板和节点，避免审批人处理错任务。
- **D-18:** 后端动作 API 应调用已有 `approveTask` / `rejectTask`，保持一个事务内完成任务关闭、动作记录、时间线追加、下一节点任务创建或终态更新。
- **D-19:** 审批成功后前端刷新详情、待办列表和已办历史；如果通过后进入下一节点，当前审批人的任务进入已处理，申请状态保持审批中并展示新的当前节点；如果最后节点通过，则申请进入已通过终态。
- **D-20:** 驳回沿用 Phase 15 锁定语义：驳回即终止申请，关闭全部未处理待办并进入 `REJECTED` 终态。Phase 18 不引入退回申请人修改或重新提交策略。
- **D-21:** 所有动作失败时使用现有 `BizError` 消息显示负向 Notify；任务已被处理、非本人任务、终态申请和权限不足都必须被后端拒绝。

### 移动端审批体验
- **D-22:** Mobile 待办列表使用卡片布局，卡片可直接进入详情；每个卡片的主信息顺序为申请类型、状态 chip、申请编号、申请人/部门、节点和分配时间。
- **D-23:** Mobile 详情使用单列内容流，审批操作区固定在底部 sticky 区域，包含“通过”和“驳回”两个主要动作；底部区域必须有 safe-area padding。
- **D-24:** 长表单、动态表格和签名字段在移动端不得被 sticky 操作区遮挡。详情内容需要足够的底部 padding，并沿用 Phase 17 对 print table 的移动端 block 化处理。
- **D-25:** Mobile 时间线必须可读，建议放在表单内容之后或当前任务卡之后；不要让时间线与操作按钮互相覆盖。
- **D-26:** 所有移动端审批按钮和筛选控件最小触控高度 44px，图标按钮必须有 `aria-label` 或 tooltip。

### 内部处理备注
- **D-27:** Phase 18 覆盖 APR-06 的内部处理备注，但仅限审批人添加纯文本内部备注；标签/标记、处理字段和提交后编辑仍留给 Phase 19。
- **D-28:** 内部备注使用 `ApprovalActionType.COMMENT` 追加业务事件和时间线，不修改 `ApprovalApplication.formData`，不写入申请人正式提交内容。
- **D-29:** 内部备注应在审批人详情和审批任务时间线中可见，标题建议为“内部备注”；它不应在申请人自己的“我的申请”详情中暴露，除非后续阶段明确把备注改为申请人可见。规划时需要过滤 own-application timeline 或在 payload 中标记 internal visibility。
- **D-30:** 备注权限使用 `approval:task:handle`；允许当前 pending 任务审批人添加备注，也允许已经处理过该申请任务的审批人在已办详情中补充备注。具体是否允许非当前节点但有历史任务的审批人补充备注由实现阶段按安全性收紧。

### the agent's Discretion
- 具体文件名、API 子路径、Pinia store 名称和 DTO 命名可按现有 approval module 风格决定，但应保持任务视角与申请人 own-route 分离。
- 列表默认排序、状态 chip 颜色、空状态文案、加载骨架、错误提示和桌面详情右侧卡片顺序可由实现阶段按现有 Quasar 风格决定。
- 已办历史中 `CANCELED` 任务是否默认隐藏或作为“已关闭”筛选项展示可由 planner 结合实现复杂度决定，但不得把它标成审批人主动处理结果。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` - Phase 18 goal, dependency on Phase 17, success criteria, and Phase 19 boundary.
- `.planning/REQUIREMENTS.md` - `APR-01` through `APR-06`, plus out-of-scope archive/export/notification and advanced workflow requirements.
- `.planning/PROJECT.md` - v2.0 milestone goals, stack constraints, key approval decisions and MVP boundaries.
- `.planning/research/CLIENT_CHAT_NEXT_FEATURES.md` - client-derived context for moving paper approval online and keeping v2.0 practical.

### Prior locked decisions
- `.planning/phases/15-approval-data-model-state-machine/15-CONTEXT.md` - state machine, serial task creation, approve/reject/cancel transaction semantics and rejection-as-terminal decision.
- `.planning/phases/16-process-config-template-binding/16-CONTEXT.md` - approval permissions, approver source resolution and template/process snapshot decisions.
- `.planning/phases/17-my-applications-dynamic-submission/17-CONTEXT.md` - internal application route separation, snapshot detail rendering, applicant own-list boundaries and Phase 18 deferrals.

### Implementation patterns
- `.planning/phases/17-my-applications-dynamic-submission/17-PATTERNS.md` - backend route/service, frontend store/list/detail and responsive patterns to reuse.
- `.planning/phases/17-my-applications-dynamic-submission/17-UI-SPEC.md` - approved Quasar design contract for approval lists, detail pages, timeline, mobile cards and sticky actions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/schema.prisma`: `ApprovalTask` already stores assignee, node, task status, comment, assigned/handled timestamps and indexes on `(assigneeId, status)`; `ApprovalAction` and `ApprovalTimelineEvent` already support `APPROVE`, `REJECT` and `COMMENT`.
- `backend/src/modules/approval/application.service.ts`: existing `approveTask`, `rejectTask` and `appendApplicationEvent` provide the core task transaction and event append primitives Phase 18 should wrap instead of duplicating transition logic.
- `backend/src/modules/approval/application.route.ts`: existing authenticated Elysia route module shows TypeBox schema, `authGuard`, actor serialization and date serialization patterns.
- `backend/src/modules/approval/application-submission.service.ts`: existing list/detail serializers map applications, tasks and timeline events; Phase 18 can adapt these for assignee task queries rather than applicant-owned queries.
- `frontend/src/types/approvalApplication.ts`: status, task summary and timeline event DTOs already include all workflow event types needed by approver detail.
- `frontend/src/stores/approvalApplication.ts`: Pinia API wrapper pattern for list, detail and actions.
- `frontend/src/pages/ApprovalApplicationPage.vue`: desktop table plus mobile card list, status/date filters and mobile bottom filter sheet pattern.
- `frontend/src/pages/ApprovalApplicationDetailPage.vue`: full-page snapshot detail, `GridFormRenderer mode="print"`, responsive two-column/single-column layout and mobile table wrapping.
- `frontend/src/components/approval/ApplicationTimeline.vue`: existing timeline component that can be reused or extended for internal remarks.
- `frontend/src/components/approval/ApplicationStatusChip.vue`, `frontend/src/router/routes.ts`, and `frontend/src/layouts/MainLayout.vue`: route, menu and approval status display integration points.
- `backend/prisma/seed.ts`: `approval:task:list` and `approval:task:handle` permissions already exist.

### Established Patterns
- Backend approval modules live under `backend/src/modules/approval/*`, register from `backend/src/index.ts`, use `authGuard`, TypeBox schemas, Prisma transactions and `BizError`/`notFound`.
- Frontend approval pages use Vue 3 + Quasar + Pinia, `useResponsive()`, desktop `q-table`, mobile `q-card`, `Notify`/`Dialog`, and permission-gated routes/buttons.
- Historical form rendering is snapshot-based: `schemaSnapshot` + `formData` is the source of truth for details, not the current template schema.
- Timeline and action history are append-only; approval comments belong in task/action/timeline records, not in dynamic form data.

### Integration Points
- Add a task-focused backend service/route, likely `backend/src/modules/approval/task.service.ts` and `backend/src/modules/approval/task.route.ts`, then register it in `backend/src/index.ts` beside `approvalApplicationModule`.
- Add frontend task DTOs/store/page/detail route, likely under `frontend/src/types/approvalTask.ts`, `frontend/src/stores/approvalTask.ts`, `frontend/src/pages/ApprovalTaskPage.vue`, and `frontend/src/pages/ApprovalTaskDetailPage.vue`.
- Add `/approval/tasks` and `/approval/tasks/:id` routes and a “待我审批” menu item under `审批管理`, gated by `approval:task:list`.
- Reuse `GridFormRenderer`, `ApplicationTimeline`, and `ApplicationStatusChip`; extend labels only where task-level status needs a separate chip.
- Adjust applicant own-detail serialization if needed so internal `COMMENT` events do not leak into “我的申请”.
- Add backend tests around assignee-only task list/detail, filters, approve/reject permission checks, comment requirements and internal remark visibility; add frontend tests for store actions and route/type helpers following Phase 17 test patterns.

</code_context>

<specifics>
## Specific Ideas

- Auto-selected recommended defaults: keep the approver experience practical and task-centered rather than turning Phase 18 into an operations console.
- “待我审批” should feel like a daily work queue: default pending tasks, fast filters, full context before action, and clear separation from already handled tasks.
- Mobile approval should prioritize reading confidence and safe actions: sticky bottom approve/reject controls, no overlay on long dynamic forms, and no list-level one-tap approvals.
- Internal remarks are for approver-side processing context and should remain separate from applicant-submitted form data.

</specifics>

<deferred>
## Deferred Ideas

- 标签/标记、字段级提交后编辑、处理字段、归档查询、Excel/PDF 导出、统计和站内通知 - Phase 19.
- 部门/全部审批队列、管理员代审批、转交、委托、催办、超时升级和批量审批 - future approval operations phases.
- 退回申请人修改、重新提交策略、驳回复制重发、附件上传、条件分支、并行/会签和外部企业通知 - future advanced workflow phases.

</deferred>

---

*Phase: 18-approval-task-inbox-mobile-approval*
*Context gathered: 2026-04-26*
