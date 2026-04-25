# Phase 15: 审批数据模型与状态机 - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

建立 v2.0 审批中心的后端基础，使内部审批申请、流程定义、流程节点、审批任务、审批动作、时间线事件、快照和合法状态流转有可信数据模型。Phase 15 只处理数据模型、状态机、任务推进和基础服务/API 测试；流程配置 UI、模板绑定、我的申请、待我审批、备注标记、归档导出统计分别属于后续 Phase 16-19。

</domain>

<decisions>
## Implementation Decisions

### 申请记录和现有 Submission 的关系
- **D-01:** 审批申请首版新建独立 `ApprovalApplication`，不复用现有 `Submission`；`ApprovalApplication` 自己保存 `formData`、`schemaSnapshot`、申请人、部门、状态和当前节点等审批语义。
- **D-02:** 现有 `Submission` 继续只服务公开分享链接收集场景，避免把公开收集和内部审批两种业务混在一张表里。
- **D-03:** Phase 15 不建统一父记录表，也不强制 `ApprovalApplication` 关联 `Submission`；Phase 19 的归档/统计统一视图由 service/query 层聚合 `Submission` 和 `ApprovalApplication`。

### 快照范围
- **D-04:** 创建审批申请时保存完整业务快照：`schemaSnapshot`、`processSnapshot`、模板名称/版本、申请人姓名、申请人部门名称、节点名称、审批人来源配置和创建时的流程节点顺序。
- **D-05:** `ApprovalApplication.formData` 使用 JSONB 保存申请人提交的动态表单数据，并通过 `schemaSnapshot` 渲染历史详情，沿用现有 `Submission.data` 的动态数据模式。
- **D-06:** `processSnapshot` 是可执行流程快照，是后续任务推进的唯一依据；管理员后续修改流程定义不影响已经创建的申请。

### 状态机和驳回/撤销语义
- **D-07:** 首版使用集中显式状态机校验合法跳转：`draft -> submitted -> approving -> approved/rejected/canceled`。
- **D-08:** `approved`、`rejected`、`canceled` 都是终态，终态不能再流转。
- **D-09:** 驳回即终止申请：审批人驳回后申请进入 `rejected` 终态，并关闭全部未处理待办；复制/重新发起申请留给后续阶段。
- **D-10:** 申请人可在未终审前撤销，`submitted` 或 `approving` 可转 `canceled`；已进入 `approved/rejected/canceled` 后不可撤销。
- **D-11:** `submitted` 是申请创建后、首个任务分配前的短暂状态；创建申请写入提交事件，然后同一事务创建首个任务并推进到 `approving`。

### 任务推进和串行审批规则
- **D-12:** 串行审批按需创建当前节点任务：提交时只创建第一个待办；当前节点通过后关闭当前任务并创建下一个节点任务。
- **D-13:** 最后一个节点通过后申请进入 `approved` 终态；驳回或撤销时关闭全部未处理任务。
- **D-14:** 任务状态使用 `PENDING/APPROVED/REJECTED/CANCELED/SKIPPED`；首版主要使用前四个，`SKIPPED` 作为未来兼容状态预留。
- **D-15:** 任务创建时解析为具体处理人快照，`ApprovalTask` 保存 `assigneeId/assigneeName` 和审批人来源快照；已创建任务不受后续角色或部门负责人变更影响。
- **D-16:** 审批通过、驳回、撤销等动作必须在一个 Prisma transaction 内完成申请状态更新、任务关闭/创建、动作记录和时间线追加。

### the agent's Discretion
- Exact Prisma model names, enum casing, relation names and index choices may follow local conventions as long as they preserve the decisions above.
- Whether action records and timeline events are implemented as one append-only event table plus typed payloads, or as action table plus derived timeline rows, is left to planning/research. The result must satisfy MODEL-04 and keep audit history immutable.
- API route shape and service file organization are flexible, but state transition logic should be centralized rather than copied into route handlers.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 15 goal, dependencies, success criteria and downstream phase boundaries.
- `.planning/REQUIREMENTS.md` — `MODEL-01` through `MODEL-04`, plus related later requirements that Phase 15 must enable.
- `.planning/PROJECT.md` — v2.0 project value, active requirements, key decisions and out-of-scope boundaries.
- `.planning/research/CLIENT_CHAT_NEXT_FEATURES.md` — client-derived approval center context, MVP boundary and developer notes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/schema.prisma`: current Prisma schema contains `User`, `Department`, `Role`, `Permission`, `FormTemplate`, `ShareLink`, `Submission`, JSONB form schema/data patterns, and enum-based statuses.
- `backend/src/plugins/prisma.ts`: shared Prisma client used by route modules; Phase 15 services should use the same client and transactions for state/task/event writes.
- `backend/src/utils/errors.ts`: `BizError`, `notFound`, `forbidden`, and `unauthorized` are the existing business error pattern for illegal state transitions and invalid actions.
- `backend/src/middlewares/auth.ts`: loads `currentUser` with roles and permissions; later approval APIs can use this for applicant/approver identity.

### Established Patterns
- `Submission.data` and `FormTemplate.schema` already use JSONB, so `ApprovalApplication.formData`, `schemaSnapshot`, and `processSnapshot` should fit the existing persistence style.
- `backend/src/modules/template/template.route.ts` has an inline template status transition pattern; Phase 15 should use a stronger centralized state machine because approval transitions are more complex and must be tested.
- Current backend modules are Elysia route modules under `backend/src/modules/*`, with TypeBox validation and Prisma access inside route handlers or module helpers.
- Existing tests use `bun:test`, as seen in `backend/src/modules/template/__tests__/schema.validation.test.ts`; Phase 15 tests should follow Bun test conventions.

### Integration Points
- Approval models will relate to existing `User`, `Department`, and `FormTemplate`.
- `Submission` should remain unchanged in semantic ownership: public form collection via `ShareLink`.
- Phase 16 will bind templates to approval mode/process definitions; Phase 15 should create model/service foundations that Phase 16 can extend without replacing.

</code_context>

<specifics>
## Specific Ideas

- Historical applications must remain understandable even if a template is renamed, an applicant changes department, department names change, or process definitions are edited later.
- Rejecting an application ends that application in v2.0 MVP; reapplying should be a future copy/restart flow rather than a Phase 15 return-to-draft path.
- `submitted` and first-task assignment should usually happen in the same transaction so the user does not see a long-lived limbo state.

</specifics>

<deferred>
## Deferred Ideas

- Unified parent record table for public submissions and approval applications — deferred; Phase 19 can aggregate in query/service layer first.
- Rejected-to-draft resubmission, template-level rejection strategy, return-to-applicant editing, and copy/restart application flows — deferred to later application workflow phases.
- Eager creation of all serial tasks and waiting-task visibility — deferred; Phase 15 uses current-node task creation.
- Parallel approval, countersign, delegation, conditional branch and BPMN-style process engine — explicitly outside v2.0 MVP foundation.

</deferred>

---

*Phase: 15-approval-data-model-state-machine*
*Context gathered: 2026-04-25*
