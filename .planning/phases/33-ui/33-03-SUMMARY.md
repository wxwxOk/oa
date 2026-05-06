---
phase: 33-ui
plan: 03
subsystem: ui
tags: [vue3, quasar, q-form, multipart, attachments, dialog, channel-push]

requires:
  - phase: 33-ui plan 01
    provides: ChannelPush types, store, route /channel-push/new and /channel-push/:id/edit
  - phase: 33-ui plan 02
    provides: ChannelPushStatusChip
provides:
  - ChannelPushDuplicateDialog (DEDUP-02 conflict rows + 我知道了 close)
  - ChannelPushAttachmentPanel (upload/preview/download/delete; image/jpeg, image/png, image/webp, application/pdf; 10 MB; 20 files; permission-gated)
  - ChannelPushFormPage (create + edit, mobile sticky bar, duplicate hints, redirect on non-PENDING edit attempt)
affects: [33-04]

tech-stack:
  added: []
  patterns:
    - multipart create flow via store.create(payload, files=[]) — file upload handled via separate /attachments endpoint
    - non-blocking duplicate hint dialog post-submit
    - stricter edit guard: data.status !== 'PENDING' redirects to detail with warning

key-files:
  created:
    - frontend/src/components/channel-push/ChannelPushDuplicateDialog.vue
    - frontend/src/components/channel-push/ChannelPushAttachmentPanel.vue
    - frontend/src/pages/ChannelPushFormPage.vue
  modified: []

key-decisions:
  - "Edit guard performs the status check after fetchDetail and uses router.replace (not router.push) so back-button does not return to the editor."
  - "Initial create uses an empty files[] array because attachment upload is gated by an existing pushId; users add attachments after redirection to /channel-push/:id from the create response."
  - "Attachment panel filters MIME and size client-side before calling store.addAttachments to avoid wasted requests; backend remains the authoritative gate."

patterns-established:
  - "Form page = q-form with greedy validation + sticky mobile action bar mirroring ReimbursementFormPage layout."
  - "Duplicate hint = soft warning dialog after success, not blocker."

requirements-completed:
  - PUSH-01
  - PUSH-02
  - PUSH-05
  - DEDUP-01
  - DEDUP-02

duration: ~30 min
completed: 2026-05-06
---

# Phase 33-ui Plan 03: ChannelPushFormPage + Attachment + DuplicateDialog

**Create/edit form page, reusable attachment panel, and non-blocking duplicate hint dialog — partners can submit with attachments, see duplicates, edit only PENDING records, and route to detail on success.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `ChannelPushDuplicateDialog`: persistent modal showing `检测到 N 条疑似重复推送`, body `提交已成功，请人工核对是否需要撤回。`, q-list of conflict rows (`学员姓名` + `ChannelPushStatusChip` + `手机号 · 提交时间 ...`), single 我知道了 dismiss button.
- `ChannelPushAttachmentPanel`: 附件 / `<n>/20` header, `q-file accept="image/jpeg,image/png,image/webp,application/pdf"` with 10 MB cap, predicate `editable === true && pushId && permission` for upload/delete; preview uses `URL.createObjectURL` and revokes on unmount/dialog close; download triggers anchor click on blob URL.
- `ChannelPushFormPage`: q-form with required studentName/studentPhone validation, optional studentAge/studentEducation/studentGender, intentStatus q-select with `use-input` + `new-value-mode="add-unique"` allowing free-typed values; mobile sticky bottom action bar; ChannelPushAttachmentPanel mounted with attachmentPushId derived from `detail.id ?? routeId`; ChannelPushDuplicateDialog wired to `lastDuplicateHints` and surfacing after success toast.
- Edit guard: when `fetchDetail` returns non-PENDING, surface warning toast and `router.replace` to detail.
- Create flow: `store.create(form, [])` then redirect to `/channel-push/:id`. Edit flow: `store.update(id, form)` then redirect to `/channel-push/:id`. Both surface duplicate hints on success.

## Task Commits

1. **Task 1: ChannelPushDuplicateDialog** — `56e23e6` (feat)
2. **Task 2: ChannelPushAttachmentPanel** — `ed2a20a` (feat)
3. **Task 3: ChannelPushFormPage** — `b177aa9` (feat)

(Tasks committed in topological order: leaf component → mid-level component → page that consumes both, even though plan numbers them differently. Result is identical.)

## Files Created/Modified
- `frontend/src/components/channel-push/ChannelPushDuplicateDialog.vue` — duplicate hint modal (created)
- `frontend/src/components/channel-push/ChannelPushAttachmentPanel.vue` — attachment management panel (created)
- `frontend/src/pages/ChannelPushFormPage.vue` — create/edit form page (created)

## Decisions Made
- **Initial create file array** is `[]` (per plan); attachments are added on the detail/edit page after the partner has a valid pushId. The store's `create()` action still keeps the multipart format with `payload` JSON + `attachments` files in case future flows want a single-shot upload.
- **Attachment formatFileSize** is duplicated from reimbursement utility verbatim (no shared util available); kept local to ChannelPushAttachmentPanel for module independence per CONTEXT D-12/D-13.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness
- Detail page (33-04) can read `store.fetchDetail(id)`, render review actions timeline, and reuse ChannelPushAttachmentPanel + ChannelPushStatusChip.
- Wave 2 closed: list page + form page deliverables wired end-to-end through the store.

---
*Phase: 33-ui*
*Completed: 2026-05-06*
