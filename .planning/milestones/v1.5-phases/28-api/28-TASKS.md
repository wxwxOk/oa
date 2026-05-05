# Phase 28: 工作记录数据模型 + 后端 API - Tasks

## Preconditions

- [ ] Read `28-CONTEXT.md`, `28-RESEARCH.md`, `28-PLAN.md`, and this task list.
- [ ] Do not modify or delete `tmp-test.txt`.
- [ ] Keep Phase 28 backend-only; do not add UI, summary, reminders, or export endpoints.

## Task Group 1: Contract Tests

- [ ] Create `backend/src/modules/role/__tests__/work-report-permissions.seed.test.ts`.
  - Assert `WORK_REPORT_PERMISSION_CODES` equals `['work-report:create', 'work-report:own', 'work-report:department', 'work-report:all', 'work-report:export']`.
  - Assert every work-report permission appears once in `PERMISSIONS` with `module: 'work-report'`.
  - Assert ADMIN receives all work-report permissions through `seedDatabase()`.
  - Assert EMPLOYEE receives only `work-report:create` and `work-report:own` from this module.

- [ ] Create `backend/src/modules/work-report/__tests__/work-report.schema.test.ts`.
  - Assert Prisma schema contains `WorkReportPeriodType`, `WorkReportStatus`, and `WorkReport`.
  - Assert fields include report number, period type/start/end, status, content fields, submitter/department snapshots, submittedAt, createdAt, updatedAt.
  - Assert indexes and `@@unique([submitterId, periodType, periodStart])` exist.

- [ ] Create `backend/src/modules/work-report/__tests__/work-report.service.test.ts`.
  - Assert daily/weekly/monthly period boundaries.
  - Assert list size caps at 100.
  - Assert own/department/all visibility behavior.
  - Assert draft mutation and submit validation rules.
  - Assert duplicate period errors are converted to clear business errors.

- [ ] Create `backend/src/modules/work-report/__tests__/work-report.route.test.ts`.
  - Assert `workReportModule.config.prefix` is `/work-reports`.
  - Assert route signatures include `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `POST /:id/submit`.
  - Assert list query exposes controlled filters.
  - Assert write body excludes trusted fields.
  - Assert source contains required guards and object authorization helpers.

## Task Group 2: Prisma and Permission Seed

- [ ] Update `backend/prisma/schema.prisma`.
  - Add `WorkReportPeriodType` enum.
  - Add `WorkReportStatus` enum.
  - Add `WorkReport` model with fixed fields and snapshots.
  - Add `User` and `Department` relations using named relation style where needed.
  - Add indexes and unique constraint.

- [ ] Generate migration under `backend/prisma/migrations/`.
  - Include enum creation.
  - Include work report table creation.
  - Include foreign keys, indexes, and unique constraint.

- [ ] Update `backend/prisma/seed.ts`.
  - Export `WORK_REPORT_PERMISSION_CODES`.
  - Add five permission definitions to `PERMISSIONS`.
  - Add only `work-report:create` and `work-report:own` to `EMPLOYEE_PERMISSION_CODES`.

## Task Group 3: Service Layer

- [ ] Create `backend/src/modules/work-report/work-report.state.ts`.
  - Define `WorkReportStatusValue`.
  - Define transition map for `DRAFT -> SUBMITTED`.
  - Export `canTransitionWorkReport()` and `assertWorkReportTransition()`.

- [ ] Create `backend/src/modules/work-report/work-report.service.ts`.
  - Define actor, write input, list filter types.
  - Normalize writable text fields and optional text fields.
  - Parse and validate `periodType` and `periodDate`.
  - Compute period start/end in one helper.
  - Build visibility where and filter where separately.
  - Implement list/detail/create/update/submit functions.
  - Serialize rows and dates to API-safe values.

## Task Group 4: Routes and Registration

- [ ] Create `backend/src/modules/work-report/work-report.route.ts`.
  - Export `workReportListQuery`.
  - Export `workReportWriteBody`.
  - Export `serializeWorkReportListResponse()`.
  - Export `workReportModule` with prefix `/work-reports`.
  - Add route guards and service object checks.

- [ ] Update `backend/src/index.ts`.
  - Import `workReportModule` from `./modules/work-report/work-report.route`.
  - Register it under `/api/v1` beside fixed business modules.

## Task Group 5: Verification

- [ ] Run `cd backend && bun run prisma:generate`.
- [ ] Run `cd backend && bun test src/modules/role/__tests__/work-report-permissions.seed.test.ts src/modules/work-report/__tests__/work-report.schema.test.ts src/modules/work-report/__tests__/work-report.service.test.ts src/modules/work-report/__tests__/work-report.route.test.ts`.
- [ ] If any test reveals a contract mismatch, update implementation without changing public API names unless the plan is explicitly revised.
- [ ] Confirm no frontend, summary, reminder, export, approval, comment, score, or AI-summary scope was added.

## Completion Checklist

- [ ] Requirements WRPT-01 to WRPT-04 covered.
- [ ] Requirements VIS-01 to VIS-04 covered.
- [ ] Requirements NFR-01 and NFR-02 covered.
- [ ] Phase 29 can rely on stable enum names, DTO shape, and `/api/v1/work-reports` route path.
