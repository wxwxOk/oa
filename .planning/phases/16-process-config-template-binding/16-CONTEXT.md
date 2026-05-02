# Phase 16: 流程配置与模板绑定 - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

管理员可无代码配置单步/串行审批流程，并把流程绑定到表单模板；模板可在“仅收集”和“需要审批”之间选择业务模式，同时保留既有公开分享收集路径。Phase 16 覆盖流程定义管理、模板审批模式/流程绑定、部门负责人/默认审批人维护、审批 RBAC 种子/校验/菜单控制，以及必填字段和 schema 版本规则的加固。我的申请、待我审批、审批详情、归档导出、备注标记、站内通知和高级流程属于后续 Phase 17-19。

</domain>

<decisions>
## Implementation Decisions

### 模板审批模式与公开收集共存
- **D-01:** `FormTemplate` 增加独立业务模式字段，首版取值为 `COLLECTION_ONLY` 和 `APPROVAL_REQUIRED`；现有 `DRAFT/PUBLISHED/OFFLINE` 发布状态继续只表达模板是否可用，不混入审批语义。
- **D-02:** `COLLECTION_ONLY` 是默认值，完整保留现有公开分享链接、公开填写页和 `Submission` 数据收集行为，既有模板迁移后默认不需要审批。
- **D-03:** `APPROVAL_REQUIRED` 模板用于登录员工发起内部申请，走 `ApprovalApplication` 和 Phase 15 审批状态机；它不生成新的公开分享链接，公开填写入口不承担内部审批提交。
- **D-04:** 已发布且已有公开分享链接的模板不能被静默切到 `APPROVAL_REQUIRED`。管理员必须先下线公开收集，或在明确确认“断开公开收集入口”后再切换，避免已有外部链接悄悄改变行为。
- **D-05:** 模板列表继续使用一个列表，在现有“状态”旁增加“用途”标签（仅收集 / 需审批），操作按钮按模式和权限显示；不为 v2.0 MVP 拆成两个独立模板页。
- **D-06:** `APPROVAL_REQUIRED` 模板发布前必须绑定一个启用且结构有效的审批流程。固定用户和角色来源必须能解析到合法用户；部门负责人来源允许到申请提交时按申请人部门解析，但流程节点本身必须配置完整。

### 流程配置与模板绑定方式
- **D-07:** 建立独立的“审批流程配置”管理能力，复用 Phase 15 已有 `ApprovalProcess` / `ApprovalProcessNode` 模型；模板设计器只负责选择审批模式和绑定流程，不内嵌完整流程编辑器。
- **D-08:** 流程配置 UI 使用实用的节点列表/表单方式：流程名称、描述、启用状态、节点顺序、节点名称、审批人来源和来源参数。不做 BPMN、拖拽画布、条件分支、会签/或签等高级设计器。
- **D-09:** 一个流程可复用绑定到多个模板。模板保存绑定的流程定义 ID；员工提交申请时读取当前启用流程并写入 `processSnapshot`，历史申请继续只依赖提交时快照。
- **D-10:** 修改流程定义只影响未来新申请，不影响已创建申请、已创建任务或历史时间线。已进入审批的申请以 `ApprovalApplication.processSnapshot` 为唯一执行依据。
- **D-11:** 不允许禁用或删除仍被已发布 `APPROVAL_REQUIRED` 模板引用的流程，除非先解除模板绑定或下线相关模板，避免员工提交时遇到断链。
- **D-12:** 首版节点必需动作固定为“通过 / 驳回”；每个节点都必须可产生明确待办人。退回申请人修改、重新提交策略、加签和转交不纳入本阶段。

