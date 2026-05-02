# Phase 17: 我的申请与动态提交 - Research

**Researched:** 2026-04-25
**Status:** Ready for planning

## RESEARCH COMPLETE

## Executive Summary

Phase 17 should be planned as an authenticated approval-application feature built on the Phase 15 service primitives and Phase 16 template/process binding. The core implementation gap is not schema design; the models and service methods already exist. The phase needs:

- a backend application route module that wraps `createDraftApplication`, `submitApplication`, `cancelApplication`, `resolveProcessSnapshot`, and required-field validation into employee-safe APIs;
- a frontend Pinia store and routes for employee application list, template picker, draft/new form, and detail/timeline;
- tests that prove drafts do not create tasks, formal submit creates the first pending task, only the applicant can access own records, and snapshot rendering uses `schemaSnapshot`.

Do not merge public collection (`Submission`) and internal approval (`ApprovalApplication`). Phase 17 should leave approver handling, archive/export, tags/remarks, notifications, and post-submit editing to Phase 18-19.

## Current Codebase Findings

### Backend Foundation

- `backend/prisma/schema.prisma` already has `ApprovalApplication`, `ApprovalTask`, `ApprovalAction`, `ApprovalTimelineEvent`, `ApprovalApplicationStatus`, and `ApprovalTaskStatus`.
- `ApprovalApplication` already stores `applicationNo`, `status`, `formData`, `schemaSnapshot`, `processSnapshot`, template/process snapshot metadata, applicant/department snapshots, current node, submitted/completed timestamps, and indexes on template/process/applicant/department/status/createdAt.
- `backend/src/modules/approval/application.service.ts` already provides:
  - `createDraftApplication(input)` creates `DRAFT` records and does not create tasks;
  - `submitApplication(applicationId, actor)` verifies applicant ownership, writes `SUBMIT` and `ASSIGN` events, creates the first pending task, and transitions to `APPROVING`;
  - `cancelApplication(applicationId, actor, comment?)` verifies applicant ownership, closes pending tasks, writes `CANCEL`, and transitions to `CANCELED`;
  - approval/rejection services for Phase 18.
- `backend/src/modules/approval/process-config.service.ts` already provides `resolveProcessSnapshot(processId, applicantId)`, including fixed user, role, and department-manager resolution.
- `backend/src/modules/template/schema.validation.ts` already provides `validateFormDataRequiredFields(schema, data)`, which Phase 17 should use on formal submit but not on draft save.
- `backend/src/modules/approval/process.route.ts` shows the expected Elysia route/module style: `authGuard`, TypeBox body/query schemas, Prisma access, `BizError`, and response serialization.
- `backend/src/index.ts` already registers `approvalProcessModule`; Phase 17 should add and register a sibling `approvalApplicationModule`.

### Frontend Foundation

- `frontend/src/components/renderer/GridFormRenderer.vue` supports `mode="fill"` with validation/signature save and `mode="print"` for read-only dynamic form rendering.
- `frontend/src/pages/PublicFillPage.vue` is the best reference for dynamic fill ergonomics and mobile sticky submit action, but Phase 17 must use authenticated APIs and not reuse public routes.
- `frontend/src/pages/SubmissionPage.vue` is the best reference for desktop `q-table`, mobile card list, filters, right drawer detail, PDF/detail flow, and `useResponsive()`.
- `frontend/src/components/submission/SubmissionDetail.vue` is the closest dynamic read-only detail renderer; approval detail should adapt this pattern with `schemaSnapshot` rather than `submission.template.schema`.
- `frontend/src/pages/ApprovalProcessPage.vue` is the best reference for approval-area navigation, status filter toggles, mobile cards, permission-gated icon buttons, dialogs, and Quasar `Notify`/`Dialog`.
- `frontend/src/layouts/MainLayout.vue` already has an `审批管理` navigation group; add `我的申请` beneath it.
- Existing Pinia stores (`template`, `submission`, `approvalProcess`) use simple API wrappers and local pagination state. Add a dedicated `approvalApplication` store rather than overloading `submission`.

## Recommended Plan Decomposition

