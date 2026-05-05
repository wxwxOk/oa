# Phase 28: 工作记录数据模型 + 后端 API - Plan

**Status:** Ready for execution
**Requirements:** WRPT-01, WRPT-02, WRPT-03, WRPT-04, VIS-01, VIS-02, VIS-03, VIS-04, NFR-01, NFR-02

## 1. Scope

Phase 28 交付固定工作记录后端基础：`WorkReport` Prisma 模型、周期计算与唯一约束、工作记录权限种子、service 层对象级可见性、`/api/v1/work-reports` 列表/详情/草稿创建/草稿编辑/提交接口，以及 focused backend tests。

不交付：员工填报 UI、部门汇总、未提交人员、提醒、导出接口、Excel、评论、评分、审批/退回、AI 总结。

## 2. Verified Project Context

| Area | Existing definition to follow |
|------|-------------------------------|
| Prisma fixed models | `backend/prisma/schema.prisma:17` 起的 `User` 模型已有固定业务关系；`backend/prisma/schema.prisma:463` 起的 `ReimbursementApplication` 使用显式字段、快照字段、时间戳和索引；`VisitRecord` 同文件保持固定字段表模式。 |
| Permission seed | `backend/prisma/seed.ts:7` 起集中导出权限码数组；`backend/prisma/seed.ts:44` 起定义 `EMPLOYEE_PERMISSION_CODES`；`seedDatabase()` 先 upsert `PERMISSIONS`，再给 ADMIN 全量权限、EMPLOYEE 白名单权限。 |
| API registration | `backend/src/index.ts:22` 导入固定业务模块；`/api/v1` group 下通过链式 `.use(module)` 注册，`workReportModule` 应作为 `reimbursementModule` 同级模块。 |
| Auth and errors | `backend/src/middlewares/auth.ts:6` 起的 `authGuard(requiredPerm)` 派生 `currentUser.id/realName/roleCodes/permissions`；`backend/src/utils/errors.ts:2` 起定义 `BizError`、`forbidden`、`notFound`。 |
| Route pattern | `backend/src/modules/reimbursement/reimbursement.route.ts:38` 起定义 list query；`backend/src/modules/reimbursement/reimbursement.route.ts:54` 起定义 strict write body；`backend/src/modules/reimbursement/reimbursement.route.ts:184` 起导出 `new Elysia({ prefix: '/reimbursements' })`。 |
| Service pattern | `backend/src/modules/reimbursement/reimbursement.service.ts:19` 定义分页上限 100；同文件使用 actor、filter normalization、visibility where、draft mutation guard、submit transaction 和 serializer。 |
| State pattern | `backend/src/modules/reimbursement/reimbursement.state.ts:3` 起定义状态 union；同文件用 transition map 和 `assert...Transition()` 做流转校验。 |
| Test pattern | `backend/src/modules/visit/__tests__/visit.route.test.ts` 与 `backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts` 使用 `schemaPropertyNames()`、`routeSignatures()`、strict schema、guard source contract；`backend/src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` 验证权限常量、module 分组、ADMIN/EMPLOYEE 授权。 |
| Existing WorkReport | 已检索 `backend/` 下 `WorkReport|work-report|work_report`，没有既有后端模型或模块；Phase 28 需要新增。 |

## 3. Execution Order

### Step 1: Contract tests first

Create failing/locking tests before implementation so Phase 28 contracts stay stable for Phases 29-31.

Files:
- `backend/src/modules/role/__tests__/work-report-permissions.seed.test.ts`
- `backend/src/modules/work-report/__tests__/work-report.schema.test.ts`
- `backend/src/modules/work-report/__tests__/work-report.service.test.ts`
- `backend/src/modules/work-report/__tests__/work-report.route.test.ts`

Contracts:
- permission codes exactly `work-report:create`, `work-report:own`, `work-report:department`, `work-report:all`, `work-report:export`.
- EMPLOYEE contains only `work-report:create` and `work-report:own` from work-report module.
- Prisma source contains `WorkReportPeriodType`, `WorkReportStatus`, `WorkReport`, snapshot fields, indexes, and `@@unique([submitterId, periodType, periodStart])`.
- Route prefix is `/work-reports`; route signatures include `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `POST /:id/submit`.
- write schema excludes trusted fields: id, reportNo, submitter*, department*, status, periodStart, periodEnd, submittedAt, createdAt, updatedAt.

### Step 2: Prisma model, migration, and seed

Files:
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/prisma/migrations/<timestamp>_add_work_reports/migration.sql`
- `backend/src/modules/role/__tests__/work-report-permissions.seed.test.ts`

Implementation:
- Add `enum WorkReportPeriodType { DAILY WEEKLY MONTHLY }`.
- Add `enum WorkReportStatus { DRAFT SUBMITTED }`.
- Add `WorkReport` with fixed fields:
  - `id Int @id @default(autoincrement())`
  - `reportNo String @unique`
  - `periodType WorkReportPeriodType`
  - `periodStart DateTime`
  - `periodEnd DateTime`
  - `status WorkReportStatus @default(DRAFT)`
  - `completedItems String`
  - `nextPlan String`
  - `problems String?`
  - `helpNeeded String?`
  - `remark String?`
  - `submitterId Int`
  - `submitter User @relation(...)`
  - `submitterName String`
  - `submitterDepartmentId Int?`
  - `submitterDepartment Department? @relation(...)`
  - `submitterDepartmentName String?`
  - `submittedAt DateTime?`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- Add indexes for submitter, department snapshot, period type, status, period start, created/updated timestamps.
