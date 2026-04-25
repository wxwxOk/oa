# Phase 16: Process Config And Template Binding - Research

**Phase:** 16 - 流程配置与模板绑定
**Date:** 2026-04-25
**Status:** Ready for UI design contract gate

## Research Goal

Plan the configuration layer on top of Phase 15 approval foundations: administrators can define simple serial approval processes, bind an active valid process to approval-required templates, maintain department default approvers, seed approval RBAC permissions, and preserve the existing public collection workflow for collection-only templates.

The planner must cover `CFG-01`, `CFG-02`, `CFG-03`, `CFG-04`, `CFG-05`, `DYN-01`, and `DYN-02`.

## Current Codebase Findings

### Backend Foundation

- Backend modules are Elysia route modules under `backend/src/modules/*`, registered in `backend/src/index.ts` under `/api/v1`.
- Auth is permission-code based through `authGuard('permission:code')`.
- Business errors use `BizError` and `notFound` from `backend/src/utils/errors.ts`.
- Prisma schema already contains Phase 15 approval models: `ApprovalProcess`, `ApprovalProcessNode`, `ApprovalApplication`, `ApprovalTask`, `ApprovalAction`, and `ApprovalTimelineEvent`.
- `ApprovalProcessNode` already supports `USER`, `ROLE`, and `DEPARTMENT_MANAGER` through `ApprovalApproverSourceType`.
- `backend/src/modules/approval/application.service.ts` expects executable process snapshots with concrete `assigneeId` and `assigneeName`; Phase 16 must provide validation/resolution helpers that produce this shape for Phase 17 submission.
- `backend/src/modules/template/template.route.ts` owns template CRUD, schema version increments, publish/offline transitions, and share-link creation. It currently has no approval mode or process binding fields.
- `backend/src/modules/template/schema.validation.ts` validates schema shape but does not validate submitted form data values against required fields.
- `backend/src/modules/department/department.route.ts` returns department tree nodes with only `id`, `name`, `parentId`, and `sort`. It has no default approver relation yet.
- `backend/prisma/seed.ts` seeds permissions and assigns all permissions to `ADMIN`; `EMPLOYEE` currently receives permissions ending with `:list`.

### Frontend Foundation

- `frontend/src/pages/TemplatePage.vue` provides the template list with status filter, status badge, schema version, share/publish/offline/delete actions, and responsive table/card layouts.
- `frontend/src/pages/FormDesignerPage.vue` loads a template, edits `schema` and `requireIdentity`, and publishes/offlines templates.
- `frontend/src/stores/template.ts` defines the `Template` interface and API methods for list/detail/update/status/share.
- `frontend/src/pages/DepartmentPage.vue` owns department tree display and department create/edit/delete dialog.
- `frontend/src/layouts/MainLayout.vue` defines permission-filtered navigation and mobile bottom tabs.
- `frontend/src/router/routes.ts` registers guarded routes with `meta.perm`.
- `GridFormRenderer.vue` and `FieldRenderer.vue` are the shared PC/mobile fill renderers. `FieldRenderer` currently has incomplete imperative required validation: radio, checkbox, and signature are checked in `validate()`, but text, textarea, date, and phone depend on Quasar input rules that `GridFormRenderer.validateFields()` does not await or call directly.

### Existing Public Collection Behavior

- Public form filling is isolated under `/f/:code` and public backend routes.
- Existing templates generate share links only when `status === 'PUBLISHED'`.
- `Submission` remains the public collection table, separate from `ApprovalApplication`.
- Phase 16 must keep collection-only templates compatible with all existing public share links and submission views.

## Required Data Model Changes

### FormTemplate Approval Mode

Add fields to `backend/prisma/schema.prisma`:

- enum `TemplateBusinessMode` with `COLLECTION_ONLY` and `APPROVAL_REQUIRED`.
- `FormTemplate.businessMode TemplateBusinessMode @default(COLLECTION_ONLY)`.
- `FormTemplate.approvalProcessId Int?`.
- relation from `FormTemplate` to `ApprovalProcess`, for example `approvalProcess ApprovalProcess?`.
- index on `businessMode` and `approvalProcessId`.

The default must preserve existing templates as collection-only after migration.

