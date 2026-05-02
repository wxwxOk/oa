---
phase: 16-process-config-template-binding
reviewed: 2026-04-25T12:38:31Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - backend/prisma/schema.prisma
  - backend/prisma/migrations/20260425190500_add_process_config_template_binding/migration.sql
  - backend/src/modules/approval/__tests__/process-config.service.test.ts
  - backend/src/modules/template/__tests__/template.approval-mode.test.ts
  - backend/src/modules/template/__tests__/schema.validation.test.ts
  - backend/src/modules/role/__tests__/approval-permissions.seed.test.ts
  - backend/src/modules/approval/process-config.service.ts
  - backend/src/modules/approval/process.route.ts
  - backend/src/index.ts
  - backend/src/modules/department/department.route.ts
  - backend/prisma/seed.ts
  - backend/src/modules/template/schema.validation.ts
  - backend/src/modules/public/public.route.ts
  - backend/src/modules/template/template.route.ts
  - frontend/src/stores/approvalProcess.ts
  - frontend/src/pages/ApprovalProcessPage.vue
  - frontend/src/router/routes.ts
  - frontend/src/layouts/MainLayout.vue
  - frontend/src/pages/DepartmentPage.vue
  - frontend/src/components/renderer/FieldRenderer.vue
  - frontend/src/stores/template.ts
  - frontend/src/pages/TemplatePage.vue
  - frontend/src/pages/FormDesignerPage.vue
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-04-25T12:38:31Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed the Phase 16 backend schema/migration, approval process/template binding services and routes, seed data, related tests, and Vue/Pinia UI changes. The core model and most validation paths are coherent, but there are several material gaps around process deactivation, publishing unsaved template binding changes, dialog validation semantics, and one existing hardcoded admin credential in seed data.

## Critical Issues

### CR-01: Seed Creates A Superadmin With A Hardcoded Password

**File:** `backend/prisma/seed.ts:120`
**Issue:** The seed always hashes `admin123` for the built-in admin account and logs `admin / admin123` at line 138. If this seed is run outside a strictly local environment, it creates a known superadmin credential with all permissions.
**Fix:**
```ts
const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
if (!initialPassword || initialPassword.length < 12) {
  throw new Error('ADMIN_INITIAL_PASSWORD must be set to a strong initial password');
}

const hash = bcrypt.hashSync(initialPassword, 10);
// Avoid logging the password.
console.log('seed complete: admin user is available');
```

## Warnings

### WR-01: Full Process Edit Can Disable A Process Bound To Published Templates

**File:** `backend/src/modules/approval/process.route.ts:199`
**Issue:** `updateApprovalProcessConfig()` applies `isActive: false` through the full edit route without calling `assertNotBoundByPublishedApprovalTemplate()`. The status-only endpoint blocks this at lines 307-309, but the edit dialog also exposes the enabled toggle and can bypass that protection, leaving published approval-required templates bound to an inactive process.
**Fix:** Reuse the same guard inside the update transaction before writing `isActive: false`.
```ts
if (existing.isActive && input.isActive === false) {
  await assertNotBoundByPublishedApprovalTemplate(processId);
}
```

### WR-02: Publishing From The Designer Does Not Persist Current Binding Changes

**File:** `frontend/src/pages/FormDesignerPage.vue:239`
**Issue:** `handlePublish()` validates the current in-memory `businessMode`/`approvalProcessId`, but then calls only `store.changeStatus()`. If a user switches a draft from `COLLECTION_ONLY` to `APPROVAL_REQUIRED`, selects a process, and clicks `发布模板` without first clicking `保存设计`, the backend publishes the old persisted template state.
**Fix:** Persist the current designer payload before changing status, and stop publishing if that save fails.
```ts
await store.update(templateId, {
  schema: store.current.schema,
  requireIdentity: store.current.requireIdentity,
  businessMode: store.current.businessMode,
  approvalProcessId: store.current.approvalProcessId,
});
await store.changeStatus(templateId, 'publish');
```

### WR-03: Dialog Validation Checks The Persisted Process, Not The Edited Draft

**File:** `frontend/src/pages/ApprovalProcessPage.vue:711`
**Issue:** In the process edit dialog, `onDialogValidate()` calls `store.validate(form.id)`, which validates the process currently saved in the database. Unsaved node edits in the dialog are not checked, so the UI can report `流程校验通过` for a draft that would fail on save.
**Fix:** Make the validate action use the same payload path as save, either through a draft validation endpoint or by removing the server validation success claim for dirty dialog state.
```ts
const payload = buildPayload();
await store.validateDraft(payload);
```

### WR-04: Collection-Only Templates Can Retain Hidden Approval Process Bindings

**File:** `backend/src/modules/template/template.route.ts:117`
**Issue:** `updateTemplate()` sets `businessMode` and `approvalProcessId` independently. A request can switch a template to `COLLECTION_ONLY` while keeping an existing `approvalProcessId`, or attach an approval process to a collection-only template. That leaves inconsistent data that the UI mostly hides.
**Fix:** Clear or reject approval bindings whenever the target mode is collection-only.
```ts
if (targetBusinessMode === 'COLLECTION_ONLY') {
  data.businessMode = 'COLLECTION_ONLY';
  data.approvalProcess = { disconnect: true };
} else {
  await assertValidApprovalProcess(targetApprovalProcessId);
  data.businessMode = 'APPROVAL_REQUIRED';
  data.approvalProcess = { connect: { id: targetApprovalProcessId } };
}
```

## Info

### IN-01: Template Binding Permission Helper Fails Open When No User Is Supplied

**File:** `backend/src/modules/template/template.route.ts:38`
**Issue:** `hasApprovalTemplateBindPermission()` returns `true` when `currentUser` is missing. The current route passes `currentUser` from `authGuard`, but this exported update function is a service boundary and future callers can accidentally bypass the binding permission check by omitting the user.
**Fix:** Fail closed by default, and update tests/internal callers to pass an explicit admin-like user or an explicit internal bypass option.

---

_Reviewed: 2026-04-25T12:38:31Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
