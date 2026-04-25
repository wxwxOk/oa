# Phase 17: 我的申请与动态提交 - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

登录员工可在 PC/Mobile 使用已发布且 `APPROVAL_REQUIRED` 的模板发起内部审批申请，保存草稿，正式提交后进入 Phase 15 审批状态机，并在“我的申请”中查看状态、详情、时间线和规则允许的撤销操作。Phase 17 不实现审批人待办处理、审批意见录入、已办历史、内部备注/标签、提交后受控编辑、归档导出、统计或站内通知；这些仍属于 Phase 18-19。

</domain>

<decisions>
## Implementation Decisions

### 申请入口与模板选择
- **D-01:** 新增登录态内部申请入口，不复用公开 `/f/:code` 分享填写页；公开收集继续只写 `Submission`，内部审批继续只写 `ApprovalApplication`。
- **D-02:** “发起申请”只展示 `PUBLISHED + APPROVAL_REQUIRED` 且绑定启用有效流程的模板；`COLLECTION_ONLY` 模板不出现在内部申请入口。
- **D-03:** 前端新增“我的申请”作为员工主入口，放在现有审批导航下，由 `approval:application:own` 控制可见；创建/保存/提交由 `approval:application:create` 控制。
- **D-04:** 申请编号由后端生成，申请人不可编辑；列表和详情都展示该编号。具体格式可由实现阶段决定，但必须稳定、唯一、便于人工沟通。

### 草稿与正式提交
- **D-05:** 保存草稿时创建或更新 `ApprovalApplication`，状态保持 `DRAFT`，不创建 `ApprovalTask`，不追加提交/分配时间线事件。
- **D-06:** 草稿创建时保存 `schemaSnapshot`、`processSnapshot`、模板名称/版本、申请人姓名和部门快照，沿用 Phase 15 已有 `createDraftApplication` 语义；后续模板/流程修改不改变该草稿的历史渲染和提交流程。
- **D-07:** 草稿保存只做基础数据形状校验，不强制所有必填字段通过；正式提交时必须执行和公开填写一致的前端 `GridFormRenderer` 校验及后端 `validateFormDataRequiredFields` 校验。
- **D-08:** 草稿可继续编辑并覆盖自身 `formData`；只有申请人本人可编辑自己的 `DRAFT` 申请，非草稿状态不得修改申请人提交内容。
- **D-09:** 正式提交复用 Phase 15 `submitApplication`，在事务内写入 `SUBMIT`/`ASSIGN` 事件、创建首个待办并进入 `APPROVING`。`SUBMITTED` 仍是短暂内部状态，UI 归类为“审批中”。

### 我的申请列表
- **D-10:** “我的申请”默认只返回当前登录用户作为申请人的记录，不展示部门/全部申请视角；部门/全部申请留给 Phase 19 归档查询。
- **D-11:** 列表支持状态筛选：草稿、审批中、已通过、已驳回、已撤销；如果后端返回短暂 `SUBMITTED`，前端并入审批中。
- **D-12:** 列表支持时间范围筛选，默认按最近更新或创建时间倒序；PC 使用 `q-table`，Mobile 使用卡片列表，延续 `SubmissionPage.vue` 和 `ApprovalProcessPage.vue` 的响应式模式。
- **D-13:** 列表行展示申请编号、模板名称、状态、当前节点、申请时间/更新时间和可用操作；空状态复用 `EmptyState`。

### 申请详情与时间线
- **D-14:** 详情使用 `ApprovalApplication.schemaSnapshot` + `formData` 渲染历史表单，不能用模板当前 schema 覆盖历史申请。
- **D-15:** 详情展示申请编号、模板快照名称/版本、当前状态、当前节点、申请人/部门快照、提交时间、完成时间、表单数据、审批时间线和审批意见。
- **D-16:** 表单展示复用 `GridFormRenderer` 的 `print`/只读渲染路径和现有动态表格、签名展示能力；如需要封装审批详情组件，应优先参考 `SubmissionDetail.vue`。
- **D-17:** Phase 17 只展示已存在的审批动作/时间线事件，不新增内部备注、标签、处理字段或审批人处理入口。

### 撤销规则
- **D-18:** 申请人仅可撤销本人未终审申请，实际状态允许范围沿用 Phase 15 状态机：`SUBMITTED` 或 `APPROVING` 可转 `CANCELED`。
- **D-19:** `APPROVED`、`REJECTED`、`CANCELED` 终态不可撤销；`DRAFT` 不走撤销语义。草稿删除/归档隐藏不作为 Phase 17 必交付能力。
- **D-20:** 撤销必须关闭全部未处理待办并追加 `CANCEL` 时间线事件；前端需要二次确认，可允许填写可选撤销原因。

