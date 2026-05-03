# Phase 26: 两级审核与手写签字 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 26-两级审核与手写签字
**Mode:** auto
**Areas discussed:** 审核入口与可处理列表, 审核动作与状态机, 手写签名与保存, 驳回与终态口径, 前端审核体验, 审核轨迹与验证

---

## 审核入口与可处理列表

| Option | Description | Selected |
|--------|-------------|----------|
| 固定报销可处理队列 | 在 `reimbursement` 模块内增加部门/财务待处理口径，部门只看同部门 `DEPARTMENT_REVIEW`，财务只看 `FINANCE_REVIEW`。 | ✓ |
| 复用动态审批任务 | 把报销审核接入 `ApprovalTask` / `ApprovalApplication`。 | |
| 只复用普通列表 | 继续用 `/reimbursements` 通用可见列表，通过前端筛选判断能否处理。 | |

**User's choice:** `[auto]` 固定报销可处理队列。
**Notes:** Phase 24/25 已锁定固定报销模块；普通可见列表不等于可处理队列。

---

## 审核动作与状态机

| Option | Description | Selected |
|--------|-------------|----------|
| 事务化专用动作 | 新增部门/财务通过与驳回服务，后端事务内校验权限、状态、更新 application 并追加 action。 | ✓ |
| 前端直传目标状态 | 由前端传入目标状态，后端直接更新。 | |
| 接入通用工作流引擎 | 把固定报销迁移到动态审批流程状态机。 | |

**User's choice:** `[auto]` 事务化专用动作。
**Notes:** 复用 `assertReimbursementTransition` 和 `submitReimbursementDraft()` 的 transaction + action pattern。

---

## 手写签名与保存

| Option | Description | Selected |
|--------|-------------|----------|
| action-bound PNG 签名文件 | Canvas 生成 PNG，后端保存安全文件并把路径/MIME/大小绑定到对应 `ReimbursementAction`。 | ✓ |
| 普通报销附件 | 把审核签名作为 `ReimbursementAttachment` 显示在附件列表里。 | |
| 数据库 data URL | 直接把 Canvas data URL 存到 action/comment 或 JSON 字段。 | |

**User's choice:** `[auto]` action-bound PNG 签名文件。
**Notes:** Schema 已为 `ReimbursementAction` 预留签名字段；签名是审核证据，不是发票凭证附件。

---

## 驳回与终态口径

| Option | Description | Selected |
|--------|-------------|----------|
| 所有驳回进入终态并记录完成时间 | 部门/财务驳回都进入 `REJECTED`，记录节点/人员/原因/时间，并设置 `completedAt`。 | ✓ |
| 只财务通过记录完成时间 | 仅 `APPROVED` 写 `completedAt`，驳回从 action 反推。 | |
| 驳回后保持可编辑流转 | 驳回不作为终态，允许继续修改或重新进入审核。 | |

**User's choice:** `[auto]` 所有驳回进入终态并记录完成时间。
**Notes:** 便于详情和 Phase 27 导出统一解释终态时间；重新提交/退回修改不属于 Phase 26。

---

## 前端审核体验

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展报销详情页审核操作区 | 在现有报销详情内按权限/状态显示通过、驳回、签字；移动端用 sticky 操作区。 | ✓ |
| 新建动态审批任务页 | 审核人员跳到 `/approval/tasks` 风格页面处理报销。 | |
| 仅列表行内弹窗处理 | 不进入详情，直接在列表行内完成审核。 | |

**User's choice:** `[auto]` 扩展报销详情页审核操作区。
**Notes:** 审核人员需要查看报销字段、附件和完整轨迹后再签字；列表行内处理信息不足。

---

## 审核轨迹与验证

| Option | Description | Selected |
|--------|-------------|----------|
| 真实签名预览 + 聚焦测试 | 轨迹展示签名图片，后端/前端测试覆盖权限、状态、签名、驳回和终态。 | ✓ |
| 仅显示签名元数据 | 继续只显示签名路径/MIME/大小。 | |
| 只做手工验证 | 不补充聚焦测试，交给 Phase 27 UAT。 | |

**User's choice:** `[auto]` 真实签名预览 + 聚焦测试。
**Notes:** Phase 25 已预留轨迹组件；Phase 26 需要把签名从元数据升级为可查看证据。

---

## the agent's Discretion

- 审核 endpoints 的具体命名、review scope 参数或独立队列接口由 planner 选择，但必须分离可处理队列和普通可见列表。
- 签名文件目录、文件名、大小上限、响应 header 和组件抽取方式由实现按现有代码风格决定。
- 具体文案、卡片布局和按钮排序沿用现有 Quasar OA 风格。

## Deferred Ideas

- Excel 明细导出、UAT 和归档 — Phase 27。
- OCR、发票验真、自动金额识别、预算控制、付款打款、财务系统对接、统计看板 — v1.4 out of scope。
- 金额动态分支、多级会签、委托、超时升级和复杂工作流 — 固定两级审核稳定后再评估。