### 审批人来源解析规则
- **D-13:** 所有审批人来源最终都必须在申请提交事务内解析为具体 `assigneeId/assigneeName`，并写入 `processSnapshot`、`ApprovalTask.approverSourceSnapshot` 和时间线事件。后续用户、角色或部门负责人变更不影响已创建任务。
- **D-14:** 固定用户来源要求选择一个 `ACTIVE` 用户；用户被禁用后不能用于新流程节点解析，已生成任务保留快照。
- **D-15:** 角色来源在 v2.0 MVP 中必须解析为恰好一个 `ACTIVE` 用户。若角色下没有用户或有多个用户，配置校验或提交校验应给出明确错误，管理员应改用固定用户或部门负责人。多人成员的任一审批/全员审批属于高级流程，不在 Phase 16 引入。
- **D-16:** 提交人部门负责人来源优先使用申请人当前部门的负责人/默认审批人；若当前部门未设置，则向上查找最近的父部门负责人；仍找不到时阻止提交并提示维护部门负责人。
- **D-17:** 部门负责人来源应避免静默自审：如果解析到申请人本人，优先继续向父部门查找负责人；找不到替代负责人时阻止提交并提示管理员修正配置。
- **D-18:** 解析失败不创建半成品申请或待办。申请提交应在一个事务内完成 schema 快照、流程快照、首个任务、动作记录和时间线追加；任何节点解析失败都整体回滚。

### 部门负责人与 RBAC
- **D-19:** `Department` 增加一个负责人/默认审批人字段，指向 `User`。部门管理页在新增/编辑部门时可选择负责人，并在树/列表中展示负责人姓名。
- **D-20:** 部门负责人维护沿用部门管理权限：有 `department:update` 的用户可维护该字段；不新增单独的部门负责人权限。
- **D-21:** Phase 16 种子审批相关权限，覆盖流程配置、模板绑定、提交申请、审批任务、查看本人/部门/全部申请和导出审批数据。ADMIN 角色默认拥有全部权限。
- **D-22:** 建议权限码保持现有粒度风格：`approval:process:list/create/update/delete`、`approval:template:bind`、`approval:application:create`、`approval:application:own`、`approval:application:department`、`approval:application:all`、`approval:task:list`、`approval:task:handle`、`approval:export`。
- **D-23:** 普通员工角色可预置后续申请所需的最小权限：创建申请和查看本人申请；是否授予审批任务处理权限由管理员通过角色管理分配。
- **D-24:** 前端新增“审批中心/审批管理”导航分组。Phase 16 至少提供“流程配置”入口；模板绑定能力留在模板管理/设计器内，并由 `approval:template:bind` 控制按钮或设置区可见性。

### 必填字段与 schema 版本
- **D-25:** 继续使用现有 `SchemaField.required` 作为正式提交字段必填配置；模板设计器右侧属性面板的“必填”开关就是 Phase 16 的主配置入口。
- **D-26:** PC 和 Mobile 填写都复用 `GridFormRenderer` / `FieldRenderer`，因此前端必填校验应保持同一组件路径；Phase 16 需要补齐后端提交校验，避免绕过前端直接提交缺失必填字段。
- **D-27:** 必填校验覆盖普通字段、单选、多选、日期、手机号和签名。动态表格列级必填当前 schema 未表达，不在 Phase 16 强行扩展；如需要列级必填，后续作为动态表格增强单独规划。
- **D-28:** 已发布模板修改 schema（包括字段新增、删除、标签、必填、选项、布局、分组、动态表格结构）都形成新的 `schemaVersion`。模板名称、描述、审批模式和流程绑定变化不提升表单 schema 版本。
- **D-29:** 新申请和新公开收集记录都保存提交时 schema 版本/快照。既有公开 `Submission` 继续保存 `schemaVersion`；审批申请继续保存 `schemaSnapshot`，历史渲染不受模板后续修改影响。

### the agent's Discretion
- API 路由组织、TypeBox schema 名称、Prisma enum 命名和前端 store 文件名可按现有模块风格决定。
- 流程配置 UI 的具体控件布局可由实现阶段按 Quasar 桌面表格 + 移动卡片模式落地。
- 绑定流程时是否显示流程节点预览、发布前校验错误的具体文案和 Notify/Dialog 形式由实现阶段决定，但必须避免静默破坏公开收集入口。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 16 goal, dependency on Phase 15, success criteria, and downstream Phase 17-19 boundaries.
- `.planning/REQUIREMENTS.md` — `CFG-01` through `CFG-05`, `DYN-01`, `DYN-02`, plus future requirements that must remain out of scope.
- `.planning/PROJECT.md` — v2.0 project value, MVP boundary, key decisions and existing stack constraints.
- `.planning/research/CLIENT_CHAT_NEXT_FEATURES.md` — client-derived approval center context, dynamic required fields, process/template binding split and MVP boundary.

