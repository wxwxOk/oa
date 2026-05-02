# Phase 15: 审批数据模型与状态机 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 15-审批数据模型与状态机
**Areas discussed:** 申请记录和现有 Submission 的关系, 快照范围, 状态机和驳回/撤销语义, 任务推进和串行审批规则

---

## 申请记录和现有 Submission 的关系

| Option | Description | Selected |
|--------|-------------|----------|
| 新建独立 `ApprovalApplication` | 审批申请不复用 `Submission`，自己保存 `formData`、`schemaSnapshot`、申请人/部门/状态等；`Submission` 保持公开收集用途。 | yes |
| 扩展 `Submission` 承载审批 | 给 `Submission` 加申请人、状态、审批实例等字段，并让 `shareLinkId` 可空。 | |
| 双写：审批申请 + 对应 `Submission` | 提交审批时同时写 `ApprovalApplication` 和 `Submission`。 | |

**User's choice:** 新建独立 `ApprovalApplication`
**Notes:** 公开收集和内部审批语义分开，避免混表。

| Option | Description | Selected |
|--------|-------------|----------|
| 不预留统一表，后续查询层聚合 | `Submission` 和 `ApprovalApplication` 各自建模；Phase 19 做归档/统计时用 service/query 聚合两类数据。 | yes |
| 预留 `RecordType`/统一父表 | 建一个共同父记录或统一编号表。 | |
| 只加可选关联字段 | `ApprovalApplication` 可选关联 `Submission`，但首版不主动写。 | |

**User's choice:** 不预留统一表，后续查询层聚合
**Notes:** 保持 Phase 15 模型清晰，统一归档放到后续查询层。

---

## 快照范围

| Option | Description | Selected |
|--------|-------------|----------|
| 完整业务快照 | 保存 `schemaSnapshot`、`processSnapshot`、模板名称/版本、申请人姓名、申请人部门名称、节点名称、审批人来源配置、创建时的流程节点顺序。 | yes |
| 只快照 schema + process config | 其它名称/部门/用户显示时从当前表读。 | |
| 极简快照 + 事件补偿 | 只存关键 ID 和版本，靠时间线事件记录当时动作。 | |

**User's choice:** 完整业务快照
**Notes:** 历史申请不能因为模板改名、人员调岗、部门改名或流程配置调整而改变语义。

| Option | Description | Selected |
|--------|-------------|----------|
| 申请表直接保存 `formData` JSONB | `ApprovalApplication.formData` 保存申请人提交的数据，配套 `schemaSnapshot` 渲染。 | yes |
| 申请表只存元数据，表单数据单独一张表 | `ApprovalApplicationData` 单独保存 JSONB/版本。 | |
| 字段级拆表保存 | 每个字段单独成行。 | |

**User's choice:** 申请表直接保存 `formData` JSONB
**Notes:** 沿用现有动态表单 JSONB 思路。

| Option | Description | Selected |
|--------|-------------|----------|
| 可执行流程快照 | `processSnapshot` 是后续推进任务的唯一依据。 | yes |
| 展示快照，执行读最新流程定义 | 快照只用于历史展示，任务推进读当前流程配置。 | |
| 混合：已创建任务固定，未创建任务读最新配置 | 中途变配置会影响串行审批解释。 | |

**User's choice:** 可执行流程快照
**Notes:** 管理员修改流程定义不影响已经创建的申请。

---

## 状态机和驳回/撤销语义

| Option | Description | Selected |
|--------|-------------|----------|
| 线性显式状态机 | `draft -> submitted -> approving -> approved/rejected/canceled`；终态不能再流转。 | yes |
| 允许 `rejected` 回到 `draft` | 驳回后申请人可修改并重新提交。 | |
| 弱状态机，按服务动作各自校验 | 每个服务函数自己判断当前状态。 | |

**User's choice:** 线性显式状态机
**Notes:** 状态机函数集中校验非法跳转。

| Option | Description | Selected |
|--------|-------------|----------|
| 驳回即终止申请 | 审批人驳回后申请进入 `rejected` 终态，关闭全部待办。 | yes |
| 驳回退回申请人修改 | 驳回后回到草稿或退回态。 | |
| 模板级可配置驳回策略 | 有些终止，有些退回修改。 | |