### API、权限与测试
- **D-21:** 新增申请 API 应挂在 `/api/v1/approval/applications` 语义下，使用 `authGuard`、TypeBox 校验、Prisma transaction 和现有 `BizError` 错误模式。
- **D-22:** API 最少覆盖：可发起模板列表、创建草稿、更新草稿、提交草稿、我的申请列表、申请详情、撤销申请。
- **D-23:** 权限沿用 Phase 16 已种子的 `approval:application:create` 和 `approval:application:own`；Phase 17 不新增权限码。
- **D-24:** 后端测试需要覆盖草稿不建任务、提交建首个待办、必填校验、本人访问限制、状态筛选、详情使用快照渲染数据、撤销关闭待办和非法撤销拒绝。
- **D-25:** 前端测试/验证需要覆盖 PC/Mobile 表单提交、草稿保存、我的申请筛选、详情时间线和撤销按钮可见性。

### the agent's Discretion
- 具体前端路由可以是单页内弹出模板选择后进入新建页，也可以是 `/approval/applications/new/:templateId`；只要员工入口清晰、移动端可用，并且不复用公开链接页即可。
- 申请编号格式、状态 chip 颜色、时间线视觉样式、加载骨架和错误文案可按现有 Quasar 风格决定。
- 是否把申请详情做成右侧抽屉、全页详情或移动端全屏对话框由实现阶段根据现有布局决定，但表单和时间线不能互相遮挡。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 17 goal, dependencies, success criteria and Phase 18-19 boundaries.
- `.planning/REQUIREMENTS.md` — `APP-01` through `APP-05`, plus out-of-scope future workflow requirements.
- `.planning/PROJECT.md` — v2.0 project value, current milestone target features, stack and key decisions.
- `.planning/research/CLIENT_CHAT_NEXT_FEATURES.md` — client-derived approval center context and MVP boundary.

### Prior locked decisions
- `.planning/phases/15-approval-data-model-state-machine/15-CONTEXT.md` — separate `ApprovalApplication`, schema/process snapshots, state machine, task creation and cancel semantics.
- `.planning/phases/16-process-config-template-binding/16-CONTEXT.md` — `APPROVAL_REQUIRED` template binding, approval permissions, required-field validation and schema version rules.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/schema.prisma`: already defines `ApprovalApplication`, `ApprovalTask`, `ApprovalAction`, `ApprovalTimelineEvent`, application/task statuses, template business mode and indexes needed by Phase 17.
- `backend/src/modules/approval/application.service.ts`: already provides `createDraftApplication`, `submitApplication`, `cancelApplication`, task approval/rejection helpers and append-only timeline creation.
- `backend/src/modules/approval/process-config.service.ts`: provides `resolveProcessSnapshot` and department/role/fixed-user approver resolution for creating executable snapshots.
- `backend/src/modules/template/schema.validation.ts`: provides `validateFormDataRequiredFields`, which Phase 17 should call on formal submit.
- `frontend/src/components/renderer/GridFormRenderer.vue`: shared fill/print renderer with validation and signature saving, suitable for internal application forms and read-only details.
- `frontend/src/components/submission/SubmissionDetail.vue`: existing detail/print pattern for dynamic schema data, useful as an approval detail reference.
- `frontend/src/components/EmptyState.vue`, `frontend/src/composables/useResponsive.ts`, `frontend/src/stores/submission.ts`, and `frontend/src/stores/approvalProcess.ts`: established list, responsive and Pinia store patterns.

### Established Patterns
- Backend modules register under `/api/v1` in `backend/src/index.ts`, use Elysia route modules, `authGuard`, TypeBox body/query schemas, Prisma and `BizError`.
- Frontend uses Quasar + Pinia, `q-table` on desktop, mobile card lists, `Notify`/`Dialog`, permission-gated routes/buttons via `perm` metadata and `v-perm`.
- Public collection routes are intentionally isolated under `backend/src/modules/public/public.route.ts` and must stay JWT-free; internal approval submission should live in authenticated approval routes.
- Dynamic form schema/data is stored as JSONB and rendered from snapshots for historical correctness.

### Integration Points
- Add an approval application route module and register it in `backend/src/index.ts` next to `approvalProcessModule`.
- Add a Pinia store for approval applications, plus routes/menu entries in `frontend/src/router/routes.ts` and `frontend/src/layouts/MainLayout.vue`.
- Reuse template filtering by `businessMode` from existing `backend/src/modules/template/template.route.ts` or expose a narrower application-template endpoint for employees.
- Use existing seed permissions where EMPLOYEE already receives `approval:application:create` and `approval:application:own`.

</code_context>

<specifics>
## Specific Ideas

- Auto-selected recommended defaults: keep Phase 17 employee-facing and practical; avoid turning it into a full approval operations console.
- The employee workflow should feel like a normal OA application center: “发起申请” -> choose template -> fill/save/submit -> track in “我的申请”.
- Mobile forms should keep the public fill page's sticky bottom action pattern for save/submit, but use authenticated APIs and internal copy.

</specifics>

<deferred>
## Deferred Ideas

- 审批人待办、审批/驳回意见录入、已办历史和移动审批操作区 — Phase 18。
- 内部备注、标签/标记、提交后受控编辑、处理字段、归档查询、Excel/PDF 导出、统计和站内通知 — Phase 19。
- 草稿删除/隐藏、驳回后复制重发、退回申请人修改、重新提交策略、附件上传、条件分支、并行/会签、委托和外部通知 — 后续阶段。

</deferred>

---

*Phase: 17-my-applications-dynamic-submission*
*Context gathered: 2026-04-25*