### Plan 17-01: Backend Application API And Service Adapters

Build authenticated routes under `/api/v1/approval/applications`:

- `GET /templates` or `GET /available-templates`: employee-safe list of `PUBLISHED + APPROVAL_REQUIRED` templates with active valid process binding.
- `POST /drafts`: create a draft from a template, resolving `schemaSnapshot`, `processSnapshot`, applicant/department snapshots and generated `applicationNo`.
- `PUT /:id/draft`: update `formData` for own `DRAFT` only.
- `POST /:id/submit`: validate required fields, save latest draft data if provided, submit, assign first task.
- `GET /`: own application list with status/date/page filters.
- `GET /:id`: own application detail including timeline and tasks summary needed for current node display.
- `POST /:id/cancel`: cancel own `SUBMITTED`/`APPROVING` application with optional reason.

Implementation should prefer small service helpers around existing primitives:

- `generateApplicationNo()`;
- `assertOwnApplication(application, currentUser)`;
- `loadAvailableApprovalTemplate(templateId)`;
- `buildDraftInput(template, currentUser, formData)`;
- `serializeApplicationListRow()`;
- `serializeApplicationDetail()`.

Potential model gap: no separate draft-updater service exists. Add `updateDraftApplication(applicationId, actor, formData)` or keep it route-local if small, but keep ownership and status checks centralized enough for tests.

### Plan 17-02: Backend Tests And Required Validation

Add or extend tests around route/service behavior:

- draft creation snapshots schema/process/applicant/department and creates zero tasks;
- draft update allowed only for applicant and `DRAFT`;
- formal submit fails required-field validation;
- formal submit creates first task and `SUBMIT`/`ASSIGN` timeline events;
- list returns only current applicant records and filters statuses/date range;
- detail returns timeline and uses `schemaSnapshot`;
- cancel closes pending tasks and writes `CANCEL`;
- non-applicant access returns forbidden for list/detail/update/submit/cancel where applicable.

Use `bun:test` patterns from `backend/src/modules/approval/__tests__/application.service.test.ts`.

### Plan 17-03: Frontend Store, Routes, And Navigation

Add:

- `frontend/src/stores/approvalApplication.ts`;
- route(s) under `/approval/applications`;
- `我的申请` menu entry under `审批管理` with `approval:application:own`;
- typed DTOs for list row, detail, timeline event, available template, draft/submit/cancel payloads.

Keep store API methods aligned with backend route names:

- `fetchTemplates()`;
- `createDraft(templateId, formData?)`;
- `updateDraft(id, formData)`;
- `submit(id, formData?)`;
- `fetchList(filters)`;
- `fetchDetail(id)`;
- `cancel(id, reason?)`.

### Plan 17-04: Employee Application Pages

Build the UI from the approved UI-SPEC:

- `ApprovalApplicationPage.vue`: list/table/cards, filters, empty/error/loading states, create CTA.
- Template picker dialog or route segment for starting a new application.
- `ApprovalApplicationFormPage.vue`: new application and continue draft flow using `GridFormRenderer mode="fill"`, signature save, save draft, submit.
- `ApprovalApplicationDetailPage.vue`: summary, status/current node, read-only `GridFormRenderer mode="print"`, timeline, visibility hint, cancel action when allowed.

If context budget is tight, split form/detail into components:

- `components/approval/ApplicationStatusChip.vue`;
- `components/approval/ApplicationTimeline.vue`;
- `components/approval/ApplicationFormShell.vue`;
- `components/approval/ApplicationDetailSnapshot.vue`.

### Plan 17-05: Frontend Validation And Responsive QA

Verify:

- PC table and Mobile card list render without overflow;
- filters work and reset;
- template picker excludes collection-only templates;
- draft save does not require all fields;
- submit validates required fields and signatures;
- detail renders historical schema snapshot;
- cancel confirmation uses destructive copy and hides on terminal/draft statuses;
- permission gating hides create/list controls appropriately.

Use existing Vitest patterns where practical and manual/Playwright smoke checks if the repo already supports them. If no E2E harness exists, planner should include manual verification commands and screenshots as acceptance criteria.