**User's choice:** 驳回即终止申请
**Notes:** 复制/重新发起留给后续阶段。

| Option | Description | Selected |
|--------|-------------|----------|
| 未终审前可撤销 | `submitted` 或 `approving` 可撤销到 `canceled`。 | yes |
| 只允许 `submitted` 撤销 | 只有尚未进入审批中的申请可撤销。 | |
| 不在 v2.0 首版支持撤销 | 状态保留 `canceled` 但暂不开放动作。 | |

**User's choice:** 未终审前可撤销
**Notes:** 撤销关闭所有待办并写时间线。

| Option | Description | Selected |
|--------|-------------|----------|
| `submitted` 是创建后、首个任务分配前的短暂状态 | 创建申请写入 `submitted` 事件，然后同一事务创建首个任务并推进到 `approving`。 | yes |
| `submitted` 表示等待第一级审批，`approving` 表示多级审批中 | 单步审批全程保持 `submitted`，多步才进入 `approving`。 | |
| 不用 `submitted`，提交后直接 `approving` | 状态少，但需求已明确列出 `submitted`。 | |

**User's choice:** `submitted` 是创建后、首个任务分配前的短暂状态
**Notes:** 提交事件和任务分配事件都要写入时间线，通常在同一事务内完成。

---

## 任务推进和串行审批规则

| Option | Description | Selected |
|--------|-------------|----------|
| 按需创建当前节点任务 | 提交时只创建第一个待办；当前节点通过后关闭当前任务，再创建下一个节点任务。 | yes |
| 提交时一次性创建全部节点任务 | 所有节点任务提前创建，未轮到的任务是 waiting。 | |
| 不建任务表，只从状态和节点算待办 | 数据少，但不满足任务模型要求。 | |

**User's choice:** 按需创建当前节点任务
**Notes:** 串行推进清晰，任务表只保存实际发生/待处理任务。

| Option | Description | Selected |
|--------|-------------|----------|
| `PENDING/APPROVED/REJECTED/CANCELED/SKIPPED` | 待处理、通过、驳回、撤销关闭和未来跳过。 | yes |
| 只用 `PENDING/DONE/CLOSED` | 通过、驳回、撤销要去动作表查。 | |
| 只保留 `PENDING/COMPLETED` | Phase 18 已处理历史难以直接区分结果。 | |

**User's choice:** `PENDING/APPROVED/REJECTED/CANCELED/SKIPPED`
**Notes:** 首版主要使用前四个，`SKIPPED` 预留。

| Option | Description | Selected |
|--------|-------------|----------|
| 任务创建时解析为具体处理人快照 | `ApprovalTask` 保存 `assigneeId/assigneeName` 和来源快照。 | yes |
| 任务只保存审批人来源规则，处理时动态判断 | 角色/部门负责人变化会立刻影响待办权限。 | |
| 混合：固定用户快照，角色/负责人动态判断 | 用户看到“谁在审批”会不一致。 | |

**User's choice:** 任务创建时解析为具体处理人快照
**Notes:** 已创建任务不受后续角色或部门负责人变更影响。

| Option | Description | Selected |
|--------|-------------|----------|
| 状态、任务、动作、时间线同事务写入 | 一个 Prisma transaction 内更新状态、关闭/创建任务、写动作记录、追加时间线。 | yes |
| 服务顺序写入，不强制 transaction | 失败中断可能留下不一致数据。 | |
| 只保证任务和状态同事务，时间线异步补写 | 主流程快，但时间线作为审计证据可信度下降。 | |

**User's choice:** 状态、任务、动作、时间线同事务写入
**Notes:** 避免任务、状态、动作、时间线不一致。

---

## the agent's Discretion

- Exact Prisma model names, enum casing, relation names and indexes.
- Action/timeline physical table split, provided append-only audit semantics are preserved.
- Backend route/service organization and API response shape.

## Deferred Ideas

- Unified parent record table for public submissions and approval applications.
- Rejected-to-draft resubmission, configurable rejection strategy, and copy/restart application flow.
- Eager creation of all serial tasks.
- Parallel approval, countersign, delegation, conditional branching and BPMN engine.