### Department Default Approver

Add to `Department`:

- `defaultApproverId Int?`.
- relation to `User` with an explicit relation name such as `"DepartmentDefaultApprover"`.
- index on `defaultApproverId`.

The user relation should be nullable so existing departments migrate cleanly.

## Backend Implementation Research

### Approval Process Configuration API

Create an approval configuration route module, likely `backend/src/modules/approval/process.route.ts`, and register it in `backend/src/index.ts`.

Recommended endpoints:

- `GET /approval/processes` guarded by `approval:process:list`, with optional `isActive` query.
- `GET /approval/processes/:id` guarded by `approval:process:list`, includes ordered nodes.
- `POST /approval/processes` guarded by `approval:process:create`.
- `PUT /approval/processes/:id` guarded by `approval:process:update`.
- `PATCH /approval/processes/:id/status` guarded by `approval:process:update`.
- `DELETE /approval/processes/:id` guarded by `approval:process:delete`.
- `POST /approval/processes/:id/validate` guarded by `approval:process:list` or `approval:process:update`.

Process create/update should replace nodes transactionally because the UI edits an ordered node list. Validation must reject:

- zero nodes.
- duplicate or non-positive order.
- `USER` nodes missing `approverUserId`.
- `USER` nodes pointing to a missing or non-`ACTIVE` user.
- `ROLE` nodes missing `approverRoleId`.
- `ROLE` nodes whose role resolves to zero active users or more than one active user.
- `DEPARTMENT_MANAGER` nodes with irrelevant user/role ids populated.

Disabling or deleting a process must be blocked when it is bound by a published `APPROVAL_REQUIRED` template. The check should query `formTemplate` by `approvalProcessId`, `businessMode: 'APPROVAL_REQUIRED'`, and `status: 'PUBLISHED'`.

### Approver Resolution Service

Create a shared backend helper, likely `backend/src/modules/approval/process-config.service.ts`, with functions:

- `validateProcessDefinition(processId)` for admin configuration/publish checks.
- `resolveProcessSnapshot(processId, applicantId)` for Phase 17 application submission.
- `resolveDepartmentApprover(departmentId, applicantId)` that walks parent departments until it finds `defaultApproverId`, skips self-approval when possible, and throws if no substitute is found.

Role resolution in MVP must resolve to exactly one active user. If role membership count is zero or more than one, return a clear `BizError`.

### Template Binding API

Extend `backend/src/modules/template/template.route.ts`:

- list/detail responses include `businessMode`, `approvalProcessId`, and selected process summary.
- update accepts `businessMode` and `approvalProcessId`, guarded by `approval:template:bind` when those fields are changed.
- publishing an `APPROVAL_REQUIRED` template validates that `approvalProcessId` exists, process is active, and process structure is valid.
- share-link creation rejects `APPROVAL_REQUIRED` templates.
- switching a published template with share links from `COLLECTION_ONLY` to `APPROVAL_REQUIRED` must require an explicit confirmation flag such as `disconnectPublicCollection: true`, or require prior offline status. Without that flag/status, throw `BizError`.
- schema edits on a published template continue to increment `schemaVersion`.
- approval mode and process binding changes must not increment `schemaVersion`.

The planner should avoid splitting template CRUD into a new page or route family; the current route is the integration point.

### Required Field Server Validation

Add a pure validator near `backend/src/modules/template/schema.validation.ts`, for example:

- `validateFormDataRequiredFields(schema, data): void`.

It should cover Phase 16 required types:

- `text`, `textarea`, `date`, `phone`: non-empty trimmed string.
- `phone`: if present for a required field, must match the existing frontend mask expectation `^1\\d{10}$`.
- `radio`: non-empty scalar.
- `checkbox`: non-empty array.
- `signature`: non-empty data URL/string.

Dynamic table column-level required is out of scope because the schema cannot express it yet.

Public submission routes and later approval submission routes should call the same validator. For Phase 16, the plan should update current public submission handling so direct API calls cannot bypass frontend required validation.

## Frontend Implementation Research

### Process Config Page

Add a practical OA admin page, likely `frontend/src/pages/ApprovalProcessPage.vue`, plus a Pinia store such as `frontend/src/stores/approvalProcess.ts`.

