# Client Chat Requirements: Next Feature Development

**Source:** User-provided WeChat screenshot, 2026-04-25  
**Perspective:** Green right-side messages are the developer/乙方.  
**Context:** Current project has shipped v1.2 with organization management, configurable forms, grid layout, mobile fill pages, and PDF output. Workflow/approval was previously marked v2.0+ candidate scope.

## Executive Summary

The client discussion changes the next milestone from "better form collection" to a **form-driven OA approval center**.

The core workflow should become:

1. Admin configures a form template.
2. Admin optionally binds an approval process to that template.
3. Employee opens the form on mobile or PC and submits an application.
4. The system routes the submission to the configured approver.
5. Approver handles it on mobile or PC with approve/reject/comment actions.
6. Applicant, approver, and admins can track status.
7. Internal staff can continue processing collected records with controlled edits, tags, and remarks.
8. Final data is archived, printable/exportable, and queryable by permission scope.

This is not a small enhancement to the current public form collection module. It is a new business layer on top of existing templates and submissions.

## Requirements Extracted From The Chat

### High Confidence

- The client wants to replace paper-based internal forms with online forms.
- The client expects employees to fill forms mainly on mobile.
- The client does not only need anonymous/public collection; many forms need supervisor confirmation or approval.
- The system should be configurable enough that each new business form does not require developer changes.
- The current form designer and PDF capability are useful foundations, but approval status, task routing, and approval records are missing.
- The client prefers a practical MVP over a complex enterprise workflow platform.
- Collected submissions should not be treated as frozen read-only records. Employees need a controlled way to edit, mark, and annotate them during follow-up work.
- Dynamic form configuration remains important: admins should be able to add the fields that must be submitted without developer changes.

### Medium Confidence

- Typical target forms include leave, business trip, reimbursement, vehicle use, purchase/request, and other internal approval sheets.
- The client may expect reminders or message notifications after submission or approval.
- The client may expect department-level statistics and admin-level data aggregation.
- Some forms may need attachments, especially reimbursement or evidence-based approvals.

## Functional Requirements

### V2-FR-01 Template Approval Mode

Each form template should support a mode:

- `COLLECTION_ONLY`: current behavior, submit and archive.
- `APPROVAL_REQUIRED`: submit creates an approval instance.

Templates should store a bound process definition or a simple approval config snapshot.

### V2-FR-02 Process Definition

Admins should configure approval flow without code changes.

MVP scope:

- Single-step approval by fixed user, role, or department manager.
- Optional multi-step serial approval.
- Final states: draft, submitted, approving, approved, rejected, canceled.
- Node metadata: approver source, node name, order, required action.

Deferred:

- Full BPMN editor.
- Parallel approval.
- Conditional branches.
- Delegation, countersign, timeout escalation.

### V2-FR-03 Submission As Application

When a user submits an approval-required template:

- Save form data against a schema snapshot.
- Save process snapshot to protect historical applications from later config changes.
- Create an approval instance.
- Create the first pending approval task.
- Expose application number, applicant, department, template, status, created time, and current node.

### V2-FR-04 My Applications

Applicants need a "My Applications" view:

- Drafts if enabled.
- Submitted/approving applications.
- Approved/rejected/canceled history.
- Detail page with form data, approval timeline, comments, and current status.
- Ability to cancel before final approval if business rules allow.

### V2-FR-05 Approval Task Center

Approvers need a "Pending Approvals" workbench:

- Pending task list.
- Filters by template, applicant, department, status, and date.
- Detail view with rendered form data.
- Approve, reject, and comment actions.
- Completed approvals history.

### V2-FR-06 Approval Timeline And Audit Trail

Every application needs an immutable event history:

- Submitted.
- Assigned to approver.
- Approved/rejected.
- Returned or canceled.
- Operator, action, comment, timestamp, and node.

This is required for client trust and later dispute tracing.

### V2-FR-07 Mobile Approval Experience

Mobile support is a first-class requirement:

- Mobile application submission page.
- Mobile approval detail page.
- Sticky action bar for approve/reject.
- Timeline readable on narrow screens.
- Dynamic tables and signatures remain usable on mobile.

### V2-FR-08 Notifications

MVP should provide in-app notifications:

- New pending approval.
- Application approved/rejected.
- Optional unread count in navigation.

External integrations should be separate phases:

- Enterprise WeChat / DingTalk.
- SMS.
- Email.

### V2-FR-09 Data Archive, Export, And Statistics

Admins and authorized managers need to inspect approved and rejected data:

- Query by template, department, applicant, status, date range.
- Query/filter by employee-applied tags and processing marks.
- Export Excel for list data.
- Export/print PDF for individual application.
- Basic statistics by template, status, department, and month.

### V2-FR-10 Organization Approval Roles

The existing department/user system needs one extra concept:

- Department manager or responsible approver.

This enables common rules like "submitter's department manager approves" without manually assigning every user.

### V2-FR-11 Permissions

Add RBAC permissions for:

