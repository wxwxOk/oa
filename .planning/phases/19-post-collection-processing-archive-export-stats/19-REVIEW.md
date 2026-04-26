---
phase: 19-post-collection-processing-archive-export-stats
reviewed: 2026-04-26T09:17:07Z
depth: standard
files_reviewed: 46
files_reviewed_list:
  - backend/package.json
  - backend/prisma/migrations/20260426090000_add_archive_operations_notifications/migration.sql
  - backend/prisma/schema.prisma
  - backend/prisma/seed.ts
  - backend/src/index.ts
  - backend/src/modules/approval/__tests__/application.service.test.ts
  - backend/src/modules/approval/__tests__/archive-export.test.ts
  - backend/src/modules/approval/__tests__/archive-stats.test.ts
  - backend/src/modules/approval/__tests__/archive.route.test.ts
  - backend/src/modules/approval/__tests__/archive.service.test.ts
  - backend/src/modules/approval/__tests__/notification.route.test.ts
  - backend/src/modules/approval/__tests__/notification.service.test.ts
  - backend/src/modules/approval/__tests__/task.service.test.ts
  - backend/src/modules/approval/application.service.ts
  - backend/src/modules/approval/archive-export.service.ts
  - backend/src/modules/approval/archive-stats.service.ts
  - backend/src/modules/approval/archive.route.ts
  - backend/src/modules/approval/archive.service.ts
  - backend/src/modules/approval/notification.route.ts
  - backend/src/modules/approval/notification.service.ts
  - backend/src/modules/approval/task.route.ts
  - backend/src/modules/approval/task.service.ts
  - backend/src/modules/role/__tests__/approval-permissions.seed.test.ts
  - backend/src/modules/template/__tests__/template.approval-mode.test.ts
  - backend/src/modules/template/template.route.ts
  - frontend/src/components/approval/ArchiveStatsPanel.vue
  - frontend/src/layouts/MainLayout.vue
  - frontend/src/layouts/__tests__/MainLayoutNotification.test.ts
  - frontend/src/pages/ApprovalArchiveDetailPage.vue
  - frontend/src/pages/ApprovalArchivePage.vue
  - frontend/src/pages/FormDesignerPage.vue
  - frontend/src/pages/__tests__/ApprovalArchiveDetailPage.test.ts
  - frontend/src/pages/__tests__/ApprovalArchivePage.test.ts
  - frontend/src/pages/__tests__/FormDesignerProcessingFields.test.ts
  - frontend/src/router/index.ts
  - frontend/src/router/routes.ts
  - frontend/src/stores/__tests__/approvalArchive.test.ts
  - frontend/src/stores/__tests__/notification.test.ts
  - frontend/src/stores/__tests__/template.test.ts
  - frontend/src/stores/approvalArchive.ts
  - frontend/src/stores/auth.ts
  - frontend/src/stores/notification.ts
  - frontend/src/stores/template.ts
  - frontend/src/types/__tests__/approvalArchive.test.ts
  - frontend/src/types/approvalArchive.ts
  - frontend/src/types/notification.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-04-26T09:17:07Z
**Depth:** standard
**Files Reviewed:** 46
**Status:** issues_found

## Summary

Reviewed the Phase 19 backend archive/export/stats/notification implementation, Prisma migration/schema, seed permissions, frontend stores/routes/pages/types, and related tests. `backend/bun.lock` was excluded as a lockfile. The most serious issues are an archive department-scope authorization bypass and deterministic seeded admin credentials. There are also backend/frontend archive contract mismatches that break note/correction/detail workflows, and export currently truncates valid result sets above 100 rows.

## Critical Issues

### CR-01: Department-Scoped Archive Filters Can Bypass Department Scope

**File:** `backend/src/modules/approval/archive.service.ts:336`; also `backend/src/modules/approval/archive-stats.service.ts:114`

**Issue:** Both archive list and stats first constrain department-scoped users to their own `applicantDepartmentId`, then overwrite that constraint when the client supplies `departmentId`. A user with only `approval:application:department` can request another department ID and view/export aggregate data outside their department.

**Fix:**
```ts
const requestedDepartmentId = normalizeNumber(filters.departmentId);

if (!hasAll) {
  const actorDepartmentId = await resolveActorDepartmentId(actor);
  if (!actorDepartmentId) return null;
  if (requestedDepartmentId && requestedDepartmentId !== actorDepartmentId) return null;
  where.applicantDepartmentId = actorDepartmentId;
} else if (requestedDepartmentId) {
  where.applicantDepartmentId = requestedDepartmentId;
}
```

Apply the same pattern in `archive.service.ts` and `archive-stats.service.ts`, then add regression tests where a department actor filters by another department and gets no rows/counts.

### CR-02: Seed Creates a Known Admin Password

**File:** `backend/prisma/seed.ts:126`

**Issue:** The seed always creates `admin` with password `admin123` and logs the credential. If this seed is ever run outside an isolated local environment, it creates a well-known privileged credential.