UI shape should be Quasar table/card plus dialog/form:

- process list: name, status, node count, updated time, actions.
- process editor: name, description, active toggle, ordered node rows.
- node fields: node name, order, approver source type, fixed user selector, role selector.
- `DEPARTMENT_MANAGER` nodes do not need a parameter selector.
- no BPMN canvas, drag designer, conditions, countersign, or parallel approval.

The page should use existing permission patterns:

- route `meta.perm: 'approval:process:list'`.
- action buttons with `v-perm`.
- navigation entry under a new approval/admin group.

### Template List And Designer

Extend `TemplatePage.vue`:

- add a purpose/use badge next to status: `仅收集` for `COLLECTION_ONLY`, `需审批` for `APPROVAL_REQUIRED`.
- hide/disable share action for approval-required templates.
- keep submission-list action for collection-only behavior.

Extend `FormDesignerPage.vue` and `template.ts`:

- add business mode selector with `COLLECTION_ONLY` and `APPROVAL_REQUIRED`.
- add approval process selector when mode is `APPROVAL_REQUIRED`.
- save binding through existing template update flow.
- publish dialog should explain approval-required templates need a valid enabled process.
- if switching away from collection-only on a published shared template, require an explicit confirmation matching the backend flag.

### Department Default Approver UI

Extend `DepartmentPage.vue`:

- department tree/list node display includes default approver real name when present.
- create/edit dialog adds a user select for default approver.
- save payload includes `defaultApproverId`.

The backend route should include `defaultApprover` in `/departments` and `/departments/tree` responses so the UI does not need extra per-node requests.

### Required Validation Fix

`GridFormRenderer.validateFields()` currently calls `FieldRenderer.validate(value, field)` but `FieldRenderer.validate()` returns `true` for required text, textarea, date, and phone because it delegates those to QInput rules. The plan should make `FieldRenderer.validate()` check all field types directly or expose/await `q-input.validate()`.

For deterministic shared validation, direct type checks are simpler and match the backend validator.

## RBAC Research

Seed permissions in `backend/prisma/seed.ts`:

- `approval:process:list`
- `approval:process:create`
- `approval:process:update`
- `approval:process:delete`
- `approval:template:bind`
- `approval:application:create`
- `approval:application:own`
- `approval:application:department`
- `approval:application:all`
- `approval:task:list`
- `approval:task:handle`
- `approval:export`

`ADMIN` should receive all permissions through the existing all-permissions assignment.

For `EMPLOYEE`, do not rely on the current `endsWith(':list')` rule for approval permissions. Phase 16 should explicitly assign `approval:application:create` and `approval:application:own`, plus existing list permissions if desired. Approval task handling should remain admin-configurable through role management.

## Schema And Migration Requirements

This phase modifies `backend/prisma/schema.prisma`, so the plan must include a blocking Prisma schema task:

- create/update migration under `backend/prisma/migrations/*`.
- run `cd backend && bun --env-file=../.env prisma generate`.
- run database migration or push command appropriate to the repo's migration flow.

This repository already uses migration folders, so prefer:

- `cd backend && bun --env-file=../.env prisma migrate dev --name add_process_config_template_binding`

If the local database is unavailable, the executor must still update schema/migration artifacts and report the blocked DB command.

## Security And Integrity Notes

Threats the PLAN.md files must cover:

- `T16-01`: public collection links are broken by silently switching a published template to approval-required. Mitigation: default `COLLECTION_ONLY`, explicit confirmation/offline requirement, and share-link creation block.
- `T16-02`: invalid process config creates unassignable approval tasks. Mitigation: validation on process save, template publish, and submission snapshot resolution.
- `T16-03`: role approver resolves to multiple users and creates ambiguous task ownership. Mitigation: MVP requires exactly one active role user.
- `T16-04`: department-manager source resolves to the applicant or nobody. Mitigation: parent lookup, self-approval avoidance, and transaction-level failure before application/task creation.
- `T16-05`: direct API submission bypasses required fields. Mitigation: backend required-field validator reused by public and approval submission paths.
- `T16-06`: permission gaps expose process/template binding to normal users. Mitigation: seed RBAC codes, route guards, router `meta.perm`, and `v-perm` controls.

