# Phase 16: 流程配置与模板绑定 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 16-流程配置与模板绑定
**Areas discussed:** 模板审批模式与公开收集共存, 流程配置与模板绑定方式, 审批人来源解析规则, 部门负责人与 RBAC

---

## Gray Area Selection

The user selected areas `1,2,3,4` from the presented list:

| Area | Selected |
|------|----------|
| 模板审批模式与公开收集共存 | ✓ |
| 流程配置与模板绑定方式 | ✓ |
| 审批人来源解析规则 | ✓ |
| 部门负责人/默认审批人与 RBAC 菜单 | ✓ |
| 必填字段与 schema 版本边界 | |

The user then replied: “全都默认推荐 后续所有问题都按推荐就可以 不用问了”.

---

## 模板审批模式与公开收集共存

| Option | Description | Selected |
|--------|-------------|----------|
| 独立模式字段 | 模板有 `COLLECTION_ONLY` / `APPROVAL_REQUIRED`，仅收集模板生成公开分享链接，审批模板用于登录申请 | ✓ |
| 同模板双入口 | 一个模板同时支持公开收集和内部审批，由管理员分别启用入口 | |
| the agent decides | Use implementation discretion | |

**User's choice:** Recommended default.

**Captured decisions:** Keep publish status separate from business mode; default existing templates to collection-only; prevent silent public-link breakage; show mode as a tag in the existing template list; require valid process binding before publishing approval-required templates.

---

## 流程配置与模板绑定方式

| Option | Description | Selected |
|--------|-------------|----------|
| 独立流程配置页 | Reuse `ApprovalProcess` and bind reusable processes from templates | ✓ |
| 模板内嵌流程编辑 | Configure full flow inside each template designer | |
| the agent decides | Use implementation discretion | |

**User's choice:** Recommended default.

**Captured decisions:** Build practical process configuration as ordered node forms, not BPMN/drag canvas; bind templates to reusable active processes; process edits affect only future submissions because applications snapshot the flow at submit time; block disabling/deleting active bound processes.

---

## 审批人来源解析规则

| Option | Description | Selected |
|--------|-------------|----------|
| Resolve to concrete assignee at submit time | Match Phase 15 task snapshot model and keep existing tasks immutable | ✓ |
| Resolve dynamically when task is handled | Reflect latest role/department changes but risk moving targets | |
| the agent decides | Use implementation discretion | |

**User's choice:** Recommended default.

**Captured decisions:** Fixed users must be active; role source must resolve to exactly one active user in MVP; department manager source walks up the department tree if needed and avoids self-approval; any resolution failure rolls back submission.

---

## 部门负责人与 RBAC

| Option | Description | Selected |
|--------|-------------|----------|
| Add department负责人/default approver and approval permission set | Fits current department/RBAC model and Phase 16 requirements | ✓ |
| Separate approval organization settings | More isolated but adds another admin surface | |
| the agent decides | Use implementation discretion | |

**User's choice:** Recommended default.

**Captured decisions:** Add a department负责人/default approver user field; maintain it through department update permission; seed approval process/template/application/task/export permissions; add approval center navigation with permission-gated routes and buttons.

---

## the agent's Discretion

- Required-field/schema-version boundary was not explicitly selected, but Phase 16 requirements include `DYN-01` and `DYN-02`; CONTEXT.md records conservative defaults from existing code.
- Exact route names, component layout, validation message wording and Prisma enum casing are left to research/planning as long as the locked behavior is preserved.

## Deferred Ideas

- One template with simultaneous public and approval entrypoints.
- BPMN/visual workflow designer and advanced workflow semantics.
- Multi-user role approval semantics such as first-wins or all-must-approve.
- Dynamic-table column-level required settings.
