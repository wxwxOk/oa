# Phase 26: 两级审核与手写签字 - UI Spec

**Created:** 2026-05-03
**Status:** Ready for planning

## Scope

Phase 26 extends the existing fixed reimbursement UI. It does not introduce a new approval center, dynamic form page, export page, OCR flow, statistics dashboard, or payment workflow.

## Entry and List Contract

- Keep the top-level menu entry `报销管理` and route family `/reimbursements`.
- Add reviewer queue controls inside `ReimbursementPage.vue` using these visible labels:
  - `全部可见`
  - `待部门初审`
  - `待财务复核`
- Show `待部门初审` only when `auth.hasPerm('reimbursement:department-review')` is true.
- Show `待财务复核` only when `auth.hasPerm('reimbursement:finance-review')` is true.
- Queue semantics are backend-defined:
  - department queue calls `/reimbursements/review/department`
  - finance queue calls `/reimbursements/review/finance`
  - all-visible list keeps `/reimbursements`

## Detail Review Actions

Extend `ReimbursementDetailPage.vue` as the reimbursement review workbench.

### Desktop

- Place review actions in the existing right-side `detail-side` card.
- Department actionable state (`DEPARTMENT_REVIEW` + `reimbursement:department-review`) shows:
  - primary button `部门初审通过`
  - negative/outline button `驳回申请`
- Finance actionable state (`FINANCE_REVIEW` + `reimbursement:finance-review`) shows:
  - primary button `财务复核通过`
  - negative/outline button `驳回申请`

### Mobile

- Use a sticky bottom action bar class `mobile-review-actions`.
- Include `padding-bottom: calc(12px + env(safe-area-inset-bottom))` or equivalent safe-area spacing.
- Buttons must be at least 44px high.

## Dialogs

### Approve Dialog

- Dialog titles:
  - `确认部门初审通过`
  - `确认财务复核通过`
- Include application summary: `applicationNo`, `title`, `amount`, `applicantName`, `applicantDepartmentName`.
- Include optional comment input label `审核意见（选填）`.
- Include a handwritten signature component with visible text `手写签名` and empty-state hint `点击签名`.
- Confirm button labels:
  - `确认部门初审通过`
  - `确认财务复核通过`
- Confirm is disabled until a non-empty PNG signature exists.

### Reject Dialog

- Dialog title `确认驳回申请`.
- Include application summary.
- Include required textarea label `驳回原因`.
- Confirm button label `确认驳回`.
- Confirm is disabled while `rejectComment.trim().length === 0`.

## Signature Component

Create `ReimbursementSignaturePad.vue` under `frontend/src/components/reimbursement/`.

- Use existing `signature_pad` dependency.
- Desktop uses normal `q-dialog`; mobile uses maximized `q-dialog` with `slide-up` / `slide-down` transitions.
- Expose `save()`, `clear()`, and `isEmpty()`.
- Emit/update a PNG data URL from `toDataURL('image/png')`.
- Do not upload from the component directly. Upload remains store-owned through approval action methods.

## Timeline Signature Preview

Upgrade `ReimbursementActionTimeline.vue`.

- Add `applicationId` prop.
- For actions with `signatureRelativePath`, render an actual signature image from an object URL.
- Fetch signatures through `store.previewSignatureBlob(applicationId, action.id)`.
- Revoke object URLs on unmount or reload.
- Keep submit and reject actions text-only when no signature metadata exists.

## Feedback Copy

- Department approve success: `部门初审已通过，申请进入财务复核`
- Department reject success: `报销申请已驳回`
- Finance approve success: `财务复核已通过，报销申请完成`
- Finance reject success: `报销申请已驳回`
- Generic action failure: `审核操作失败，请检查后重试。`

## Negative Contract

The Phase 26 UI must not contain:

- `/approval/applications`
- `/approval/tasks` as the host for fixed reimbursement review
- `/reimbursements/export`
- `导出 Excel`
- `OCR`
- `发票验真`
- direct protected signature or attachment URLs in templates
- review controls for `DRAFT`, `APPROVED`, or `REJECTED`

---

*Phase: 26-reimbursement-review-signature*
