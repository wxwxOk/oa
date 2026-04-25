# Project Research Summary

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