## Validation Architecture

### Test Infrastructure

- Framework: Bun built-in test runner (`bun:test`) for backend unit/integration tests.
- Existing backend tests live under module `__tests__` directories.
- Frontend verification uses Quasar/Vite build and TypeScript checks through existing package scripts.
- Quick backend command: `cd backend && bun test src/modules/template/__tests__/schema.validation.test.ts`.
- Approval command after new tests: `cd backend && bun test src/modules/approval/__tests__/process-config.service.test.ts src/modules/template/__tests__/template.approval-mode.test.ts src/modules/template/__tests__/schema.validation.test.ts`.
- Build commands: `cd backend && bun run build`; `cd frontend && bun run build`.

### Required Automated Coverage

1. Process configuration service tests
   - accepts single-node fixed-user process with active user.
   - accepts serial multi-node process.
   - rejects no-node process.
   - rejects disabled/missing fixed user.
   - rejects role source with zero active users.
   - rejects role source with more than one active user.
   - resolves department manager by current department.
   - walks parent departments when child has no default approver.
   - avoids applicant self-approval and throws when no alternative exists.

2. Template route or service tests
   - existing templates default to `COLLECTION_ONLY`.
   - approval-required template publish fails without active valid process.
   - collection-only published template can still create share links.
   - approval-required template cannot create share links.
   - published collection template with share links cannot switch to approval-required without explicit confirmation or offline status.
   - schema changes on a published template increment `schemaVersion`.
   - approval mode/process binding changes do not increment `schemaVersion`.

3. Required-field validator tests
   - required text/textarea/date reject empty strings.
   - required phone rejects invalid number and accepts `1` plus ten digits.
   - required radio rejects null/empty.
   - required checkbox rejects empty array.
   - required signature rejects empty value.
   - optional fields may be absent.
   - dynamic-table column required is not enforced because schema has no column `required`.

4. RBAC seed verification
   - seeded permission list includes all Phase 16 approval codes.
   - ADMIN receives all approval permissions.
   - EMPLOYEE receives `approval:application:create` and `approval:application:own`.

### Manual / UI Verification

Manual UI checks are acceptable for Phase 16 if no frontend test runner is configured:

- process config page appears only with `approval:process:list`.
- process form creates single and serial flows.
- template page shows both status and purpose badges.
- share button is hidden/disabled for approval-required templates.
- department edit dialog saves and displays default approver.
- desktop and mobile fill pages both show required field errors for the same schema.

### Nyquist Sampling Strategy

- After schema/model tasks: run Prisma generate and backend build.
- After process service tasks: run process-config service tests.
- After template binding tasks: run template approval-mode tests and public share-link regression tests.
- After required-field validation tasks: run schema validation tests and one public submission API test.
- After frontend tasks: run frontend build and manually verify the navigation/template/designer/department flows if no UI tests exist.
- Final phase verification should run backend approval/template test set, backend build, frontend build, and confirm public collection routes still work for `COLLECTION_ONLY`.

## Source Items Planner Must Cover

- `CFG-01`: template business mode and approval process binding while preserving collection-only behavior.
- `CFG-02`: single-step process configuration with fixed user, role, and department manager approver sources.
- `CFG-03`: serial multi-step process configuration with node name, order, approver source, and required actions.
- `CFG-04`: department default approver persistence, API, and UI.
- `CFG-05`: approval permissions in seed data, backend guards, router metadata, navigation, and buttons.
- `DYN-01`: required-field configuration remains in designer and is enforced consistently on PC/mobile and backend submission.
- `DYN-02`: published schema edits bump version; non-schema approval binding changes do not; future applications/submissions preserve snapshots.

## Suggested Plan Decomposition

1. Prisma schema and migration for template business mode/process binding and department default approver.
2. Backend process configuration service/routes with approver validation and snapshot resolution helpers.
3. Template binding and required-field backend validation, including public collection regression protection.
4. RBAC seed/menu/router/store integration.
5. Frontend process config page, template binding controls, department approver UI, and required validation fix.

## RESEARCH COMPLETE

This research is sufficient to plan Phase 16 after the required UI design contract gate is satisfied.