## API Contract Details For Planner

### Status Mapping

Backend statuses:

- `DRAFT` -> UI label `草稿`;
- `SUBMITTED`/`APPROVING` -> UI label `审批中`;
- `APPROVED` -> `已通过`;
- `REJECTED` -> `已驳回`;
- `CANCELED` -> `已撤销`.

List filter values can be backend status values plus UI alias `IN_PROGRESS`, but the backend should normalize `IN_PROGRESS` to `SUBMITTED` + `APPROVING` or expose separate statuses and let frontend send both.

### Date Filtering

Use inclusive `dateFrom`/`dateTo` filters on `createdAt` or `updatedAt`. Recommended default for list ordering is `updatedAt desc` because draft edits and status changes should surface recent activity. If implementation uses `createdAt`, keep it consistent in UI copy.

### Detail Shape

Detail should include:

- application core fields;
- `schemaSnapshot`;
- `formData`;
- timeline events ordered ascending by `createdAt`;
- tasks ordered by `nodeOrder`/`assignedAt` for current node and future Phase 18 reuse;
- `canCancel` boolean computed server-side from applicant + status.

Server-side `canCancel` prevents frontend from duplicating state-machine nuance. Frontend can still hide based on status for responsiveness.

### Template Picker Shape

Available template rows should include:

- `id`, `name`, `description`, `schemaVersion`, `schema`, `approvalProcessId`, `approvalProcess.name`.

For new application form, either load full template details after selection or return enough data from template picker. Avoid sending public share-link data.

## Security And Authorization Notes

Plans must include a `<threat_model>` block. Relevant threats:

- IDOR: applicants accessing, editing, submitting, or canceling other users' applications by guessing IDs.
- Workflow bypass: direct submit API bypassing required fields or process resolution.
- Draft/task confusion: draft save accidentally creating tasks or timeline events.
- Public/private boundary breach: internal approval endpoints accidentally exposed under public `/api` routes without JWT.
- Snapshot tampering: client-provided schema/process snapshots must not be trusted; server must derive snapshots from template/process records.
- Duplicate submission: repeated submit clicks should not create duplicate tasks/events; backend should reject non-draft submit and frontend should disable while loading.
- Cancellation race: cancel and approve could race; existing transaction/state checks should be preserved.

High severity blockers: IDOR, public route exposure, trusting client snapshots, duplicate task creation, and invalid state transitions.

## Validation Architecture

### Unit/Service Tests

- `backend/src/modules/approval/__tests__/application.service.test.ts` should remain green.
- Add tests for any new service adapter functions that create/update drafts, submit with validation, list/filter own applications, and serialize details.

### Route/API Tests

Add route tests if local harness supports Elysia module invocation. Minimum coverage:

- auth required for all approval application endpoints;
- permission required for create/list/detail/cancel;
- applicant ownership enforced;
- required fields enforced on submit only;
- list filtering returns correct rows.

If route-test harness is not established, planner should require service-level tests plus manual API smoke via frontend or direct Bun invocation.

### Frontend Tests

- Store tests can mock `api` calls for list/detail/create/update/submit/cancel methods.
- Component tests should focus on pure helpers/status mapping if full Quasar mount is costly.
- Manual responsive QA is required for 375px mobile and desktop widths because this phase contains significant UI.

### End-To-End Smoke

Recommended smoke path:

1. Login as employee with `approval:application:create` and `approval:application:own`.
2. Open `我的申请`.
3. Start application from an approval-required published template.
4. Save incomplete draft; verify list shows `草稿` and no task exists.
5. Continue draft, complete required fields/signature, submit.
6. Verify list shows `审批中`, detail shows current node and timeline `提交申请`/`分配审批任务`.
7. Cancel the application; verify list/detail show `已撤销` and timeline includes `撤销申请`.

## Known Non-Goals

- No approver task list or approve/reject UI.
- No internal comments/remarks/tags.
- No archive/all-department query.
- No Excel/PDF export work unless existing detail print behavior is trivially reused for read-only rendering.
- No attachments, external notifications, return-to-applicant edit flow, or advanced workflow routing.