### Prior locked decisions
- `.planning/phases/15-approval-data-model-state-machine/15-CONTEXT.md` — separate `ApprovalApplication`, `Submission` ownership, process/schema snapshots, serial task creation and state machine decisions that Phase 16 must preserve.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/schema.prisma`: already contains `FormTemplate`, `Submission`, `ApprovalProcess`, `ApprovalProcessNode`, `ApprovalApplication`, `ApprovalTask`, action/timeline models and approver source enum.
- `backend/src/modules/approval/application.service.ts`: existing submit/approve/reject/cancel service expects executable process snapshots and creates tasks in transactions.
- `backend/src/modules/template/template.route.ts`: current template CRUD, publish/offline transition, share link creation and schema version bump logic should be extended rather than replaced.
- `backend/src/modules/department/department.route.ts`: existing department tree CRUD is the natural place to add负责人/默认审批人 maintenance.
- `backend/prisma/seed.ts` and `backend/src/modules/role/role.route.ts`: existing RBAC seed and permission listing patterns are the integration point for approval permissions.
- `frontend/src/pages/TemplatePage.vue`, `frontend/src/pages/FormDesignerPage.vue`, `frontend/src/stores/template.ts`: template list/designer/store already own template status, schema, requireIdentity and publish/share actions.
- `frontend/src/components/renderer/GridFormRenderer.vue` and `frontend/src/components/renderer/FieldRenderer.vue`: shared PC/Mobile rendering and required validation path for dynamic forms.

### Established Patterns
- Backend modules are Elysia route modules under `backend/src/modules/*`, using `authGuard`, TypeBox validation, Prisma and `BizError`.
- Frontend uses Quasar + Pinia with responsive table/card patterns and permission-gated menus/buttons via `v-perm` and `auth.hasPerm`.
- Current public collection is intentionally isolated under public routes and `Submission`; internal approval should not leak JWT-only behavior into the public fill route.
- JSONB schema/data storage is already established; approval flow and schema snapshots should continue this pattern.

### Integration Points
- Add backend approval configuration routes under `/api/v1`, likely as a new approval module registered in `backend/src/index.ts`.
- Extend `FormTemplate` with approval mode and optional bound process relation.
- Extend department persistence/API/UI with负责人/默认审批人.
- Extend seed permissions and MainLayout/router with approval configuration navigation.
- Strengthen shared server-side form-data validation so public collection and future internal approval submission enforce the same required-field rules.

</code_context>

<specifics>
## Specific Ideas

- User selected all recommended defaults and asked that subsequent questions use recommended defaults without further prompting.
- The implementation should feel like a practical OA admin tool, not a workflow-platform builder: ordered node forms, clear validation, and conservative blocking when a change would break public links or approval submissions.
- Existing collection-only behavior is a non-regression constraint. A published public form with links should not suddenly become an internal approval form without explicit admin action.

</specifics>

<deferred>
## Deferred Ideas

- One template simultaneously serving both public collection and internal approval entrypoints is deferred; v2.0 MVP uses one explicit mode per template.
- BPMN/visual workflow design, conditional routing, parallel approval, countersign/or-sign, delegation, transfer and timeout escalation remain out of scope.
- Role nodes with multiple approvers using first-wins or all-must-approve semantics are deferred as advanced workflow behavior.
- Dynamic-table column-level required settings are deferred unless a later phase explicitly expands the schema.
- External notifications, attachments and platform-wide audit logs remain outside Phase 16.

</deferred>

---

*Phase: 16-process-config-template-binding*
*Context gathered: 2026-04-25*
