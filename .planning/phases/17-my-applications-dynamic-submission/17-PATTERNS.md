# Phase 17: Pattern Map

**Created:** 2026-04-25
**Purpose:** Codebase analogs for planning Phase 17 without inventing new structure.

## Backend Patterns

### Route Module Shape

Use `backend/src/modules/approval/process.route.ts` as the primary analog.

- Register a new sibling module from `backend/src/index.ts`.
- Use `new Elysia({ prefix: '/approval/applications' })`.
- Use `authGuard(...)` per route group.
- Use TypeBox request schemas.
- Throw `BizError`/`notFound` from `backend/src/utils/errors.ts`.
- Serialize Prisma records before returning to frontend.

Do not put internal approval routes under `backend/src/modules/public/public.route.ts`.

### Approval Service Primitives

Use `backend/src/modules/approval/application.service.ts`.

- `createDraftApplication` already creates `DRAFT` records with snapshots and zero tasks.
- `submitApplication` already handles applicant ownership, submit/assign events, first task creation and transition to `APPROVING`.
- `cancelApplication` already handles applicant ownership, pending task closure, `CANCEL` timeline and terminal transition.
- Add focused helpers for route needs instead of duplicating transition logic in handlers.

Planner should preserve transaction semantics and state-machine checks.

### Process Snapshot Resolution

Use `backend/src/modules/approval/process-config.service.ts`.

- `resolveProcessSnapshot(processId, applicantId)` is the correct way to build executable process snapshots.
- The client must never submit `processSnapshot` or `schemaSnapshot`.
- Department-manager errors should surface as business errors and prevent draft creation if the chosen template cannot resolve its process.

### Required Field Validation

Use `backend/src/modules/template/schema.validation.ts`.

- Call `validateFormDataRequiredFields(schemaSnapshot, formData)` during formal submit.
- Do not call it for incomplete draft save.
- Dynamic-table column-level required validation is still deferred.

### Tests

Use `backend/src/modules/approval/__tests__/application.service.test.ts`.

- Existing fixture style creates departments, users, templates, processes and process nodes directly through Prisma.
- Clean up approval timeline/action/task/application/process/template/user/department tables in `beforeEach`.
- Add tests adjacent to approval tests for route/service adapters.

Use `backend/src/modules/template/__tests__/template.approval-mode.test.ts` for template business mode and published approval template constraints.

## Frontend Patterns

### Store Pattern

Use `frontend/src/stores/submission.ts` and `frontend/src/stores/approvalProcess.ts`.

- Define DTO interfaces in the store.
- Keep `rows`, `total`, `loading`, `page`, `size` in state.
- Expose small async actions that wrap `api.get/post/put`.
- Keep filter state in page component unless it is shared.

New file should be `frontend/src/stores/approvalApplication.ts`.

### Routes And Navigation

Use `frontend/src/router/routes.ts` and `frontend/src/layouts/MainLayout.vue`.

- Add authenticated child route under `/approval/applications`.
- Add menu child under existing `审批管理`.
- Gate list route/menu with `approval:application:own`.
- Gate create/form actions with `approval:application:create`.

### List Page

Use `frontend/src/pages/SubmissionPage.vue` and `frontend/src/pages/ApprovalProcessPage.vue`.

- Desktop: `q-page padding`, header row, filters, `q-table flat bordered dense`.
- Mobile: card list with `q-card flat bordered`, top row title + status chip, metadata rows, and action buttons.
- Use `EmptyState.vue` for empty list/template picker states.
- Use `useResponsive()` to branch desktop/mobile.

### Dynamic Form Page

Use `frontend/src/pages/PublicFillPage.vue` only as an ergonomics analog, not as a route/API ownership analog.

- Reuse `GridFormRenderer mode="fill"`.
- Call `validateFields()` and `saveSignatures()` before submit.
- For save draft, do not require `validateFields()`.
- Use mobile sticky bottom actions with safe-area padding.
- Display logged-in applicant/department snapshot instead of public identity inputs.

### Detail Page

Use `frontend/src/components/submission/SubmissionDetail.vue`.

- Render `GridFormRenderer mode="print"`.
- Use `ApprovalApplication.schemaSnapshot`, not current template schema.
- Add summary fields and timeline alongside the form.
- Timeline can use Quasar `q-timeline`; keep comments wrapping.

### Status UI

Status mapping:

- `DRAFT` -> `草稿`, warning chip.
- `SUBMITTED`/`APPROVING` -> `审批中`, primary chip.
- `APPROVED` -> `已通过`, positive chip.
- `REJECTED` -> `已驳回`, negative chip.
- `CANCELED` -> `已撤销`, grey chip.

Prefer a small reusable `ApplicationStatusChip.vue` if multiple pages need it.

## Warnings For Planner

- Do not trust client-provided snapshots.
- Do not reuse public fill route or public axios instance.
- Do not let draft save create tasks or timeline submit/assign events.
- Do not allow non-applicants to list/detail/update/submit/cancel another user's application.
- Do not implement Phase 18 approver task handling in this phase.
- Do not implement Phase 19 archive/export/tag/comment/edit features in this phase.