**Fix:**
```ts
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
if (!adminPassword) {
  throw new Error('SEED_ADMIN_PASSWORD is required for seeding admin user');
}
const hash = bcrypt.hashSync(adminPassword, 10);
```

Avoid printing the password after seeding, and document a local-only fallback only if the project explicitly wants one.

## Warnings

### WR-01: Archive Export Silently Truncates Results Above 100 Rows

**File:** `backend/src/modules/approval/archive-export.service.ts:235`

**Issue:** `exportArchiveExcel` asks `listArchiveRecords` for `size: MAX_ARCHIVE_EXPORT_ROWS + 1`, but `listArchiveRecords` caps page size at 100. For 101-2000 matching records, `result.total` is valid but `result.rows` contains only the first 100, so the exported workbook is incomplete without an error.

**Fix:**
```ts
const pageSize = 100;
const first = await listArchiveRecords(actor, { ...filters, page: 1, size: pageSize });
if (first.total > MAX_ARCHIVE_EXPORT_ROWS) throw new BizError(EXPORT_TOO_LARGE_MESSAGE, 400, 'ARCHIVE_EXPORT_TOO_LARGE');

const rows = [...first.rows];
for (let page = 2; rows.length < first.total; page += 1) {
  const next = await listArchiveRecords(actor, { ...filters, page, size: pageSize });
  rows.push(...next.rows);
}
```

Alternatively expose an internal unpaginated export query with an explicit `MAX_ARCHIVE_EXPORT_ROWS + 1` limit.

### WR-02: Archive Note and Correction Payloads Do Not Match Backend Schemas

**File:** `frontend/src/types/approvalArchive.ts:148`

**Issue:** The frontend sends notes as `{ content }`, while the backend schema requires `{ comment }`. Corrections are sent as `changes: Array<{ fieldId, value }>`, while the backend service expects `changes` to be a record keyed by field ID. Note saves fail validation, and correction saves fail field validation.

**Fix:**
```ts
export interface CreateArchiveNotePayload {
  comment: string;
}

export interface CreateArchiveCorrectionPayload {
  changes: Record<string, unknown>;
  reason: string;
}
```

Then send `store.addNote(..., { comment: content })` and build corrections with `Object.fromEntries(changedCorrectionFields.map(({ fieldId, value }) => [fieldId, value]))`.

### WR-03: Archive Detail API Shape Does Not Match the Detail Page

**File:** `frontend/src/pages/ApprovalArchiveDetailPage.vue:532`

**Issue:** The page expects `processingFields`, `timeline`, `canMark`, `canEdit`, notes with `content`, and correction entries with `changes`. The backend detail serializer returns `processingData`, `events`, notes with `comment`, and correction entries as flat `{ field, before, after }` records. This leaves processing fields empty, disables operation buttons, renders blank notes, and can crash `ApplicationTimeline` because it receives `undefined`.

**Fix:** Normalize the backend response in `useApprovalArchiveStore.fetchDetail`, or change `serializeArchiveDetail` to emit the frontend contract. At minimum, map `events` to `timeline`, `comment` to note `content`, flat correction history to `{ changes: [...] }`, and provide `processingFields` plus `canMark`/`canEdit` from server permissions or the auth store.

### WR-04: Archive Metadata Returns `tags`, but the Frontend Reads `recommendedTags`

**File:** `backend/src/modules/approval/archive.service.ts:675`

**Issue:** `listArchiveMeta` returns `{ templates, departments, tags }`, while `ArchiveFilterOptions` and `ApprovalArchivePage` read `filterOptions.recommendedTags`. Saved/custom archive tags are therefore not exposed as filter options.

**Fix:**
```ts
return {
  templates: Array.from(templates.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
  departments: Array.from(departments.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
  recommendedTags: Array.from(tags),
};
```

Update the backend route test and frontend store test to use the same field name.

## Info

### IN-01: Notification Empty-Body Schemas Are Exported but Not Wired to Routes

**File:** `backend/src/modules/approval/notification.route.ts:102`

**Issue:** `markNotificationReadBodySchema` and `markAllNotificationsReadBodySchema` are defined and tested, but the `PATCH /:id/read` and `POST /mark-all-read` routes do not attach them. The service still derives `userId` from `currentUser`, so this is not currently a leakage bug, but the route contract is weaker than the tests imply.

**Fix:** Attach the schemas to the route definitions:
```ts
{ params: paramsSchema, body: markNotificationReadBodySchema }
{ body: markAllNotificationsReadBodySchema }
```

### IN-02: Archive Frontend Tests Mock a Stale Contract

**File:** `frontend/src/stores/__tests__/approvalArchive.test.ts:42`

**Issue:** The frontend tests mock detail rows with `timeline`, `canMark`, `canEdit`, `corrections`, and note `content`, which the backend does not return. Page tests also inspect source text rather than mounting the page against realistic store data. These tests miss the current route/store contract breakage.

**Fix:** Add a test that feeds `ApprovalArchiveDetailPage` or the archive store a payload produced by `serializeArchiveDetail`, then assert that notes, corrections, timeline, processing fields, and action gates render or normalize correctly.

---

_Reviewed: 2026-04-26T09:17:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
