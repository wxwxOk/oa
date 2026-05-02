# Phase 19: 收集后处理、归档导出统计 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 19-收集后处理、归档导出统计
**Mode:** auto
**Areas discussed:** 归档记录边界与权限, 标签标记与内部备注, 受控编辑与处理字段, 归档查询体验, Excel/PDF 导出, 基础统计, 站内通知

---

## 归档记录边界与权限

| Option | Description | Selected |
|--------|-------------|----------|
| Query/service aggregation | Aggregate `ApprovalApplication` and `Submission` into an archive view without a new parent table. | ✓ |
| New parent record table | Introduce a canonical record table and migrate both sources under it. | |
| Separate pages only | Keep approval applications and collection submissions fully separate. | |

**Auto choice:** Query/service aggregation.
**Notes:** This preserves Phase 15's locked decision that Phase 19 should aggregate at service/query layer first.

## 标签标记与内部备注

| Option | Description | Selected |
|--------|-------------|----------|
| Separate metadata/events | Store tags, marks and remarks outside submitted form data with append-only audit history. | ✓ |
| JSON inside form data | Store operational state in `formData` / `Submission.data`. | |
| Timeline comments only | Treat every post-processing note as only a timeline comment. | |

**Auto choice:** Separate metadata/events.
**Notes:** This follows the project decision that original submitted data, processing fields, tags/remarks and audit events are separate concerns.

## 受控编辑与处理字段

| Option | Description | Selected |
|--------|-------------|----------|
| Correction overlay with audit | Preserve original data and record effective corrections with field-level before/after history. | ✓ |
| Mutate formData directly | Directly update stored submitted data after edit. | |
| Only allow processing fields | Do not support corrections to submitted fields. | |

**Auto choice:** Correction overlay with audit.
**Notes:** This satisfies OPS-02 while keeping original values recoverable for disputes, approvals and PDFs.

## 归档查询体验

| Option | Description | Selected |
|--------|-------------|----------|
| Unified archive center | Add one archive page with source type, status, date, person, department and tag filters. | ✓ |
| Approval-only archive | Only archive internal approval applications. | |
| Per-template collection pages only | Extend existing template submission pages without a unified archive. | |

**Auto choice:** Unified archive center.
**Notes:** Requirement scope explicitly covers approval and collection records.

## Excel/PDF 导出

| Option | Description | Selected |
|--------|-------------|----------|
| Filtered Excel plus single PDF reuse | Export filtered list to Excel and reuse existing single-detail PDF/print path. | ✓ |
| Batch PDF focus | Prioritize multi-record PDF generation over Excel. | |
| Backend PDF rewrite | Replace frontend html2canvas/jsPDF with server-side PDF generation. | |

**Auto choice:** Filtered Excel plus single PDF reuse.
**Notes:** This keeps Phase 13's locked PDF decision and directly satisfies OPS-05.

## 基础统计

| Option | Description | Selected |
|--------|-------------|----------|
| Basic aggregates | Aggregate by template, status, department and month. | ✓ |
| Custom field analytics | Add per-field charting and metric definitions. | |
| BI dashboard | Build a configurable reporting platform. | |

**Auto choice:** Basic aggregates.
**Notes:** Advanced reporting is outside v2.0 MVP.

## 站内通知

| Option | Description | Selected |
|--------|-------------|----------|
| In-app only | Store user notifications for new tasks and approval results, with unread count. | ✓ |
| External integrations | Add Enterprise WeChat, DingTalk, SMS or email. | |
| Realtime push platform | Add WebSocket/SSE notification delivery. | |

**Auto choice:** In-app only.
**Notes:** External channels are explicitly future scope; polling is acceptable for the MVP.

## the agent's Discretion

- Exact Prisma model names and route names.
- Excel library choice and row limit.
- Detail layout ordering and status/tag colors.
- Whether notification unread count appears in the header, menu, or both.

## Deferred Ideas

- External notifications through Enterprise WeChat, DingTalk, SMS or email.
- Attachment fields and evidence-file export.
- Full BI/custom field analytics.
- Dedicated tag taxonomy management UI.
- Realtime WebSocket/SSE notification delivery.
