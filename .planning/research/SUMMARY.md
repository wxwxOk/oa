# Project Research Summary

## v1.3 到访信息管理

**Project:** OA 管理系统
**Domain:** 到访台账 / 渠道线索跟进 / Excel 导入
**Researched:** 2026-05-02
**Confidence:** HIGH

### Executive Summary

v1.3 应新增一个固定业务模块「到访信息管理」，用于承接《渠道往来测试表.xlsx》中的「学员到访跟踪表」。该表是标准业务台账：15 个固定字段覆盖学员基础信息、渠道来源、咨询接待、接待/试听日期、咨询后状态、状态类别、状态说明和解决方案。由于筛选和统计维度稳定，固定 Prisma 表结构比复用自定义表单 JSONB 更合适。

### Stack Additions

- 新增前端依赖 `xlsx` (SheetJS CE)，用于浏览器端解析 `.xlsx`。
- 后端不新增依赖，沿用 Bun + Elysia + Prisma。
- 不做后端文件存储，前端解析后提交标准化 JSON rows。

### Feature Table Stakes

1. 独立菜单和 RBAC 权限：`visit:list/create/update/delete/import/stats`。
2. 到访记录 CRUD：完整维护样表 15 个字段。
3. Excel 导入：识别第 1 行标题、第 2 行表头、第 3 行数据，导入前预览校验。
4. 列表筛选：关键词、渠道商、咨询师、接待人、接待状态、咨询后状态、状态类别、接待日期区间。
5. 跟进详情：长文本状态说明和解决方案可查看/编辑。
6. 基础统计：按渠道商、咨询师、接待人、状态分布汇总，计算有意向/签约类转化概览。

### Architecture Recommendation

- 新增 `VisitRecord` model，直接映射 15 列字段，并补充 `creatorId`、`createdAt`、`updatedAt`。
- 新增 `visitModule`，prefix `/visits`，提供 CRUD、filter-options、stats、import 端点。
- 前端新增 `VisitPage.vue`，内置列表、筛选、导入入口、统计面板；新增 `VisitImportDialog.vue` 负责 SheetJS 解析和预览。
- 路由新增 `/visits`，菜单 icon 可用 `how_to_reg` 或 `assignment_ind`。

### Watch Out For

- 表头在第 2 行，不要默认第一行作为 header。
- 日期统一按日期处理，避免时区漂移。
- 状态字段先存字符串，不要过早枚举化。
- 只做重复提醒，不自动去重合并。
- 长文本在列表中做摘要，完整内容放详情弹窗。
- 导入和统计按钮必须分别做前后端权限控制。

### Recommended Roadmap

1. Phase 20：数据模型 + 后端 API + 权限种子。
2. Phase 21：到访管理页面 + CRUD + 筛选 + 响应式。
3. Phase 22：Excel 导入解析、预览、批量入库。
4. Phase 23：统计面板与聚合 API 完善。

---

## v2.0 表单驱动 OA 审批中心

**Project:** OA v2.0 - 表单驱动 OA 审批中心
**Domain:** Form-driven internal approval workflows for small and medium businesses
**Researched:** 2026-04-25
**Source:** `.planning/research/CLIENT_CHAT_NEXT_FEATURES.md`
**Confidence:** HIGH for MVP direction, MEDIUM for client-specific edge rules

## Executive Summary

The next milestone shifts the product from public/form collection into an authenticated internal approval layer. Existing template design, dynamic table, mobile fill, PDF output, organization, user, department, and RBAC foundations remain valuable, but the missing business layer is approval routing, task ownership, status tracking, post-submit processing, and auditable history.

v2.0 should be a practical OA approval MVP, not a full workflow platform. The recommended approach is a small explicit state machine: templates can be collection-only or approval-required; approval-required submissions create an application, process snapshot, task queue, and immutable timeline events. The first workflow should support fixed approver, role approver, department manager, and serial approval. Complex BPMN, parallel approval, countersign, conditional routing, timeout escalation, external notification integrations, and attachments are deferred unless the client confirms they are mandatory for first delivery.

