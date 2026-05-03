---
phase: 25
slug: reimbursement-ui
status: ready
shadcn_initialized: false
preset: none
created: 2026-05-03
---

# Phase 25: 员工报销申请与详情页面 - UI Spec

**Created:** 2026-05-03
**Status:** Ready for planning
**Design Source:** Existing OA Quasar admin patterns; no new visual system.

## Boundary

This spec covers the Phase 25 employee-facing reimbursement UI only: route/menu entry, reimbursement list, filters, create/edit draft form, submit flow, attachment upload/preview/download/delete, read-only detail page and audit trail display. It explicitly excludes department/finance review actions, Canvas signature capture, export, OCR, invoice verification, duplicate detection, payment/accounting integration and statistics dashboards.

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | Quasar 2 |
| Icon library | Material Icons via `@quasar/extras` |
| Font | Existing Quasar/OA default font stack |

## Information Architecture

- List route: `/reimbursements`
- Create route: `/reimbursements/new`
- Edit draft route: `/reimbursements/:id/edit`
- Detail route: `/reimbursements/:id`
- Menu title: `报销管理`
- Page title: `我的报销`
- Read entry permission: `permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review']`
- Create/edit/submit permission: `reimbursement:create`
- Attachment actions permission: `reimbursement:attachment`
- Primary action: `新建报销申请`
- Row/card actions: `查看`, `继续编辑`, `提交申请`; edit/submit only for `DRAFT`

## Spacing Scale

Reuse existing Quasar spacing utilities rather than adding tokens.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, chip gaps |
| sm | 8px | Dense form and table control gaps |
| md | 16px | Card internal spacing, default row gaps |
| lg | 24px | Section padding and form group gaps |
| xl | 32px | Desktop main/side layout gaps |

Exceptions: none.

## Typography

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Body | existing Quasar `text-body2` | 400 | Field values, table/card body |
| Label | existing Quasar caption/label | 500 | Form labels, metadata labels |
| Heading | existing Quasar `text-h6` | 500-600 | Page and card section titles |
| Display | existing Quasar page title style | 600 | Top-level page heading only |

Do not introduce marketing-style hero typography.

## Color and Status Chips

Use existing Quasar color names so implementation stays consistent with prior approval/visit pages.

| Status | Label | Color | Meaning |
|--------|-------|-------|---------|
| `DRAFT` | `草稿` | `grey` | Editable draft, not submitted |
| `DEPARTMENT_REVIEW` | `部门初审` | `orange` | Submitted and awaiting department review |
| `FINANCE_REVIEW` | `财务复核` | `primary` | Awaiting finance review |
| `APPROVED` | `已通过` | `positive` | Terminal approved state |
| `REJECTED` | `已驳回` | `negative` | Terminal rejected state |

Accent is reserved for: primary CTA, active filter action, status chips and inline links. Destructive color is reserved for attachment deletion only.

## List Page Contract

### Desktop

1. Header row
   - Left: `我的报销` title and concise subtitle explaining employees can submit and track reimbursement applications.
   - Right: `新建报销申请` button guarded by `reimbursement:create`.
2. Filter area
   - Dense controls above table.
   - Fields: keyword, status, category, dateFrom, dateTo.
   - Actions: `查询`, `重置筛选`.
3. Table
   - Use `QTable` with server-side pagination and `@request`.
   - Rows per page options: `[10, 20, 50]`.
   - Scan columns: applicationNo, title, category, amount, occurredAt, status, attachmentCount, applicantName, updatedAt, actions.
   - Long reason/remark/payeeInfo content is not expanded inside table cells.
4. Empty state
   - Use existing `EmptyState` component.
   - Heading: `暂无报销申请`.
   - Body: `可新建报销申请并上传发票或凭证。`
   - CTA shown only when the user has `reimbursement:create`.

### Mobile

1. Header remains compact; create button may be round/icon-only with accessible label.
2. Filters move into a bottom `q-dialog` sheet opened by `筛选`.
3. List uses cards, not a horizontally scrollable table.
4. Card content priority:
   - title and status chip
   - applicationNo
   - category and amount
   - occurredAt
   - attachmentCount
   - updatedAt
   - touch-safe view/edit/submit actions when visible
5. Bottom sheet keeps draft filters and only mutates live filters when `应用筛选` is clicked.

## Form Page Contract

- Create page uses `/reimbursements/new`; edit page uses `/reimbursements/:id/edit`.
- Full-page form, not drawer/dialog.
- Desktop layout: centered readable card or main card plus right helper card.
- Mobile layout: single column with sticky bottom action bar.
- Required fields: title, category, occurredAt, amount, reason.
- Optional fields: payeeInfo, remark.
- Validation copy:
  - `请输入报销标题`
  - `请输入报销类别`
  - `请选择发生日期`
  - `报销金额必须大于 0`
  - `请输入报销事由`
- Primary actions:
  - `保存草稿`
  - `提交申请`
  - `返回`
- Direct submit from new page must create draft first, then submit.
- When no application ID exists, attachment area is disabled with copy: `先保存草稿后上传附件`.
- Submitted/non-draft data is read-only; users should be sent to the detail page after successful submit.

## Attachment Contract

- Component: `ReimbursementAttachmentPanel` or equivalent under `frontend/src/components/reimbursement/`.
- Upload control: Quasar `QFile` or button-backed file input.
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Max file size: 10MB.
- Max attachments: 20.
- Backend field name: `file` in `FormData`.
- Multi-select uploads are sent one file at a time in selection order.
- Attachment rows show originalName, type, formatted size, createdAt and actions.
- Image actions: `预览`, `下载`; PDF actions: `下载`.
- Preview/download must use authenticated axios blob requests; do not put protected endpoint URLs directly in `<img src>` or `window.open`.
- Image preview uses an object URL and revokes it when dialog closes or component unmounts.
- Delete action is visible only for draft applications and is guarded by `reimbursement:attachment`.
- Delete confirmation copy includes the attachment name.

## Detail Page Contract

- Full-page detail, not drawer.
- Desktop can use main content plus right summary card; mobile is single column.
- Header shows title, applicationNo, status chip and back action.
- Draft detail highlights `继续编辑` and `提交申请`; non-draft detail is read-only.
- Sections:
  1. Application summary: title, applicationNo, category, amount, occurredAt, status.
  2. Applicant and timestamps: applicantName, applicantDepartmentName, submittedAt, completedAt, createdAt, updatedAt.
  3. Business details: reason, payeeInfo, remark.
  4. Attachments: same attachment panel in read-only mode for submitted applications.
  5. Audit trail: read-only actions timeline.
- Timeline item fields: nodeName, type, actorName, comment, createdAt and optional signature metadata display only.
- No review approval/rejection form appears in Phase 25.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `新建报销申请` |
| Empty state heading | `暂无报销申请` |
| Empty state body | `可新建报销申请并上传发票或凭证。` |
| List error state | `报销列表加载失败，请重试` |
| Detail error state | `报销详情加载失败，请返回列表或重试` |
| Upload disabled hint | `先保存草稿后上传附件` |
| Submit success | `报销申请已提交，等待部门初审` |
| Attachment delete confirmation | `确认删除附件「{name}」？` |

## Negative Contract

Phase 25 UI must not show or wire:

- `部门初审通过`
- `财务复核通过`
- `驳回申请`
- `手写签名`
- `导出 Excel`
- `OCR`
- `发票验真`
- `/approval/applications`
- `/reimbursements/export`
- Direct protected file URLs in `<img src>` or `window.open`

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-03
