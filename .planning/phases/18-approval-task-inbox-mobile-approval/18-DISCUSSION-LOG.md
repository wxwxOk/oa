# Phase 18: 待我审批与移动审批 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-26T11:17:22+08:00
**Phase:** 18-待我审批与移动审批
**Mode:** auto
**Areas discussed:** 审批待办入口与权限, 筛选与已办历史, 审批详情与快照渲染, 通过/驳回处理流, 移动端审批体验, 内部处理备注

---

## 审批待办入口与权限

| Option | Description | Selected |
|--------|-------------|----------|
| 独立待办任务入口 | 新增“待我审批”入口和任务 API，复用 `ApprovalTask` 与 `approval:task:*` 权限。 | yes |
| 并入我的申请 | 在“我的申请”中同时展示申请人和审批人视角，页面更少但语义混杂。 | |
| 部门/全部审批队列 | 同时做管理端审批队列，覆盖更多角色但超出 Phase 18 MVP。 | |

**User's choice:** `[auto]` Selected recommended default: 独立待办任务入口.
**Notes:** Existing own-application route is applicant-scoped; approver tasks need assignee-scoped query and action permissions.

---

## 筛选与已办历史

| Option | Description | Selected |
|--------|-------------|----------|
| 待办优先 + 已办分离 | 默认 pending task queue，已处理历史单独 tab/view。 | yes |
| 一个混合列表 | 待办、已办、关闭记录混在一个列表，用筛选区区分。 | |
| 只做待办 | 最快实现，但不能满足 APR-04 已处理历史。 | |

**User's choice:** `[auto]` Selected recommended default: 待办优先 + 已办分离.
**Notes:** APR-04 requires processed history; separating pending and processed reduces accidental action risk.

---

## 审批详情与快照渲染

| Option | Description | Selected |
|--------|-------------|----------|
| 全页快照详情 | Reuse Phase 17 detail pattern with `schemaSnapshot` + `formData`, summary and timeline. | yes |
| 列表抽屉详情 | Faster navigation, but weak for long dynamic forms and mobile. | |
| 只显示摘要 | Minimal scope, but insufficient for approval confidence and APR-02. | |

**User's choice:** `[auto]` Selected recommended default: 全页快照详情.
**Notes:** Existing `ApprovalApplicationDetailPage.vue` and `GridFormRenderer mode="print"` are strong reuse points.

---

## 通过/驳回处理流

| Option | Description | Selected |
|--------|-------------|----------|
| 详情页弹窗确认 | Approver reviews full context, then confirms approve/reject with opinion handling. | yes |
| 列表快捷审批 | Faster for batch work but risky for dynamic forms and mobile mistakes. | |
| 先只展示不处理 | Safer implementation but fails APR-03. | |

**User's choice:** `[auto]` Selected recommended default: 详情页弹窗确认.
**Notes:** Backend already has transaction-safe `approveTask` and `rejectTask`; Phase 18 should expose them through task routes.

---

## 移动端审批体验

| Option | Description | Selected |
|--------|-------------|----------|
| sticky 底部操作区 | Keeps approve/reject reachable after reading long forms; requires bottom padding. | yes |
| 顶部固定按钮 | Actions visible early, but users may act before reviewing content. | |
| 普通内联按钮 | Simpler but poor for long mobile forms. | |

**User's choice:** `[auto]` Selected recommended default: sticky 底部操作区.
**Notes:** Must avoid covering dynamic tables, signature fields and long read-only form content.

---

## 内部处理备注

| Option | Description | Selected |
|--------|-------------|----------|
| 内部 COMMENT 事件 | Append internal notes as approval events without mutating `formData`. | yes |
| 写入表单数据 | Easy to display but violates snapshot/original-submission separation. | |
| 延期到 Phase 19 | Avoids visibility complexity but fails APR-06. | |

**User's choice:** `[auto]` Selected recommended default: 内部 COMMENT 事件.
**Notes:** Internal remarks should be visible to approvers and hidden from applicant own-detail unless later requirements say otherwise.

---

## the agent's Discretion

- Exact API file names, route component names, status chip styling and list sorting are left to planning/implementation.
- Planner may decide whether canceled tasks appear in processed history as a secondary “已关闭” filter, but they must not be labeled as approver-handled results.

## Deferred Ideas

- 标签/标记、字段级提交后编辑、处理字段、归档查询、Excel/PDF 导出、统计和站内通知 - Phase 19.
- 部门/全部审批队列、管理员代审批、转交、委托、催办、超时升级和批量审批 - future approval operations phases.
- 退回申请人修改、重新提交策略、驳回复制重发、附件上传、条件分支、并行/会签和外部企业通知 - future advanced workflow phases.
