# Phase 17: 我的申请与动态提交 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 17-我的申请与动态提交
**Mode:** auto
**Areas discussed:** 申请入口与模板选择, 草稿与正式提交, 我的申请列表, 申请详情与时间线, 撤销规则, API、权限与测试

---

## 申请入口与模板选择

| Option | Description | Selected |
|--------|-------------|----------|
| 内部登录入口 | 新增 authenticated approval application flow, only for `APPROVAL_REQUIRED` templates | ✓ |
| 复用公开分享填写页 | Reuse `/f/:code` public route for internal approvals | |
| Agent discretion | Let implementation decide between public/internal ownership | |

**User's choice:** Auto-selected recommended default: 内部登录入口。
**Notes:** Preserves Phase 15/16 decision that public collection owns `Submission` and internal approval owns `ApprovalApplication`.

---

## 草稿与正式提交

| Option | Description | Selected |
|--------|-------------|----------|
| 草稿保存快照，提交才建任务 | Save draft as `ApprovalApplication(DRAFT)` with schema/process snapshots; no task/timeline until submit | ✓ |
| 只在浏览器保存草稿 | Avoid server draft records until formal submit | |
| 提交时重新取最新流程 | Draft data persists but process/schema refreshes on submit | |

**User's choice:** Auto-selected recommended default: 草稿保存快照，提交才建任务。
**Notes:** Matches existing `createDraftApplication` tests and Phase 15 snapshot semantics.

---

## 我的申请列表

| Option | Description | Selected |
|--------|-------------|----------|
| 本人申请中心 | Applicant-only list with status/date filters, PC table and mobile cards | ✓ |
| 部门/全部混合视图 | Include department/all application visibility in this phase | |
| Minimal list only | Show all own rows without filters | |

**User's choice:** Auto-selected recommended default: 本人申请中心。
**Notes:** Department/all archive views are deferred to Phase 19.

---

## 申请详情与时间线

| Option | Description | Selected |
|--------|-------------|----------|
| 快照详情 + 时间线 | Render `schemaSnapshot` and `formData`, plus current status/node and timeline | ✓ |
| 当前模板详情 | Render using latest template schema | |
| 表单详情 only | Omit timeline/status details until later | |

**User's choice:** Auto-selected recommended default: 快照详情 + 时间线。
**Notes:** Historical correctness depends on `schemaSnapshot`, not the current template schema.

---

## 撤销规则

| Option | Description | Selected |
|--------|-------------|----------|
| 未终审可撤销 | Applicant can cancel own `SUBMITTED`/`APPROVING` applications; close pending tasks and write timeline | ✓ |
| 允许撤销草稿和终态 | Treat all non-approved records as cancelable | |
| 不做撤销 | Defer cancel flow despite APP-05 | |

**User's choice:** Auto-selected recommended default: 未终审可撤销。
**Notes:** Mirrors Phase 15 `cancelApplication` state-machine behavior.

---

## API、权限与测试

| Option | Description | Selected |
|--------|-------------|----------|
| Authenticated approval application module | Add `/api/v1/approval/applications` with create/update/submit/list/detail/cancel and existing permissions | ✓ |
| Template module extensions only | Put most application endpoints under `/templates` | |
| Frontend-only planning | Leave backend contracts unspecified | |

**User's choice:** Auto-selected recommended default: Authenticated approval application module。
**Notes:** Uses existing `approval:application:create` and `approval:application:own`; no new permission codes.

---

## the agent's Discretion

- Exact application number format.
- Exact route split between list, create form, and detail view.
- Status chip colors, skeletons, dialog/drawer choice and copy.

## Deferred Ideas

- 审批人待办、审批处理和已办历史 — Phase 18。
- 内部备注、标签、受控编辑、归档导出统计和站内通知 — Phase 19。
- 草稿删除/隐藏、附件、退回修改、复制重发、高级流程和外部通知 — future phases.