The critical implementation boundary is data trust. Original submitted data, process snapshots, internal remarks, tags/marks, supplemental processing fields, and edit history should be modeled as related but separate concerns. Post-submit edits must append audit events instead of silently mutating the historical record, because approval decisions, PDF exports, and later disputes depend on trustworthy history.

## Key Findings

### Stack Additions

No major stack change is required for the MVP.

Likely additions during phase planning:
- Excel export library for admin/list export.
- Upload/storage library only if attachments are promoted into v2.0 scope.
- No BPMN engine for v2.0; use explicit Elysia services and Prisma models.

### Table Stakes

- Template approval mode: collection-only vs approval-required.
- Process configuration: single-step and serial approval.
- Approver sources: fixed user, role, and submitter department manager.
- Application submission tied to authenticated user and department.
- My Applications: draft/submitted/approving/approved/rejected/canceled history.
- Pending Approvals: task list, filters, detail view, approve/reject/comment actions.
- Approval timeline: submitted, assigned, approved, rejected, canceled, edited, marked, remarked.
- Mobile approval: readable timeline and sticky action bar.
- Post-collection processing: remarks, tags/marks, controlled edits, supplemental fields.
- Archive/export/statistics: query, Excel list export, PDF reuse, basic aggregates.
- In-app notifications: pending approval and result notification with unread count.

### Differentiators

- Reusing the existing form designer and PDF renderer for approval applications avoids rebuilding form infrastructure.
- Department-manager approval uses the existing organization tree to solve a common client need without a complex workflow engine.
- Processing fields separate internal follow-up work from the formal applicant-submitted form.
- Audit events for edits/remarks/marks make the system more credible than a simple mutable submission table.

### Watch Out For

1. **Workflow scope creep:** BPMN, conditional branches, countersign, delegation, timeout escalation, and external messaging can consume the whole milestone. Keep v2.0 explicit and state-machine based.
2. **Snapshot omission:** If process config or form schema is read live, historical applications will change meaning after admin edits. Snapshot both on submission.
3. **Silent edits:** Allowing staff to overwrite submitted data without before/after audit will break trust in approvals and exports.
4. **Permission ambiguity:** Applicant, approver, department manager, processor, and admin scopes must be modeled early; bolting them on later risks data leakage.
5. **Mobile afterthought:** Client expects employees and approvers to use mobile. Submission detail, dynamic tables, timeline, and action bars must be validated on narrow screens.
6. **Attachment ambiguity:** Reimbursement/evidence forms may need files, but storage and permissions are a separate infrastructure concern. Confirm before adding to v2.0.

## Implications for Roadmap

Recommended v2.0 phases:

1. **Phase 15: Approval Data Model And State Machine** — process definitions, instances, tasks, actions, timeline events, status transitions, snapshots, permission primitives.
2. **Phase 16: Process Configuration And Template Binding** — admin process config, template approval mode, department manager setting, required-field/schema-version handling.
3. **Phase 17: Application Submission, My Applications, And Editable Drafts** — authenticated submission, drafts, application number/status, applicant detail/history/cancel.
4. **Phase 18: Approval Workbench, Mobile Approval, And Remarks** — pending task center, filters, detail, approve/reject/comment, completed history, mobile interaction.
5. **Phase 19: Post-Collection Processing, Archive, Export, And Statistics** — tags, marks, processing fields, controlled edits, in-app notifications, archive query, Excel/PDF export, dashboard stats.

## Open Questions To Validate With Client

1. Which real forms must be supported first?
2. Are approvals usually one-level, two-level, or variable by amount/type?
3. Is department manager enough, or do some forms require fixed approvers?
4. After rejection, should the flow end, return to applicant, or allow resubmission?
5. Is attachment upload mandatory for first delivery?
6. Which notification channel is mandatory for launch?
7. Who can see department-wide and company-wide application data?
8. Who may edit submitted data, and when are approved records locked?
9. Are tags fixed by template, globally managed, or free-form?
10. Should supplemental processing fields appear in PDF/Excel or internal views only?

---
*Research summarized: 2026-04-25*
*Ready for roadmap: yes*