- Process config management.
- Template approval binding.
- Submit application.
- Approve assigned task.
- View own applications.
- View department applications.
- View all applications.
- Export approval data.

### V2-FR-12 Attachments

Attachment fields should be treated as a likely follow-up requirement, especially for reimbursement or evidence-based forms.

MVP decision needed:

- Either include image/file upload infrastructure in v2.0.
- Or explicitly defer and tell the client that first approval version supports structured form fields only.

### V2-FR-13 Post-Collection Editing, Tags, And Remarks

Authorized employees should be able to further process collected form records after submission.

MVP scope:

- Edit submitted form data when the record is not locked by final approval rules.
- Add internal remarks that do not alter the original submitted data.
- Add tags/marks such as `待跟进`, `已核对`, `资料不全`, `重点`, or custom template-level tags.
- Show edit history: editor, changed fields, before/after values, reason, and timestamp.
- Show remark history independently from form data history.

Permission model:

- Applicant can edit drafts and possibly pending submissions before first approval.
- Approver can add remarks and marks while handling tasks.
- Admin/authorized staff can correct archived records only with audit trail.

Important boundary:

- Use append-only audit events for every post-submit edit.
- Do not silently overwrite submitted data, because approvals, PDF output, and later disputes depend on trustworthy history.

### V2-FR-14 Dynamic Required Fields And Supplemental Fields

The dynamic form system should support configurable submission fields without code changes.

MVP scope:

- Admins can add required fields in the template designer.
- Required validation should apply on PC and mobile filling pages.
- Fields added after a template is published should create a new schema version.
- Existing submitted records keep their original schema snapshot.
- Internal staff can add supplemental processing fields if the template enables them, for example `跟进结果`, `处理人备注`, `回访时间`.

Recommended split:

- Template fields: submitted by applicant and included in the formal application/PDF.
- Processing fields: maintained by internal staff after collection, visible in admin/approval views, optionally excluded from applicant-facing PDF.

## Proposed Milestone Split

### Phase 15: Approval Data Model And State Machine

Build the backend foundation: process definitions, approval instances, tasks, actions, timeline events, and status transitions.

### Phase 16: Process Configuration And Template Binding

Add admin UI/API to define simple approval flows and bind them to templates.

### Phase 17: Application Submission, My Applications, And Editable Drafts

Convert internal template filling into logged-in application submission, with applicant-facing status tracking, drafts, and controlled pre-approval edits.

### Phase 18: Approval Workbench, Mobile Approval, And Remarks

Add pending approvals, approve/reject/comment actions, approval detail pages, internal remarks, and mobile-first approval interactions.

### Phase 19: Post-Collection Processing, Archive, Export, And Statistics

Add tags/marks, post-collection edit history, in-app notifications, admin/manager query views, Excel export, PDF reuse, and dashboard statistics.

### Phase 20: Attachments And Advanced Workflow

Only after MVP approval is stable: upload fields, conditional routing, parallel approval, delegation, timeout escalation, external message integrations.

## MVP Boundary Recommendation

Build first:

- Single or serial approval.
- Department manager approval.
- My applications.
- Pending approvals.
- Approval timeline.
- Editable drafts or controlled pre-approval edits.
- Internal tags/marks and remarks.
- Mobile approve/reject.
- Admin query and PDF export.
- In-app notifications.

Do not build first:

- BPMN-style visual process designer.
- Complex conditional logic.
- Parallel/countersign approval.
- Enterprise WeChat/DingTalk/SMS integrations.
- Full document management.
- Attendance-specific rules.

## Open Questions For Client

1. Which real forms must be supported in the first delivery?
2. Are approvals usually one-level, two-level, or variable by amount/type?
3. Is "department manager" enough, or do some templates require fixed approvers?
4. What should happen after rejection: end, return to applicant, or allow resubmission?
5. Is attachment upload required for the first version?
6. Which notification channel is mandatory: in-app, Enterprise WeChat, DingTalk, SMS, or email?
7. Who can see department-wide and company-wide submitted data?
8. Is Excel export required in the first approval milestone?
9. After submission, who is allowed to edit form data: applicant, approver, admin, or assigned processor?
10. Should final approved records be locked, or can admins still correct them with audit trail?
11. Are tags fixed by the template, globally managed, or free-form text entered by employees?
12. Should supplemental processing fields appear in exported PDF/Excel, or only in internal views?

## Developer Notes

- Reuse the existing template schema, renderer, mobile layout, and PDF output.
- Do not treat approval as public form collection. Approval submission should be authenticated and tied to a user and department.
- Store snapshots for both form schema and process config, otherwise old approval records will change meaning after admin edits.
- Model submitted form data, internal remarks, tags, and processing fields as separate concerns. They have different permissions and audit requirements.
- Existing `Submission.data` is JSONB and can hold dynamic field values, but v2 should add explicit metadata/audit tables instead of hiding operational state inside the data blob.
- Keep the first workflow engine explicit and state-machine based. A full workflow/BPMN engine is only justified if the client confirms complex routing rules.
