---
phase: 16-process-config-template-binding
verified: 2026-04-25T12:51:25Z
reverified: 2026-04-25T13:25:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
gaps: []
resolved_gaps:
  - truth: "Disabling or deleting a process bound by published APPROVAL_REQUIRED templates is blocked"
    resolved_by: "16-09 gap closure"
    evidence:
      - "backend/src/modules/approval/process.route.ts:199 calls assertNotBoundByPublishedApprovalTemplate before active-to-inactive full updates mutate process state."
      - "backend/src/modules/approval/__tests__/process-config.service.test.ts:405 covers full update deactivation for a published APPROVAL_REQUIRED template binding."
---

# Phase 16: process-config-template-binding Verification Report

**Phase Goal:** 管理员可无代码配置审批流程并绑定到模板，同时保留既有仅收集模板  
**Verified:** 2026-04-25T12:51:25Z  
**Re-verified:** 2026-04-25T13:25:00Z  
**Status:** passed  
**Re-verification:** Yes - 16-09 gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | 模板可选择 `COLLECTION_ONLY` 或 `APPROVAL_REQUIRED`，既有公开收集路径不回归 | VERIFIED | `TemplateBusinessMode`, `businessMode`, and `approvalProcessId` exist in Prisma schema/migration. Public routes reject non-collection templates and save `Submission.schemaVersion`; share creation blocks approval templates. |
| 2 | 模板后端绑定规则安全：需审批发布必须绑定启用有效流程，公开链接切换需确认，绑定变更需权限 | VERIFIED | `template.route.ts` calls `validateProcessDefinition` for approval publish, requires `disconnectPublicCollection` for published shared collection templates, blocks share links, and checks `approval:template:bind` on binding changes. |
| 3 | 管理员可配置单步和串行流程，节点支持固定用户、角色、提交人部门负责人 | VERIFIED | `process.route.ts` provides guarded CRUD, ordered node replacement, and structural validation. `ApprovalProcessPage.vue` exposes ordered node rows and source selectors. |
| 4 | 流程运行快照能解析每个节点到具体 `assigneeId/assigneeName` | VERIFIED | `resolveProcessSnapshot` emits concrete assignee fields for USER, ROLE, and DEPARTMENT_MANAGER; role source enforces exactly one active user; department approver walks parent departments and avoids self-approval. |
| 5 | Invalid or inactive process definitions cannot be published or used at runtime | VERIFIED | `validateProcessStructure` rejects no nodes, bad order, disabled fixed users, invalid role sources, and invalid department-manager parameters. `validateProcessDefinition` additionally rejects inactive processes. |
| 6 | Disabling or deleting a process bound by published `APPROVAL_REQUIRED` templates is blocked | VERIFIED | `PATCH /status`, `DELETE`, and full `PUT /approval/processes/:id` now call `assertNotBoundByPublishedApprovalTemplate` before disabling/deleting. `updateApprovalProcessConfig` guards active-to-inactive full updates at `process.route.ts:199`, with regression coverage at `process-config.service.test.ts:405`. |
| 7 | 部门负责人/默认审批人可在组织架构中维护，并可被流程配置引用 | VERIFIED | Schema/API expose `Department.defaultApproverId/defaultApprover`; department API validates active users and provides `/departments/approver-options`; UI displays `负责人：...` or `未设置负责人` and saves nullable approver IDs. |
| 8 | 审批相关 RBAC 权限完成种子数据、后端校验和前端菜单/按钮控制 | VERIFIED | Seed exports all Phase 16 approval codes; ADMIN receives all permissions and EMPLOYEE receives application create/own. Backend routes use `authGuard('approval:*')`; router/menu/actions use `approval:process:*` and `approval:template:bind`. |
| 9 | 模板列表和设计器支持一页内用途展示、过滤、绑定和公开入口保护 | VERIFIED | `TemplatePage.vue` has purpose filter/badges and collection-only share/submission actions; `FormDesignerPage.vue` has permission-gated purpose/process selectors, enabled-process fetch, disconnect confirmation, and schema-version notification guard. |
| 10 | 模板必填字段在 PC/Mobile 共享路径一致校验，并有后端提交兜底 | VERIFIED | `GridFormRenderer.validateFields` calls `FieldRenderer.validate`; `FieldRenderer` covers text, textarea, date, phone, radio, checkbox, and signature. Public submit calls `validateFormDataRequiredFields`. |
| 11 | 发布后 schema 变更形成新版本，业务模式/流程绑定变更不提升 schema 版本 | VERIFIED | `updateTemplate` only increments `schemaVersion` when a published template's `schema` changes. Binding-only fields are updated separately. Tests cover the version behavior. |
| 12 | Wave 0 tests, regression tests, schema validation, backend build, frontend build all support Phase 16 behavior | VERIFIED | Re-verification evidence: backend Phase 16 approval/template/RBAC tests 40 pass after 16-09, Phase 15 regression tests 16 pass, backend build passed, frontend `bun run build` passed, Prisma validate/generate passed, schema drift false. |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/prisma/schema.prisma` | Template business mode, optional process binding, department default approver | VERIFIED | Lines 52-57 and 105-132 define required enum, fields, relations, and indexes. |
| `backend/prisma/migrations/20260425190500_add_process_config_template_binding/migration.sql` | Migration for Phase 16 schema additions | VERIFIED | Migration creates `TemplateBusinessMode`, template/department columns, indexes, and FK constraints. `gsd-tools` wildcard lookup failed, but concrete file exists. |
| `backend/src/modules/approval/process-config.service.ts` | Process validation and approver snapshot resolution | VERIFIED | Exports `validateProcessStructure`, `validateProcessDefinition`, `resolveDepartmentApprover`, and `resolveProcessSnapshot`; substantive and used by routes/template guards. |
| `backend/src/modules/approval/process.route.ts` | Approval process configuration REST API | VERIFIED | CRUD/status/delete/validate routes exist and are wired; full edit disable now uses the published-template binding guard. |
| `backend/src/modules/template/template.route.ts` | Template mode, binding, publish/share safeguards | VERIFIED | Includes business mode filtering, update, publish validation, share block, and binding permission checks. |
| `backend/src/modules/public/public.route.ts` | Public collection non-regression and required validation | VERIFIED | Only serves/submits `COLLECTION_ONLY` published templates and calls required-field validator. |
| `backend/src/modules/department/department.route.ts` | Department default approver API | VERIFIED | Returns default approver data, validates active approvers, and exposes guarded approver options. |
| `backend/prisma/seed.ts` | Approval RBAC seed constants and assignments | VERIFIED_WITH_WARNING | Functional RBAC seed is present. Advisory review CR-01 flags hardcoded `admin123`; serious security debt, but not a Phase 16 functional goal blocker. |
| `frontend/src/stores/approvalProcess.ts` and `ApprovalProcessPage.vue` | Process config API client and UI | VERIFIED_WITH_WARNING | Store/page are wired; dialog validation checks saved process, not unsaved draft, per advisory WR-03. Save still validates server-side. |
| `frontend/src/stores/template.ts`, `TemplatePage.vue`, `FormDesignerPage.vue` | Template purpose, binding, filters, disconnect UI | VERIFIED_WITH_WARNING | Main binding flows exist. Advisory WR-02 notes publish does not persist unsaved binding changes before status change. |
| `frontend/src/pages/DepartmentPage.vue` | Department approver display/edit UI | VERIFIED | Uses `/departments/approver-options`, displays approver state, and saves nullable `defaultApproverId`. |
| `frontend/src/components/renderer/FieldRenderer.vue` and `GridFormRenderer.vue` | Shared frontend required validation | VERIFIED | Imperative validation covers required field types through the shared renderer path. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `backend/src/index.ts` | `approvalProcessModule` | authenticated `/api/v1` registration | VERIFIED | `index.ts` imports and uses `approvalProcessModule`. |
| `process.route.ts` create/update | `process-config.service.ts` | transactional `validateProcessStructure` before commit | VERIFIED | Create/update call `validateProcessStructure` inside the transaction. |
| `template.route.ts` publish/update | `process-config.service.ts` | `validateProcessDefinition` for approval-required templates | VERIFIED | `assertValidApprovalProcess` calls `validateProcessDefinition`. |
| `public.route.ts` submit | `schema.validation.ts` | backend required-field enforcement | VERIFIED | `validateFormDataRequiredFields(link.template.schema, body.data ?? {})` runs before `Submission` creation. |
| `FormDesignerPage.vue` | `approvalProcess` store | enabled process selector | VERIFIED | Imports `useApprovalProcessStore` and fetches `isActive: true` process options when permitted. |
| `TemplatePage.vue` actions | `Template.businessMode` | share/submission gating | VERIFIED | Share/submission buttons are collection-only or disabled with the required tooltip. |
| `DepartmentPage.vue` | `/departments/approver-options` | active default approver selector | VERIFIED | Loads guarded approver options and maps labels as `{realName}（{username}）`. |
| `GridFormRenderer.validateFields` | `FieldRenderer.validate` | imperative required validation | VERIFIED | Field refs are traversed and each renderer's `validate` is invoked. |
| `approvalProcess full edit` | published-template binding guard | `isActive: false` protection | VERIFIED | Full edit route calls `assertNotBoundByPublishedApprovalTemplate` before active-to-inactive updates and has regression coverage. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `TemplatePage.vue` | `store.rows[].businessMode` | `template.ts fetchList` -> `GET /templates` -> Prisma `formTemplate.findMany(include: templateInclude)` | Yes | FLOWING |
| `FormDesignerPage.vue` | `approvalProcessOptions` | `approvalProcessStore.fetchList({ isActive: true })` -> `GET /approval/processes` | Yes | FLOWING |
| `DepartmentPage.vue` | `defaultApprover/defaultApproverId` | `/departments/tree` and `/departments/approver-options` | Yes | FLOWING |
| `FieldRenderer.vue` validation state | `modelValue[field.id]` | `GridFormRenderer` model values and field refs | Yes | FLOWING |
| `process.route.ts` bound-process disable guard | `input.isActive` from full edit payload | `ApprovalProcessPage.buildPayload()` -> `store.update()` -> `PUT /approval/processes/:id` | Guarded before mutation | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Prisma schema and client validity | `prisma validate`, `prisma generate` | Orchestrator reported passed | PASS |
| Phase 16 backend process/template/RBAC behavior | Targeted Bun tests for approval/template/RBAC | Orchestrator reported 39 pass total | PASS |
| Phase 15 regression after Phase 16 migration | Phase 15 state/application tests after `prisma migrate deploy` | Orchestrator reported 16 pass | PASS |
| Backend build | `backend` build | Orchestrator reported passed | PASS |
| Frontend build | `cd frontend && bun run build` | Orchestrator reported passed | PASS |
| Schema drift | `gsd-tools verify schema-drift 16` | Orchestrator reported `drift_detected: false` | PASS |
| Full edit cannot disable a bound published process | `bun test src/modules/approval/__tests__/process-config.service.test.ts` | Regression test added in 16-09 and passed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| CFG-01 | 16-01, 16-02, 16-05, 16-07 | 管理员可将表单模板设置为 `COLLECTION_ONLY` 或 `APPROVAL_REQUIRED`，保留既有公开收集行为 | SATISFIED | Prisma mode, backend guards, public route non-regression, and UI purpose controls exist. |
| CFG-02 | 16-01, 16-03, 16-06 | 管理员可配置单步审批流程，审批人来源支持固定用户、角色和提交人部门负责人 | SATISFIED | Service/routes/UI cover single-node process creation and all source types. |
| CFG-03 | 16-01, 16-03, 16-06 | 管理员可配置串行多步审批流程，每个节点有名称、顺序、审批人来源和必需动作 | SATISFIED | Ordered node model, route payloads, fixed APPROVE/REJECT actions, and UI node editor are present. |
| CFG-04 | 16-01, 16-02, 16-03, 16-04, 16-08 | 管理员可为部门配置负责人/默认审批人，用于部门负责人审批规则 | SATISFIED | Department schema/API/UI and process snapshot resolver are wired. |
| CFG-05 | 16-01, 16-04, 16-05, 16-06, 16-07 | 系统提供审批相关 RBAC 权限 | SATISFIED_WITH_WARNING | Functional permission seed, route guards, route metadata, menu/button controls exist. Seed hardcoded admin password is security debt from review CR-01. |
| DYN-01 | 16-01, 16-05, 16-08 | 必填字段 PC/Mobile 一致校验 | SATISFIED | Existing designer required toggle remains; shared renderer and backend validator cover required field types. |
| DYN-02 | 16-01, 16-02, 16-03, 16-05, 16-07 | 发布后字段变更形成 schema 版本，已有申请使用提交时快照 | SATISFIED | Template updates bump only on schema changes; public submissions save schemaVersion; Phase 15 verified ApprovalApplication schema/process snapshots. |

No orphaned Phase 16 requirement IDs found. `CFG-01`, `CFG-02`, `CFG-03`, `CFG-04`, `CFG-05`, `DYN-01`, and `DYN-02` are all claimed by plan frontmatter and accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `backend/src/modules/approval/process.route.ts` | 199 | Full update deactivation path now calls the published-template binding guard | Resolved | Closed by Plan 16-09; regression test covers the previous bypass. |
| `backend/prisma/seed.ts` | 120 | Hardcoded `admin123` superadmin seed password | Warning | Advisory review CR-01; serious security debt, but not a direct Phase 16 goal-achievement blocker. |
| `backend/src/modules/template/template.route.ts` | 37 | Binding permission helper returns true when no user is supplied | Info | Current route passes `currentUser`; future internal callers could bypass permission accidentally. |
| `frontend/src/pages/FormDesignerPage.vue` | 239 | Publish does not save unsaved binding changes first | Warning | User can still bind by saving first, but publish-from-unsaved-designer state is misleading. |
| `frontend/src/pages/ApprovalProcessPage.vue` | 711 | Dialog validate checks persisted process, not unsaved draft | Warning | Save path still validates, but the success message can be stale for dirty edits. |
| `backend/src/modules/template/template.route.ts` | 117 | Collection-only templates can retain hidden approval process bindings via API | Warning | Does not break public collection mode, but leaves inconsistent data unless clients send `approvalProcessId: null`. |

Stub scan notes: matches for `placeholder` are schema placeholder fields or UI input placeholders, and empty arrays/null values are local initial state or validation checks. No placeholder implementation stubs were found.

### Human Verification Required

These are still useful after the blocker is fixed because no frontend browser test runner is configured:

1. **Process configuration UI**
   - Test: Log in as an admin, open `流程配置`, create a single-node process and a serial process, then bind one to a template.
   - Expected: Form controls, permission-gated buttons, validation errors, and node ordering behave correctly on desktop and mobile.
   - Why human: Visual interaction and responsive behavior are not covered by automated tests.

2. **Template binding and public collection non-regression**
   - Test: Save an `APPROVAL_REQUIRED` binding, publish it, verify no public share action is available; then open an existing `COLLECTION_ONLY` share link and submit.
   - Expected: Approval template does not create public links; collection-only share link still creates `Submission`.
   - Why human: Requires running app/browser flow and validating UI state plus public route behavior together.

3. **Department default approver UI**
   - Test: Edit a department, select and clear `负责人/默认审批人`, reload the tree.
   - Expected: Saved approver shows as `负责人：{realName}`; cleared state shows `未设置负责人`.
   - Why human: UI persistence and tree rendering need browser confirmation.

### Gaps Summary

Phase 16 now achieves the goal: admins can configure approval processes, bind templates, keep collection-only templates, maintain department approvers, and rely on RBAC plus required-field/schema-version safeguards.

The previous blocking gap is resolved by Plan 16-09. A published approval-required template can no longer be left bound to an inactive process through the full process edit route because `updateApprovalProcessConfig` checks the same published-template binding guard before active-to-inactive updates.

The advisory code review still found security and UX/data-integrity warnings. They should be tracked separately, but none block Phase 16 goal achievement after the 16-09 gap closure.

---

_Verified: 2026-04-25T12:51:25Z; re-verified: 2026-04-25T13:25:00Z_  
_Verifier: Claude (initial gsd-verifier), Codex (16-09 gap re-verification)_