- Add unique constraint `@@unique([submitterId, periodType, periodStart])`.
- Add relations to `User` and `Department` following the named-relation style used by reimbursement.
- Add `WORK_REPORT_PERMISSION_CODES`, `PERMISSIONS` entries with `module: 'work-report'`, and EMPLOYEE baseline grants for create/own only.

Verification:
- `cd backend && bun run prisma:generate`
- `cd backend && bun test src/modules/role/__tests__/work-report-permissions.seed.test.ts src/modules/work-report/__tests__/work-report.schema.test.ts`

### Step 3: Service helpers and domain rules

Files:
- `backend/src/modules/work-report/work-report.service.ts`
- `backend/src/modules/work-report/work-report.state.ts`
- `backend/src/modules/work-report/__tests__/work-report.service.test.ts`

Implementation:
- Define `MAX_WORK_REPORT_PAGE_SIZE = 100`.
- Define `WorkReportActor` with `id`, `name`, `roleCodes`, `permissions`.
- Define `WorkReportWriteInput` and `WorkReportListFilters`.
- Add period helper that accepts `periodType` and `periodDate`, returns `periodStart`/`periodEnd`:
  - daily: anchor day.
  - weekly: ISO Monday to Sunday.
  - monthly: natural month first day to last day.
- Normalize list filters: page, size, periodType, status, dateFrom, dateTo, keyword, submitterId, departmentId.
- Build visibility scope:
  - ADMIN or `work-report:all`: all records.
  - `work-report:department`: current actor department ID equals `submitterDepartmentId`.
  - `work-report:own`: `submitterId === actor.id`.
- Keep route-level permission as coarse gate only; service functions must still assert object visibility.
- Create functions:
  - `normalizeWorkReportWriteInput(input)`
  - `normalizeWorkReportListFilters(filters)`
  - `resolveWorkReportPeriod(periodType, periodDate)`
  - `canViewWorkReport(actor, row, actorDepartmentId?)`
  - `assertCanViewWorkReport(actor, row, actorDepartmentId?)`
  - `assertCanMutateDraftWorkReport(actor, row)`
  - `listWorkReports(actor, filters)`
  - `getWorkReportDetail(actor, id)`
  - `createWorkReportDraft(actor, input)`
  - `updateWorkReportDraft(actor, id, input)`
  - `submitWorkReportDraft(actor, id)`
  - `serializeWorkReportRow(row)`
- Implement `DRAFT -> SUBMITTED` transition in `work-report.state.ts`.
- Catch Prisma duplicate unique errors where practical and convert to stable `BizError` with a clear duplicate-period message.

Verification:
- `cd backend && bun test src/modules/work-report/__tests__/work-report.service.test.ts`

### Step 4: Route module and app registration

Files:
- `backend/src/modules/work-report/work-report.route.ts`
- `backend/src/index.ts`
- `backend/src/modules/work-report/__tests__/work-report.route.test.ts`

Implementation:
- Export `workReportListQuery` with `page`, `size`, `periodType`, `status`, `dateFrom`, `dateTo`, `keyword`, `submitterId`, `departmentId`.
- Export `workReportWriteBody` with only writable fields: `periodType`, `periodDate`, `completedItems`, `nextPlan`, `problems`, `helpNeeded`, `remark`.
- Export `serializeWorkReportListResponse({ rows, total, page, size })`.
- Convert `currentUser` to `WorkReportActor` with the same `toActor()` pattern as reimbursement.
- Route layout:
  - `GET /` with `authGuard()` plus read permission assertion for own/department/all.
  - `POST /`, `PUT /:id`, `POST /:id/submit` with `authGuard('work-report:create')` and service draft/object checks.
  - `GET /:id` with `authGuard()` plus service object visibility.
- Register `workReportModule` in `backend/src/index.ts` under `/api/v1`, beside other fixed modules.

Verification:
- `cd backend && bun test src/modules/work-report/__tests__/work-report.route.test.ts`

### Step 5: Integration gate

Run focused and generation checks:

- `cd backend && bun run prisma:generate`
- `cd backend && bun test src/modules/role/__tests__/work-report-permissions.seed.test.ts src/modules/work-report/__tests__/work-report.schema.test.ts src/modules/work-report/__tests__/work-report.service.test.ts src/modules/work-report/__tests__/work-report.route.test.ts`
- If migration is generated locally, inspect the SQL for enums, table, relations, indexes, and unique constraint.

## 4. Acceptance Criteria

- `backend/prisma/schema.prisma` contains fixed `WorkReport` model and no JSONB primary business payload for work report content.
- Duplicate same submitter + period type + period start is blocked by database unique constraint.
- `backend/prisma/seed.ts` contains exact work-report permission codes; ADMIN gets all, EMPLOYEE gets create/own only.
- `/api/v1/work-reports` supports list/detail/create draft/edit draft/submit with object-level visibility checks.
- List responses are paginated and capped at 100.
- Submitted reports cannot be edited or submitted again.
- Focused backend tests and `prisma generate` pass.
