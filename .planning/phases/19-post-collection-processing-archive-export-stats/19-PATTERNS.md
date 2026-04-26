# Phase 19: 收集后处理、归档导出统计 - Pattern Map

**Mapped:** 2026-04-26  
**Files analyzed:** 40  
**Analogs found:** 39 / 40

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/package.json` | config | batch | `backend/package.json` | exact |
| `backend/bun.lock` | config | batch | `backend/bun.lock` | exact/generated |
| `backend/prisma/schema.prisma` | model | CRUD + event-driven | `backend/prisma/schema.prisma` | exact |
| `backend/prisma/migrations/<timestamp>_add_archive_operations_notifications/migration.sql` | migration | batch | `backend/prisma/migrations/20260425090000_add_approval_models/migration.sql` | role-match |
| `backend/prisma/seed.ts` | config | batch | `backend/prisma/seed.ts` | exact |
| `backend/src/index.ts` | config | request-response | `backend/src/index.ts` | exact |
| `backend/src/modules/approval/archive.service.ts` | service | CRUD + transform | `backend/src/modules/approval/task.service.ts` | role-match |
| `backend/src/modules/approval/archive.route.ts` | route | request-response | `backend/src/modules/approval/task.route.ts` | exact |
| `backend/src/modules/approval/archive-export.service.ts` | service | file-I/O + transform | `frontend/src/composables/usePdfExport.ts` | partial |
| `backend/src/modules/approval/archive-stats.service.ts` | service | batch + transform | `backend/src/modules/form-stats/form-stats.route.ts` | role-match |
| `backend/src/modules/approval/notification.service.ts` | service | event-driven + CRUD | `backend/src/modules/approval/application.service.ts` | role-match |
| `backend/src/modules/approval/notification.route.ts` | route | request-response | `backend/src/modules/approval/task.route.ts` | exact |
| `backend/src/modules/approval/application.service.ts` | service | event-driven | self | exact |
| `backend/src/modules/approval/task.service.ts` | service | request-response | self | exact |
| `backend/src/modules/template/template.route.ts` | route | request-response | self | exact |
| `backend/src/modules/approval/__tests__/archive.service.test.ts` | test | CRUD + request-response | `backend/src/modules/approval/__tests__/task.service.test.ts` | exact |
| `backend/src/modules/approval/__tests__/archive.route.test.ts` | test | request-response | `backend/src/modules/approval/__tests__/task.route.test.ts` | exact |
| `backend/src/modules/approval/__tests__/archive-export.test.ts` | test | file-I/O + transform | `frontend/src/composables/__tests__/usePdfExport.test.ts` | partial |
| `backend/src/modules/approval/__tests__/archive-stats.test.ts` | test | batch + transform | `backend/src/modules/approval/__tests__/task.service.test.ts` | role-match |
| `backend/src/modules/approval/__tests__/notification.service.test.ts` | test | event-driven + CRUD | `backend/src/modules/approval/__tests__/task.service.test.ts` | role-match |
| `backend/src/modules/approval/__tests__/notification.route.test.ts` | test | request-response | `backend/src/modules/approval/__tests__/task.route.test.ts` | exact |
| `backend/src/modules/role/__tests__/approval-permissions.seed.test.ts` | test | batch | self | exact |
| `frontend/src/types/approvalArchive.ts` | utility | transform | `frontend/src/types/approvalTask.ts` | exact |
| `frontend/src/types/__tests__/approvalArchive.test.ts` | test | transform | `frontend/src/types/__tests__/approvalTask.test.ts` | exact |
| `frontend/src/stores/approvalArchive.ts` | store | request-response + file-I/O | `frontend/src/stores/approvalTask.ts` | exact |
| `frontend/src/stores/__tests__/approvalArchive.test.ts` | test | request-response | `frontend/src/stores/__tests__/approvalTask.test.ts` | exact |
| `frontend/src/pages/ApprovalArchivePage.vue` | component | request-response | `frontend/src/pages/ApprovalTaskPage.vue` | exact |
| `frontend/src/pages/ApprovalArchiveDetailPage.vue` | component | request-response + file-I/O | `frontend/src/pages/ApprovalTaskDetailPage.vue` | exact |
| `frontend/src/pages/__tests__/ApprovalArchiveDetailPage.test.ts` | test | request-response | `frontend/src/pages/__tests__/ApprovalTaskDetailPage.test.ts` | exact |
| `frontend/src/components/approval/ArchiveStatsPanel.vue` | component | transform | `frontend/src/components/submission/FormStatsPanel.vue` | exact |
| `frontend/src/types/notification.ts` | utility | transform | `frontend/src/types/approvalTask.ts` | role-match |
| `frontend/src/stores/notification.ts` | store | request-response | `frontend/src/stores/approvalTask.ts` | exact |
| `frontend/src/stores/__tests__/notification.test.ts` | test | request-response | `frontend/src/stores/__tests__/approvalTask.test.ts` | exact |
| `frontend/src/layouts/MainLayout.vue` | component | request-response | self + `frontend/src/pages/TemplatePage.vue` | role-match |
| `frontend/src/layouts/__tests__/MainLayoutNotification.test.ts` | test | request-response | `frontend/src/pages/__tests__/ApprovalTaskDetailPage.test.ts` | role-match |
| `frontend/src/router/routes.ts` | route | request-response | self | exact |
| `frontend/src/components/approval/ApplicationTimeline.vue` | component | transform | self | exact |
| `frontend/src/stores/template.ts` | store | request-response | self | exact |
| `frontend/src/pages/FormDesignerPage.vue` | component | request-response | self | exact |
| `frontend/src/types/schema.ts` | utility | transform | self | exact |

## Pattern Assignments

### `backend/prisma/schema.prisma` (model, CRUD + event-driven)

**Analog:** `backend/prisma/schema.prisma`

**Permission + template extension pattern** (lines 71-79, 110-132):
```prisma
model Permission {
  id     Int              @id @default(autoincrement())
  code   String           @unique
  name   String
  module String
  roles  RolePermission[]

  @@index([module])
}

model FormTemplate {
  id                   Int                   @id @default(autoincrement())
  schema               Json                  @default("[]")
  schemaVersion        Int                   @default(1)
  businessMode         TemplateBusinessMode  @default(COLLECTION_ONLY)
  approvalProcessId    Int?
  submissions          Submission[]
  approvalApplications ApprovalApplication[]

  @@index([businessMode])
  @@index([approvalProcessId])
}
```

**Approval event enum and source models** (lines 152-161, 205-242, 328-342):
```prisma
enum ApprovalActionType {
  SUBMIT
  ASSIGN
  APPROVE
  REJECT
  CANCEL
  EDIT
  MARK
  COMMENT
}

model ApprovalApplication {
  id             Int                       @id @default(autoincrement())
  applicationNo  String                    @unique
  status         ApprovalApplicationStatus @default(DRAFT)
  formData       Json                      @default("{}")
  schemaSnapshot Json
  templateId     Int
  applicantId    Int
  actions        ApprovalAction[]
  timelineEvents ApprovalTimelineEvent[]

  @@index([templateId])
  @@index([applicantId])
  @@index([status])
  @@index([createdAt])
}

model Submission {
  id             Int          @id @default(autoincrement())
  data           Json
  schemaVersion  Int
  submitterName  String?
  submitterPhone String?
  templateId     Int
  shareLinkId    Int
  createdAt      DateTime     @default(now())

  @@index([templateId])
  @@index([shareLinkId])
  @@index([createdAt])
}
```

**Append-only approval audit shape** (lines 269-312):
```prisma
model ApprovalAction {
  id            Int                 @id @default(autoincrement())
  applicationId Int
  taskId        Int?
  actorId       Int?
  actorName     String
  type          ApprovalActionType
  comment       String?
  payload       Json?
  createdAt     DateTime            @default(now())

  @@index([applicationId, createdAt])
  @@index([taskId])
  @@index([actorId])
  @@index([type])
}

model ApprovalTimelineEvent {
  id            Int                 @id @default(autoincrement())
  applicationId Int
  taskId        Int?
  actorId       Int?
  actorName     String
  type          ApprovalActionType
  title         String
  comment       String?
  payload       Json?
  createdAt     DateTime            @default(now())

  @@index([applicationId, createdAt])
  @@index([taskId])
  @@index([actorId])
  @@index([type])
}
```

**Apply to Phase 19:**
- Add operational metadata/current state outside `ApprovalApplication.formData` and `Submission.data`.
- Add append-only collection archive event model equivalent to `ApprovalAction`/`ApprovalTimelineEvent`.
- Add notification model with `userId`, type/title/summary/source/target route/read state/createdAt.
- Add indexes for source lookup, tag filtering, unread count, and date/status stats.

---

### `backend/prisma/migrations/<timestamp>_add_archive_operations_notifications/migration.sql` (migration, batch)

**Analog:** `backend/prisma/migrations/20260425090000_add_approval_models/migration.sql`

**Create table pattern** (lines 88-119):
```sql
CREATE TABLE "ApprovalAction" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "type" "ApprovalActionType" NOT NULL,
    "comment" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY ("id")
);
```

**Index pattern** (lines 174-195):
```sql
CREATE INDEX "ApprovalAction_applicationId_createdAt_idx" ON "ApprovalAction"("applicationId", "createdAt");
CREATE INDEX "ApprovalAction_taskId_idx" ON "ApprovalAction"("taskId");
CREATE INDEX "ApprovalAction_actorId_idx" ON "ApprovalAction"("actorId");
CREATE INDEX "ApprovalAction_type_idx" ON "ApprovalAction"("type");
CREATE INDEX "ApprovalTimelineEvent_applicationId_createdAt_idx" ON "ApprovalTimelineEvent"("applicationId", "createdAt");
```

**Foreign key pattern** (lines 228-243):
```sql
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "ApprovalApplication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

**Apply to Phase 19:** Use Prisma-generated migration style. If exact-one-of `approvalApplicationId` / `submissionId` cannot be represented in Prisma schema, enforce in service tests and optionally add a SQL `CHECK` in the migration.

---

### `backend/prisma/seed.ts` and `backend/src/modules/role/__tests__/approval-permissions.seed.test.ts` (config/test, batch)

**Analog:** `backend/prisma/seed.ts`; `backend/src/modules/role/__tests__/approval-permissions.seed.test.ts`

**Permission code list pattern** (lines 7-20, 62-73):
```ts
export const APPROVAL_PERMISSION_CODES = [
  'approval:process:list',
  'approval:process:create',
  'approval:process:update',
  'approval:process:delete',
  'approval:template:bind',
  'approval:application:create',
  'approval:application:own',
  'approval:application:department',
  'approval:application:all',
  'approval:task:list',
  'approval:task:handle',
  'approval:export',
];

{ code: 'approval:application:department', name: '查看部门申请', module: 'approval' },
{ code: 'approval:application:all', name: '查看全部申请', module: 'approval' },
{ code: 'approval:task:list', name: '审批任务列表', module: 'approval' },
{ code: 'approval:task:handle', name: '处理审批任务', module: 'approval' },
{ code: 'approval:export', name: '导出审批数据', module: 'approval' },
```

**Admin grant pattern** (lines 80-105):
```ts
for (const p of PERMISSIONS) {
  await prisma.permission.upsert({
    where: { code: p.code },
    update: p,
    create: p,
  });
}
const allPerms = await prisma.permission.findMany();

await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
await prisma.rolePermission.createMany({
  data: allPerms.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
});
```

**Seed test pattern** (`approval-permissions.seed.test.ts` lines 63-82):
```ts
it('seeded permission list includes all Phase 16 approval codes', async () => {
  expect(APPROVAL_PERMISSION_CODES).toEqual(phase16ApprovalCodes);
  await seedDatabase();
  const permissions = await prisma.permission.findMany({
    where: { code: { in: phase16ApprovalCodes } },
    orderBy: { code: 'asc' },
  });
  expect(permissions.map((permission) => permission.code).sort()).toEqual([...phase16ApprovalCodes].sort());
});

it('ADMIN receives all approval permissions', async () => {
  await seedDatabase();
  const adminCodes = await rolePermissionCodes('ADMIN');
  expect(adminCodes).toEqual(expect.arrayContaining(APPROVAL_PERMISSION_CODES));
});
```

**Apply to Phase 19:** Add `approval:archive:edit`, `approval:archive:mark`, `approval:archive:stats` to approval permissions. Keep `approval:export`. Do not add new archive operation permissions to `EMPLOYEE_PERMISSION_CODES` by default.

---

### `backend/src/index.ts` and `backend/package.json` (config, request-response/batch)

**Analog:** self

**Module registration pattern** (`backend/src/index.ts` lines 6-18, 63-79):
```ts
import { approvalProcessModule } from './modules/approval/process.route';
import { approvalApplicationModule } from './modules/approval/application.route';
import { approvalTaskModule } from './modules/approval/task.route';

.group('/api', (app) =>
  app
    .group('/v1', (app) =>
      app
        .use(approvalProcessModule)
        .use(approvalApplicationModule)
        .use(approvalTaskModule)
        .use(formTemplateModule)
        .use(submissionModule)
        .use(formStatsModule)
        .use(shareLinkStatsModule),
    )
)
```

**Dependency pattern** (`backend/package.json` lines 14-22):
```json
"dependencies": {
  "@elysiajs/cors": "^1.1.1",
  "@elysiajs/jwt": "^1.1.1",
  "@elysiajs/swagger": "^1.1.5",
  "@prisma/client": "^5.22.0",
  "bcryptjs": "^2.4.3",
  "elysia": "^1.1.24",
  "nanoid": "5"
}
```

**Apply to Phase 19:** Register `approvalArchiveModule` and `notificationModule` under `/api/v1`. Add only `exceljs` for backend Excel export; let `bun.lock` be generated by the package manager.

---

### `backend/src/modules/approval/archive.route.ts` (route, request-response)

**Analog:** `backend/src/modules/approval/task.route.ts`

**Imports and route DTO serialization pattern** (lines 1-15, 17-48):
```ts
import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import type { ApprovalActor } from './application.service';
import {
  approveApprovalTask,
  commentApprovalTask,
  getApprovalTaskDetail,
  listApprovalTaskMeta,
  listApprovalTasks,
  rejectApprovalTask,
  type ApprovalTaskDetail,
  type ApprovalTaskListFilters,
  type ApprovalTaskListItem,
} from './task.service';

type RouteDate = Date | string | null;
```

**TypeBox schema pattern** (lines 61-77):
```ts
const listQuerySchema = t.Object({
  view: t.Optional(t.Union([t.Literal('pending'), t.Literal('handled')])),
  page: t.Optional(t.String()),
  size: t.Optional(t.String()),
  templateId: t.Optional(t.String()),
  applicantName: t.Optional(t.String()),
  departmentId: t.Optional(t.String()),
  status: t.Optional(taskStatusSchema),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
});

export const approveBodySchema = t.Object(
  { comment: t.Optional(t.String({ maxLength: 200 })) },
  { additionalProperties: false },
);
```

**Guarded route grouping pattern** (lines 189-240):
```ts
export const approvalTaskModule = new Elysia({ prefix: '/approval/tasks' })
  .guard({}, (app) =>
    app
      .use(authGuard('approval:task:list'))
      .get('/', async ({ query, currentUser }: any) =>
        serializeApprovalTaskListResponse(
          await listApprovalTasks(toActor(currentUser), query as ApprovalTaskListFilters),
        ),
        { query: listQuerySchema },
      )
      .get('/meta', async ({ currentUser }: any) => listApprovalTaskMeta(toActor(currentUser)))
      .get('/:id', async ({ params, currentUser }: any) =>
        serializeApprovalTaskDetail(
          await getApprovalTaskDetail(toActor(currentUser), Number(params.id)),
        ),
        { params: paramsSchema },
      ),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('approval:task:handle'))
      .post('/:id/comment', async ({ params, body, currentUser }: any) =>
        serializeApprovalTaskDetail(
          await commentApprovalTask(toActor(currentUser), Number(params.id), body.comment),
        ),
        { params: paramsSchema, body: commentBodySchema },
      ),
  );
```

**Apply to Phase 19:**
- Prefix should be `/approval/archive`.
- Use separate guards: view routes need source-specific service checks, mark routes use `approval:archive:mark`, edit routes use `approval:archive:edit`, stats routes use `approval:archive:stats`, export route uses `approval:export`.
- Body schemas must use `{ additionalProperties: false }` for tag/note/edit/processing payloads.
- Keep actor/source IDs server-derived; reject trusted fields in route contract tests.

---

### `backend/src/modules/approval/archive.service.ts` (service, CRUD + transform)

**Primary analog:** `backend/src/modules/approval/task.service.ts`  
**Secondary analogs:** `backend/src/modules/approval/application.service.ts`, `backend/src/modules/submission/submission.route.ts`

**Normalization helpers and validation pattern** (`task.service.ts` lines 123-164):
```ts
function normalizePage(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function normalizeSize(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE);
}

function parseDateBoundary(value: string | undefined, boundary: 'start' | 'end'): Date | undefined {
  if (!value?.trim()) return undefined;
  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new BizError('日期格式无效', 400, 'INVALID_DATE_RANGE');
  }
  if (boundary === 'end' && !value.includes('T')) parsed.setHours(23, 59, 59, 999);
  return parsed;
}
```

**Scoped list + pagination pattern** (`task.service.ts` lines 248-322):
```ts
const where: Prisma.ApprovalTaskWhereInput = {
  assigneeId: actor.id,
};

const applicationWhere: Prisma.ApprovalApplicationWhereInput = {};
if (templateId) applicationWhere.templateId = templateId;
if (departmentId) applicationWhere.applicantDepartmentId = departmentId;
if (filters.applicantName?.trim()) {
  applicationWhere.applicantName = {
    contains: filters.applicantName.trim(),
    mode: 'insensitive',
  };
}
if (Object.keys(applicationWhere).length > 0) {
  where.application = applicationWhere;
}

const [rows, total] = await Promise.all([
  prisma.approvalTask.findMany({
    where,
    include: { application: true },
    orderBy,
    skip: (page - 1) * size,
    take: size,
  }),
  prisma.approvalTask.count({ where }),
]);
```

**Collection source list/detail pattern** (`submission.route.ts` lines 6-47, 59-77):
```ts
export const submissionModule = new Elysia({ prefix: '/templates/:id/submissions' })
  .use(authGuard('form:submission:list'))
  .get('/', async ({ params, query }: any) => {
    const templateId = Number(params.id);
    const page = Number(query.page) || 1;
    const size = Number(query.size) || 20;
    const where: any = { templateId };

    if (query.submitterName) where.submitterName = { contains: query.submitterName };
    if (query.submitterPhone) where.submitterPhone = { contains: query.submitterPhone };

    const [rows, total] = await Promise.all([
      prisma.submission.findMany({ where, include: { shareLink: { include: { creator: true } } } }),
      prisma.submission.count({ where }),
    ]);

    return { rows, total, page, size };
  })
  .get('/:subId', async ({ params }: any) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(params.subId) },
      include: { shareLink: { include: { creator: true } }, template: true },
    });
    if (!submission) throw notFound('提交记录不存在');
    if (submission.templateId !== Number(params.id)) throw notFound('提交记录不存在');
    return submission;
  });
```

**Append event pattern for approval records** (`application.service.ts` lines 440-455):
```ts
export async function appendApplicationEvent(input: AppendApplicationEventInput): Promise<void> {
  if (!['COMMENT', 'MARK', 'EDIT'].includes(input.type)) {
    throw new BizError('仅允许追加备注、标记或编辑事件', 400, 'INVALID_APPROVAL_EVENT_TYPE');
  }

  await prisma.$transaction(async (tx) => {
    const application = await tx.approvalApplication.findUnique({
      where: { id: input.applicationId },
    });
    if (!application) throw notFound('审批申请不存在');

    await createActionAndTimeline(tx, input);
  });
}
```

**Apply to Phase 19:**
- Archive rows must normalize approval and collection into `{ sourceType, sourceId }`.
- Do not mutate source form JSON for tags, notes, processing fields, or corrections.
- Reject missing reason, no-op edit, invalid source type, and unauthorized source access with `BizError`.
- Approval source events should reuse `appendApplicationEvent`; collection source needs an equivalent append-only event helper.

---

### `backend/src/modules/approval/archive-export.service.ts` (service, file-I/O + transform)

**Analogs:** `backend/src/modules/approval/archive.service.ts` for scoped query; `frontend/src/composables/usePdfExport.ts` for file generation discipline.

**Existing PDF file generation discipline** (`usePdfExport.ts` lines 296-335):
```ts
const elementHeight = element.scrollHeight || element.offsetHeight;
const scale = 2;
if (elementHeight * scale > 16000) {
  console.warn('[PDF] Canvas height exceeds safe threshold:', elementHeight * scale);
}

const canvas = await html2canvas(element, {
  scale,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
});

const pdf = new jsPDF('p', 'mm', 'a4');
const pageWidth = pdf.internal.pageSize.getWidth();
const contentWidth = pageWidth - MARGIN * 2;
const imgHeight = (canvas.height * contentWidth) / canvas.width;

injectHeaderFooter(pdf, formTitle, submitTime);
pdf.save(filename);
```

**Trigger and error feedback pattern** (`SubmissionPage.vue` lines 260-270):
```ts
async function handleExportPdf() {
  const el = document.getElementById('print-area');
  if (!el || !currentDetail.value) return;
  const filename = `${templateName.value}_${formatDate(currentDetail.value.createdAt)}.pdf`;
  try {
    await exportToPdf(el, filename);
  } catch {
    Notify.create({ type: 'negative', message: 'PDF 导出失败，请重试' });
  }
}
```

**Apply to Phase 19:**
- Backend Excel export has no exact existing analog. Use the archive service's permission-filtered query; add ExcelJS workbook generation in a dedicated helper.
- Sanitize formula-like text before writing cells.
- Enforce the Phase 19 row cap from research/validation, currently 2,000 rows unless planning changes it.
- Return XLSX bytes with route-set download headers; the frontend only triggers/downloads.

---

### `backend/src/modules/approval/archive-stats.service.ts` (service, batch + transform)

**Analog:** `backend/src/modules/form-stats/form-stats.route.ts`

**GroupBy and merge pattern** (lines 5-28, 40-78):
```ts
export const formStatsModule = new Elysia({ prefix: '/form-stats' })
  .use(authGuard('form:stats:view'))
  .get('/', async ({ query }: any) => {
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo + 'T23:59:59.999Z') : undefined;
    const dateFilter = dateFrom || dateTo
      ? { createdAt: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
      : {};

    const shareGroups = await prisma.shareLink.groupBy({
      by: ['creatorId'],
      _count: { id: true },
      where: dateFilter,
    });
    const submissionGroups = await prisma.submission.groupBy({
      by: ['shareLinkId'],
      _count: { id: true },
      where: dateFilter,
    });

    const statsMap = new Map<number, { shareCount: number; submissionCount: number }>();
    for (const sg of shareGroups) statsMap.set(sg.creatorId, { shareCount: sg._count.id, submissionCount: 0 });
    for (const sub of submissionGroups) {
      const creatorId = linkCreatorMap.get(sub.shareLinkId);
      if (creatorId === undefined) continue;
      const existing = statsMap.get(creatorId);
      if (existing) existing.submissionCount += sub._count.id;
      else statsMap.set(creatorId, { shareCount: 0, submissionCount: sub._count.id });
    }

    return Array.from(statsMap.entries())
      .map(([userId, stats]) => ({ userId, realName: userMap.get(userId) ?? '', ...stats }))
      .sort((a, b) => b.submissionCount - a.submissionCount)
      .slice(0, limit);
  });
```

**Apply to Phase 19:** Aggregate by template/status/department/month/source type. Exclude drafts. For collection records, emit status `COLLECTED` / label `已收集`. Keep source-specific permission filtering before counting.

---

### `backend/src/modules/approval/notification.service.ts` and `application.service.ts` hooks (service, event-driven + CRUD)

**Primary analog:** `backend/src/modules/approval/application.service.ts`

**Transaction and timeline write pattern** (lines 92-115):
```ts
async function createActionAndTimeline(
  tx: ApprovalEventClient,
  input: AppendApplicationEventInput,
): Promise<void> {
  const base = {
    applicationId: input.applicationId,
    taskId: input.taskId ?? null,
    actorId: input.actor.id,
    actorName: input.actor.name,
    nodeOrder: input.nodeOrder ?? null,
    nodeName: input.nodeName ?? null,
    type: input.type,
    comment: input.comment ?? null,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
  };

  await tx.approvalAction.create({ data: base });
  await tx.approvalTimelineEvent.create({ data: { ...base, title: input.title } });
}
```

**New task creation transaction point** (lines 175-203):
```ts
await createActionAndTimeline(tx, {
  applicationId: application.id,
  actor,
  type: 'SUBMIT',
  title: '提交申请',
});

const firstTask = await tx.approvalTask.create({
  data: {
    applicationId: application.id,
    nodeOrder: firstNode.order,
    nodeName: firstNode.name,
    status: 'PENDING',
    assigneeId: firstNode.assigneeId,
    assigneeName: firstNode.assigneeName,
    approverSourceSnapshot: getApproverSourceSnapshot(firstNode),
  },
});

await createActionAndTimeline(tx, {
  applicationId: application.id,
  taskId: firstTask.id,
  actor,
  nodeOrder: firstNode.order,
  nodeName: firstNode.name,
  type: 'ASSIGN',
  title: '分配审批任务',
});
```

**Terminal approval/rejection transaction points** (lines 254-313, 361-380):
```ts
await createActionAndTimeline(tx, {
  applicationId: task.applicationId,
  taskId: task.id,
  actor,
  nodeOrder: task.nodeOrder,
  nodeName: task.nodeName,
  type: 'APPROVE',
  title: '审批通过',
  comment,
});

return tx.approvalApplication.update({
  where: { id: task.applicationId },
  data: {
    status: 'APPROVED',
    completedAt: new Date(),
    currentNodeOrder: null,
    currentNodeName: null,
  },
  include: { tasks: true },
});

await createActionAndTimeline(tx, {
  applicationId: task.applicationId,
  taskId: task.id,
  actor,
  nodeOrder: task.nodeOrder,
  nodeName: task.nodeName,
  type: 'REJECT',
  title: '审批驳回',
  comment,
});
```

**Apply to Phase 19:** Notification rows for new task, approved, and rejected must be created inside these same transactions. The notification read/list/count service must always scope by `userId = currentUser.id`.

---

### `backend/src/modules/approval/notification.route.ts` (route, request-response)

**Analog:** `backend/src/modules/approval/task.route.ts`

**Apply copied route pattern:** prefix can be `/notifications` even if source file lives under `modules/approval`. Use `authGuard()` or a future notification read permission if introduced, then service-level user scoping:
```ts
export const notificationModule = new Elysia({ prefix: '/notifications' })
  .guard({}, (app) =>
    app
      .use(authGuard())
      .get('/', async ({ query, currentUser }: any) => listNotifications(toActor(currentUser), query))
      .get('/unread-count', async ({ currentUser }: any) => getUnreadNotificationCount(currentUser.id))
      .post('/:id/read', async ({ params, currentUser }: any) => markNotificationRead(currentUser.id, Number(params.id)))
      .post('/read-all', async ({ currentUser }: any) => markAllNotificationsRead(currentUser.id)),
  );
```

Do not accept `userId` from request bodies or query strings.

---

### `backend/src/modules/template/template.route.ts` (route, request-response)

**Analog:** self

**Template update payload and permission pattern** (lines 17-25, 37-47):
```ts
export type TemplateUpdateBody = {
  name?: string;
  description?: string | null;
  schema?: unknown;
  requireIdentity?: boolean;
  businessMode?: TemplateBusinessMode;
  approvalProcessId?: number | null;
  disconnectPublicCollection?: boolean;
};

function assertApprovalTemplateBindPermission(currentUser?: CurrentUser): void {
  if (!hasApprovalTemplateBindPermission(currentUser)) {
    throw new BizError('缺少权限: approval:template:bind', 403, 'FORBIDDEN');
  }
}
```

**Update and schema-version pattern** (lines 65-129):
```ts
export async function updateTemplate(
  id: number,
  body: TemplateUpdateBody,
  currentUser?: CurrentUser,
) {
  const tpl = await prisma.formTemplate.findUnique({
    where: { id },
    include: { _count: { select: { shareLinks: true } } },
  });
  if (!tpl) throw notFound('模板不存在');

  if (bindingChanged) {
    assertApprovalTemplateBindPermission(currentUser);
  }

  const data: Prisma.FormTemplateUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.schema !== undefined) {
    data.schema = body.schema as Prisma.InputJsonValue;
    if (tpl.status === 'PUBLISHED' && hasJsonChanged(body.schema, tpl.schema)) {
      data.schemaVersion = tpl.schemaVersion + 1;
    }
  }
  if (body.requireIdentity !== undefined) data.requireIdentity = body.requireIdentity;
  if (body.businessMode !== undefined) data.businessMode = body.businessMode;

  return prisma.formTemplate.update({ where: { id }, data, include: templateInclude });
}
```

**Route body schema pattern** (lines 237-252):
```ts
.guard({}, (app) =>
  app.use(authGuard('form:template:edit')).put(
    '/:id',
    async ({ params, body, currentUser }: any) => updateTemplate(Number(params.id), body, currentUser),
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        description: t.Optional(t.Nullable(t.String())),
        schema: t.Optional(SchemaV2Body),
        requireIdentity: t.Optional(t.Boolean()),
        businessMode: t.Optional(TemplateBusinessModeBody),
        approvalProcessId: t.Optional(t.Nullable(t.Number())),
        disconnectPublicCollection: t.Optional(t.Boolean()),
      }),
    },
  ),
)
```

**Apply to Phase 19:** Add processing-field config to template update without bumping formal submit `schemaVersion` unless planning deliberately chooses a versioning rule. Keep processing config separate from `schema`.

---

### Backend Test Files (test, request-response/CRUD/batch)

**Primary analogs:** `backend/src/modules/approval/__tests__/task.route.test.ts`, `backend/src/modules/approval/__tests__/task.service.test.ts`

**Route contract test pattern** (`task.route.test.ts` lines 94-110):
```ts
describe('approval task route contract', () => {
  it('exports the authenticated task module under /approval/tasks', () => {
    expect(approvalTaskModule.config.prefix).toBe('/approval/tasks');
  });

  it('approve/reject/comment schemas accept only opinion payloads and forbidden trusted fields are absent', () => {
    expect(schemaPropertyNames(approveBodySchema)).toEqual(['comment']);
    expect(schemaPropertyNames(rejectBodySchema)).toEqual(['comment']);
    expect(schemaPropertyNames(commentBodySchema)).toEqual(['comment']);

    for (const schema of [approveBodySchema, rejectBodySchema, commentBodySchema]) {
      const propertyNames = schemaPropertyNames(schema);
      for (const field of forbiddenTrustedFields) {
        expect(propertyNames).not.toContain(field);
      }
      expect((schema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    }
  });
});
```

**Service fixture cleanup pattern** (`task.service.test.ts` lines 31-47, 165-172):
```ts
async function cleanApprovalData() {
  await prisma.approvalTimelineEvent.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.approvalTask.deleteMany();
  await prisma.approvalApplication.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.shareLink.deleteMany();
  await prisma.formTemplate.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();
}

describe('approval task service', () => {
  beforeEach(async () => {
    await cleanApprovalData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

**Permission/visibility service assertions** (`task.service.test.ts` lines 174-198, 249-265):
```ts
it('pending assignee list returns only current approver tasks with filters', async () => {
  const pending = await listApprovalTasks(
    { id: approver1.id, name: approver1.realName },
    { view: 'pending', templateId: template.id, applicantName: '申请人', departmentId: department.id },
  );
  const foreignPending = await listApprovalTasks({ id: approver2.id, name: approver2.realName }, { view: 'pending' });

  expect(pending.rows).toHaveLength(1);
  expect(foreignPending.rows.map((row) => row.assigneeId)).not.toContain(approver1.id);
});

it('commentApprovalTask stores internal remark hidden from own detail', async () => {
  const detail = await commentApprovalTask({ id: approver1.id, name: approver1.realName }, firstTask.id, '  需要补充说明  ');
  const comment = await prisma.approvalTimelineEvent.findFirstOrThrow({
    where: { applicationId: firstTask.applicationId, type: 'COMMENT' },
  });

  expect(detail.timeline.some((event) => event.title === '内部备注')).toBe(true);
  expect(comment.payload).toEqual({ visibility: 'INTERNAL' });
});
```

**Apply to Phase 19:** Cover metadata model, source permissions, forbidden trusted fields, no-op edit rejection, required reason, formula sanitization, row cap, stats draft exclusion, notification user scoping, and transaction-bound notification creation.

---

### `frontend/src/types/approvalArchive.ts` and `frontend/src/types/notification.ts` (utility, transform)

**Analog:** `frontend/src/types/approvalTask.ts`; `frontend/src/types/approvalApplication.ts`

**DTO + payload key guard pattern** (`approvalTask.ts` lines 13-83):
```ts
export interface ApprovalTaskRow {
  id: number;
  applicationId: number;
  applicationNo: string;
  taskStatus: ApprovalTaskStatus;
  applicationStatus: ApprovalApplicationStatus;
  templateId: number;
  templateName: string;
  templateVersion: number;
  applicantName: string;
  applicantDepartmentId: number | null;
  applicantDepartmentName: string | null;
  assignedAt: string;
  handledAt: string | null;
  canHandle: boolean;
  canComment: boolean;
}

export interface ApprovalTaskDetail extends ApprovalTaskRow {
  formData: Record<string, unknown>;
  schemaSnapshot: SchemaV2;
  processSnapshot: ApprovalProcessSnapshot;
  timeline: ApprovalTimelineEvent[];
  tasks: ApprovalTaskSummary[];
}

export const APPROVE_TASK_PAYLOAD_KEYS = ['comment'] as const;
export const REJECT_TASK_PAYLOAD_KEYS = ['comment'] as const;
export const COMMENT_TASK_PAYLOAD_KEYS = ['comment'] as const;
```

**Timeline event type pattern** (`approvalApplication.ts` lines 49-60):
```ts
export interface ApprovalTimelineEvent {
  id: number;
  taskId: number | null;
  actorId: number | null;
  actorName: string;
  nodeOrder: number | null;
  nodeName: string | null;
  type: 'SUBMIT' | 'ASSIGN' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'EDIT' | 'MARK' | 'COMMENT';
  title: string;
  comment: string | null;
  payload: unknown;
  createdAt: string;
}
```

**Status helper pattern** (`approvalTask.ts` lines 85-116):
```ts
const TASK_STATUS_LABELS: Record<ApprovalTaskStatus, string> = {
  PENDING: '待处理',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELED: '已关闭',
  SKIPPED: '已跳过',
};

export function taskStatusLabel(status: ApprovalTaskStatus): string {
  return TASK_STATUS_LABELS[status];
}

export function canHandleTask(value: Pick<ApprovalTaskRow, 'taskStatus' | 'canHandle'>): boolean {
  return value.canHandle && value.taskStatus === 'PENDING';
}
```

**Apply to Phase 19:**
- Define `ArchiveSourceType = 'approval' | 'collection'`.
- Define row/detail filters and payload key constants for tags, notes, edits, processing saves, export filters.
- Define notification DTOs without accepting client-supplied `userId`.

---

### `frontend/src/stores/approvalArchive.ts` and `frontend/src/stores/notification.ts` (store, request-response)

**Analog:** `frontend/src/stores/approvalTask.ts`

**State + API action pattern** (lines 15-43):
```ts
export const useApprovalTaskStore = defineStore('approvalTask', {
  state: () => ({
    rows: [] as ApprovalTaskRow[],
    total: 0,
    page: 1,
    size: 10,
    filters: {
      templateId: null,
      applicantName: '',
      departmentId: null,
      status: '',
      dateFrom: '',
      dateTo: '',
    } as ApprovalTaskListFilters,
    filterOptions: {
      templates: [],
      departments: [],
    } as ApprovalTaskFilterOptions,
    current: null as ApprovalTaskDetail | null,
    loading: false,
    detailLoading: false,
    actionLoading: false,
  }),
  actions: {
    async fetchMeta() {
      const { data } = await api.get('/approval/tasks/meta');
      this.filterOptions = data;
      return data as ApprovalTaskFilterOptions;
    },
```

**Filtered list action pattern** (lines 45-80):
```ts
async fetchList(filters?: ApprovalTaskListFilters) {
  this.loading = true;
  try {
    if (filters?.page) this.page = filters.page;
    if (filters?.size) this.size = filters.size;

    const activeFilters = { ...this.filters, ...filters };
    const params: Record<string, unknown> = {
      view: activeFilters.view ?? this.view,
      page: activeFilters.page ?? this.page,
      size: activeFilters.size ?? this.size,
    };
    if (activeFilters.templateId) params.templateId = activeFilters.templateId;
    if (activeFilters.applicantName) params.applicantName = activeFilters.applicantName;
    if (activeFilters.departmentId) params.departmentId = activeFilters.departmentId;
    if (activeFilters.status) params.status = activeFilters.status;
    if (activeFilters.dateFrom) params.dateFrom = activeFilters.dateFrom;
    if (activeFilters.dateTo) params.dateTo = activeFilters.dateTo;

    const { data } = await api.get('/approval/tasks', { params });
    this.rows = data.rows;
    this.total = data.total;
    return data;
  } finally {
    this.loading = false;
  }
}
```

**Action request pattern** (lines 82-120):
```ts
async fetchDetail(id: number) {
  this.detailLoading = true;
  try {
    const { data } = await api.get(`/approval/tasks/${id}`);
    this.current = data;
    return data as ApprovalTaskDetail;
  } finally {
    this.detailLoading = false;
  }
},
async comment(id: number, comment: string) {
  this.actionLoading = true;
  try {
    const { data } = await api.post(`/approval/tasks/${id}/comment`, { comment });
    if (this.current?.id === id) this.current = data;
    return data as ApprovalTaskDetail;
  } finally {
    this.actionLoading = false;
  }
}
```

**Apply to Phase 19:** Archive store should add `exportLoading`, `statsLoading`, and action methods for tag save, note save, edit save, processing save, stats fetch, and Excel download. Notification store should add unread count/list/mark-read/read-all and polling helpers.

---

### `frontend/src/pages/ApprovalArchivePage.vue` (component, request-response)

**Analog:** `frontend/src/pages/ApprovalTaskPage.vue`

**Page header + mobile filter trigger pattern** (lines 1-32):
```vue
<q-page padding class="approval-task-page">
  <div class="row items-center q-mb-md q-gutter-sm">
    <div class="text-h6">待我审批</div>
    <q-space />
    <q-btn
      v-if="isMobile"
      flat
      dense
      round
      icon="filter_list"
      class="mobile-filter-trigger"
      aria-label="筛选任务"
      @click="openFilterSheet"
    >
      <q-tooltip>筛选任务</q-tooltip>
    </q-btn>
    <q-btn flat dense round icon="refresh" aria-label="刷新任务列表" @click="load">
      <q-tooltip>刷新任务列表</q-tooltip>
    </q-btn>
  </div>

  <q-btn-toggle
    v-model="store.view"
    toggle-color="primary"
    flat
    bordered
    spread
    :options="viewOptions"
  />
```

**Desktop filters pattern** (lines 34-102):
```vue
<div v-if="isDesktop" class="task-filter row items-center q-gutter-sm q-mb-md">
  <q-select v-model="store.filters.templateId" outlined dense clearable emit-value map-options label="申请类型" />
  <q-input v-model="store.filters.applicantName" outlined dense clearable label="申请人" @keyup.enter="applyFilters" />
  <q-select v-model="store.filters.departmentId" outlined dense clearable emit-value map-options label="部门" />
  <q-input v-model="store.filters.dateFrom" outlined dense readonly :label="dateFromLabel" class="date-filter">
    <template #append>
      <q-icon name="event" class="cursor-pointer" aria-label="选择开始日期">
        <q-tooltip>选择开始日期</q-tooltip>
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-date v-model="store.filters.dateFrom" mask="YYYY-MM-DD" @update:model-value="applyFilters" />
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
  <q-btn flat label="重置筛选" class="task-filter-reset" @click="resetFilters" />
</div>
```

**Desktop table + mobile card pattern** (lines 133-221):
```vue
<q-table
  v-if="isDesktop"
  :rows="store.rows"
  :columns="columns"
  row-key="id"
  :loading="store.loading"
  :pagination="pagination"
  :rows-per-page-options="[10, 20, 50]"
  flat
  bordered
  dense
  @request="onRequest"
>
  <template #body-cell-actions="props">
    <q-td :props="props">
      <q-btn flat dense size="sm" color="primary" icon="visibility" label="查看详情" @click="openTask(props.row.id)" />
    </q-td>
  </template>
</q-table>

<div v-else class="q-gutter-sm">
  <q-card v-for="row in store.rows" :key="row.id" flat bordered class="task-card cursor-pointer" @click="openTask(row.id)">
    <q-card-section>
      <div class="text-subtitle1 wrap-text">{{ row.templateName }}</div>
      <div class="text-caption muted">申请编号：{{ row.applicationNo }}</div>
    </q-card-section>
  </q-card>
</div>
```

**Mobile filter sheet pattern** (lines 225-287):
```vue
<q-dialog v-model="filterDialog" position="bottom">
  <q-card class="filter-sheet">
    <div class="flex flex-center q-pt-sm q-pb-xs">
      <div class="sheet-handle"></div>
    </div>
    <q-card-section class="text-h6">筛选任务</q-card-section>
    <q-card-section class="q-gutter-md">
      <q-select v-model="filterDraft.templateId" outlined dense clearable emit-value map-options label="申请类型" />
      <q-input v-model="filterDraft.applicantName" outlined dense clearable label="申请人" />
      <q-select v-model="filterDraft.departmentId" outlined dense clearable emit-value map-options label="部门" />
      <q-input v-model="filterDraft.dateFrom" outlined dense readonly :label="dateFromLabel" />
    </q-card-section>
    <q-card-actions align="right" class="q-pa-md">
      <q-btn flat label="重置筛选" class="task-filter-reset" @click="resetDraftFilters" />
      <q-btn color="primary" label="应用筛选" class="task-filter-apply" @click="applyMobileFilters" />
    </q-card-actions>
  </q-card>
</q-dialog>
```

**Apply to Phase 19:** Rename copy to archive terms, add source/status/tag filters, add `导出 Excel` header action under `approval:export`, and keep stats as a tab/section inside this page.

---

### `frontend/src/pages/ApprovalArchiveDetailPage.vue` (component, request-response + file-I/O)

**Analogs:** `frontend/src/pages/ApprovalTaskDetailPage.vue`, `frontend/src/pages/ApprovalApplicationDetailPage.vue`, `frontend/src/components/submission/SubmissionDetail.vue`

**Full-page detail layout pattern** (`ApprovalTaskDetailPage.vue` lines 36-90, 94-137):
```vue
<div v-else-if="detail" class="detail-grid">
  <div class="detail-main">
    <q-card flat bordered class="detail-section q-mb-md">
      <q-card-section>
        <div class="section-title">申请信息</div>
        <div class="summary-grid q-mt-md">
          <div><span class="muted">申请编号：</span>{{ detail.applicationNo }}</div>
          <div><span class="muted">申请类型：</span>{{ detail.templateName }} v{{ detail.templateVersion }}</div>
          <div><span class="muted">申请人：</span>{{ detail.applicantName }}</div>
          <div><span class="muted">部门：</span>{{ detail.applicantDepartmentName || '未设置部门' }}</div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="detail-section q-mb-md">
      <q-card-section>
        <div class="section-title q-mb-md">表单内容</div>
        <GridFormRenderer :schema="detail.schemaSnapshot" mode="print" :model-value="detail.formData" />
      </q-card-section>
    </q-card>
  </div>

  <div class="detail-side">
    <q-card flat bordered class="detail-section">
      <q-card-section>
        <div class="section-title q-mb-md">审批动态</div>
        <ApplicationTimeline :events="detail.timeline" />
      </q-card-section>
    </q-card>
  </div>
</div>
```

**Dialog/action pattern for notes and controlled operations** (`ApprovalTaskDetailPage.vue` lines 224-249, 401-412):
```vue
<q-dialog v-model="remarkDialog" persistent>
  <q-card class="task-dialog">
    <q-card-section class="text-h6">添加内部备注</q-card-section>
    <q-card-section>
      <q-input v-model="remarkComment" outlined type="textarea" autogrow maxlength="200" counter label="备注内容" />
    </q-card-section>
    <q-card-actions align="right" class="q-pa-md">
      <q-btn flat label="返回" :disable="store.actionLoading" v-close-popup />
      <q-btn color="primary" label="保存备注" :disable="remarkComment.trim().length === 0" :loading="store.actionLoading" @click="confirmRemark" />
    </q-card-actions>
  </q-card>
</q-dialog>

async function confirmRemark() {
  const comment = remarkComment.value.trim();
  if (!comment) return;
  try {
    await store.comment(taskId.value, comment);
    Notify.create({ type: 'positive', message: '内部备注已保存' });
    remarkDialog.value = false;
    await refreshTaskData();
  } catch {
    Notify.create({ type: 'negative', message: '内部备注保存失败，请检查网络后重试。' });
  }
}
```

**Print-area pattern** (`SubmissionDetail.vue` lines 15-37):
```vue
<div
  id="print-area"
  class="detail-body"
  :data-form-title="templateName"
  :data-submit-time="formatDate(submission.createdAt)"
>
  <template v-if="isV2Schema && v2Schema">
    <GridFormRenderer
      :schema="v2Schema"
      mode="print"
      :model-value="submission.data as Record<string, any>"
    />
  </template>
</div>
```

**Mobile print readability pattern** (`ApprovalApplicationDetailPage.vue` lines 211-294):
```css
.detail-wrapper {
  max-width: 1184px;
  margin: 0 auto;
  padding-bottom: 80px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
}

@media (max-width: 1023px) {
  .detail-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .detail-section :deep(.mode-print .print-grid-table),
  .detail-section :deep(.mode-print .print-grid-table tbody),
  .detail-section :deep(.mode-print .print-grid-table tr),
  .detail-section :deep(.mode-print .print-grid-table td) {
    display: block;
    width: 100% !important;
    max-width: 100%;
  }
}
```

**Apply to Phase 19:** Full-page archive detail should use `#print-area`, keep formal submit content separate from processing fields, show corrected values with `已修正`, and put field history/internal notes/tags/timeline in side or mobile-ordered sections.

---

### `frontend/src/components/approval/ArchiveStatsPanel.vue` (component, transform)

**Analog:** `frontend/src/components/submission/FormStatsPanel.vue`

**Table + chart layout pattern** (lines 78-115):
```vue
<div v-else class="row q-gutter-md">
  <q-card :class="isDesktop ? 'col-12 col-md-6' : 'col-12'" flat bordered style="border-radius: 8px">
    <q-card-section>
      <q-table
        :rows="stats"
        :columns="tableColumns"
        row-key="userId"
        dense
        flat
        hide-bottom
        :pagination="{ rowsPerPage: 0 }"
      />
    </q-card-section>
  </q-card>

  <q-card :class="isDesktop ? 'col-12 col-md-6' : 'col-12'" flat bordered style="border-radius: 8px">
    <q-card-section>
      <Bar
        :data="chartData"
        :options="chartOptions"
        :style="{ height: '300px' }"
        role="img"
        aria-label="员工分享与收集数量柱状图"
      />
    </q-card-section>
  </q-card>
</div>
```

**Chart registration + options pattern** (lines 121-137, 182-207):
```ts
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Bar } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const chartData = computed(() => ({
  labels: stats.value.map((s) => s.realName),
  datasets: [
    { label: '分享次数', backgroundColor: '#4F46E5', data: stats.value.map((s) => s.shareCount) },
    { label: '收集数量', backgroundColor: '#16A34A', data: stats.value.map((s) => s.submissionCount) },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const } },
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
};
```

**Fetch and error feedback pattern** (lines 243-255):
```ts
async function fetchStats() {
  statsLoading.value = true;
  try {
    const { dateFrom, dateTo } = getDateRange();
    const { data } = await api.get('/form-stats', {
      params: { dateFrom, dateTo },
    });
    stats.value = data;
  } catch {
    Notify.create({ type: 'warning', message: '统计数据加载失败' });
  } finally {
    statsLoading.value = false;
  }
}
```

**Apply to Phase 19:** Use this for archive stats, but route through `approvalArchive` store if the page already owns archive filters. Keep table alternative for every chart and fixed 300px chart height.

---

### `frontend/src/layouts/MainLayout.vue` and `frontend/src/router/routes.ts` (component/route, request-response)

**Analogs:** self, `frontend/src/pages/TemplatePage.vue`

**Header action insertion point** (`MainLayout.vue` lines 4-27):
```vue
<q-header elevated class="bg-primary text-white">
  <q-toolbar>
    <q-btn v-if="isMobile" flat dense round icon="menu" @click="mobileDrawerOpen = !mobileDrawerOpen" />
    <q-btn v-else flat dense round icon="menu" @click="drawerOpen = !drawerOpen" />
    <q-toolbar-title>OA 管理系统</q-toolbar-title>
    <q-space />
    <q-btn flat round dense :icon="isDark ? 'light_mode' : 'dark_mode'" @click="toggleDark" />
    <q-btn-dropdown v-if="isDesktop" flat :label="auth.user?.realName ?? ''" icon="account_circle">
      <q-list>
        <q-item clickable v-close-popup @click="onLogout">
          <q-item-section avatar><q-icon name="logout" /></q-item-section>
          <q-item-section>退出登录</q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </q-toolbar>
</q-header>
```

**Menu permission pattern** (`MainLayout.vue` lines 148-201):
```ts
interface MenuConfig {
  path?: string;
  title: string;
  icon: string;
  perm?: string;
  children?: MenuConfig[];
}

const allMenus: MenuConfig[] = [
  {
    title: '审批管理',
    icon: 'approval',
    children: [
      { path: '/approval/tasks', title: '待我审批', icon: 'fact_check', perm: 'approval:task:list' },
      { path: '/approval/applications', title: '我的申请', icon: 'assignment', perm: 'approval:application:own' },
      { path: '/approval/processes', title: '流程配置', icon: 'rule', perm: 'approval:process:list' },
    ],
  },
];

function filterMenus(menus: MenuConfig[]): MenuConfig[] {
  return menus.reduce<MenuConfig[]>((acc, m) => {
    if (m.children) {
      const children = filterMenus(m.children);
      if (children.length > 0) acc.push({ ...m, children });
    } else if (!m.perm || auth.hasPerm(m.perm)) {
      acc.push(m);
    }
    return acc;
  }, []);
}
```

**Badge syntax analog** (`TemplatePage.vue` lines 88-104):
```vue
<q-badge
  :color="statusColor(props.row.status)"
  text-color="white"
  :label="statusLabel(props.row.status)"
/>
<q-badge
  :color="purposeColor(props.row.businessMode)"
  text-color="white"
  :label="purposeLabel(props.row.businessMode)"
/>
```

**Route meta pattern** (`routes.ts` lines 20-38):
```ts
{
  path: '/',
  component: () => import('layouts/MainLayout.vue'),
  redirect: '/dashboard',
  children: [
    { path: 'approval/processes', component: () => import('pages/ApprovalProcessPage.vue'), meta: { title: '流程配置', icon: 'rule', perm: 'approval:process:list' } },
    { path: 'approval/tasks', component: () => import('pages/ApprovalTaskPage.vue'), meta: { title: '待我审批', icon: 'fact_check', perm: 'approval:task:list' } },
    { path: 'approval/tasks/:id', component: () => import('pages/ApprovalTaskDetailPage.vue'), meta: { title: '审批详情', perm: 'approval:task:list' } },
    { path: 'approval/applications', component: () => import('pages/ApprovalApplicationPage.vue'), meta: { title: '我的申请', icon: 'assignment', perm: 'approval:application:own' } },
  ],
}
```

**Apply to Phase 19:**
- Insert `归档查询` between `待我审批` and `我的申请`.
- Because route `meta.perm` only accepts one permission, use the strongest single route permission or update router/menu helpers for `permAny` if planner chooses multi-permission visibility. Do not expose action buttons without backend permission checks.
- Add notification icon button near dark-mode/user controls with floating `q-badge`; no exact floating header badge exists, so combine the header insertion point with the badge syntax above.

---

### `frontend/src/boot/perm.ts`, `frontend/src/stores/auth.ts`, and route guards (shared permission pattern)

**Element permission directive** (`boot/perm.ts` lines 5-18):
```ts
function applyPerm(el: HTMLElement, binding: any) {
  const auth = useAuthStore();
  const code = binding.value as string | string[];
  const codes = Array.isArray(code) ? code : [code];
  const has = codes.some((c) => auth.hasPerm(c));
  el.style.display = has ? '' : 'none';
}

export default boot(({ app }) => {
  app.directive('perm', {
    mounted: applyPerm,
    updated: applyPerm,
  });
});
```

**Auth store permission helper** (`auth.ts` lines 60-64):
```ts
hasPerm(code: string): boolean {
  if (!this.user) return false;
  if (this.user.roles.includes('ADMIN')) return true;
  return this.user.permissions.includes(code);
}
```

**Route guard pattern** (`router/index.ts` lines 20-33):
```ts
Router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.meta.public) return true;
  if (!auth.isLogin) return { path: '/login', query: { redirect: to.fullPath } };

  await auth.maybeRefreshProfile();

  const perm = to.meta.perm as string | undefined;
  if (perm && !auth.hasPerm(perm)) {
    Notify.create({ type: 'warning', message: '您的权限已更新' });
    return { path: '/403' };
  }
  return true;
});
```

**Apply to Phase 19:** Use `v-perm` for edit/mark/stats/export actions. If archive route visibility needs `approval:application:department` OR `approval:application:all` OR `form:submission:list`, add a `hasAnyPerm`/`permAny` helper consistently in auth, router, and menu code.

---

### `frontend/src/components/approval/ApplicationTimeline.vue` (component, transform)

**Analog:** self

**Event mapping and comment rendering pattern** (lines 1-16, 34-42, 69-74):
```vue
<q-timeline v-if="orderedEvents.length > 0" color="primary" layout="dense">
  <q-timeline-entry
    v-for="event in orderedEvents"
    :key="event.id"
    :title="eventTitle(event)"
    :subtitle="formatDate(event.createdAt)"
  >
    <div class="timeline-meta">
      {{ event.actorName }}<span v-if="event.nodeName"> · {{ event.nodeName }}</span>
    </div>
    <div v-if="event.comment" class="timeline-comment">{{ event.comment }}</div>
  </q-timeline-entry>
</q-timeline>

function eventTitle(event: ApprovalTimelineEvent) {
  if (event.type === 'SUBMIT') return '提交申请';
  if (event.type === 'ASSIGN') return `进入 ${event.nodeName || '审批节点'}`;
  if (event.type === 'APPROVE') return '审批通过';
  if (event.type === 'REJECT') return '审批驳回';
  if (event.type === 'CANCEL') return '申请已撤销';
  if (event.type === 'COMMENT') return '内部备注';
  return event.title;
}

.timeline-comment {
  margin-top: 8px;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
}
```

**Apply to Phase 19:** Add `MARK` and `EDIT` labels only if `event.title` is insufficient. Preserve `white-space: pre-wrap` for notes/reasons.

---

### `frontend/src/stores/template.ts`, `frontend/src/pages/FormDesignerPage.vue`, `frontend/src/types/schema.ts` (processing field config)

**Analogs:** self

**Template store DTO + update pattern** (`template.ts` lines 17-42, 98-101):
```ts
export interface Template {
  id: number;
  name: string;
  description: string | null;
  schema: SchemaV2;
  schemaVersion: number;
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE';
  requireIdentity: boolean;
  businessMode: TemplateBusinessMode;
  approvalProcessId: number | null;
  approvalProcess?: TemplateApprovalProcessSummary | null;
}

export interface TemplateUpdatePayload {
  name?: string;
  description?: string;
  schema?: SchemaV2;
  requireIdentity?: boolean;
  businessMode?: TemplateBusinessMode;
  approvalProcessId?: number | null;
  disconnectPublicCollection?: boolean;
}

async update(id: number, payload: TemplateUpdatePayload) {
  const { data } = await api.put(`/templates/${id}`, payload);
  if (this.current?.id === id) this.current = data;
  return data;
}
```

**Designer toolbar/save pattern** (`FormDesignerPage.vue` lines 1-63, 178-221):
```vue
<div class="designer-toolbar row items-center no-wrap">
  <q-btn flat dense icon="arrow_back" aria-label="返回模板列表" @click="router.push('/templates')" />
  <span class="text-h6 q-ml-sm ellipsis">{{ store.current?.name ?? '' }}</span>
  <q-space />
  <q-toggle v-if="store.current" v-model="store.current.requireIdentity" label="要求填写者提供身份信息" dense />
  <q-btn flat label="保存设计" :loading="saving" @click="handleSave" />
</div>

async function saveTemplate(disconnectPublicCollection = false) {
  if (!store.current) return;
  saving.value = true;
  try {
    const prev = store.current.schemaVersion;
    await store.update(templateId, {
      schema: store.current.schema,
      requireIdentity: store.current.requireIdentity,
      businessMode: store.current.businessMode,
      approvalProcessId: store.current.approvalProcessId,
      ...(disconnectPublicCollection ? { disconnectPublicCollection: true } : {}),
    });
    $q.notify({ type: 'positive', message: '保存成功' });
    if (store.current.schemaVersion > prev) {
      $q.notify({ type: 'info', message: `模板已更新至 v${store.current.schemaVersion}` });
    }
    syncOriginalBinding();
  } finally {
    saving.value = false;
  }
}
```

**Schema type extension point** (`schema.ts` lines 1-15, 39-57):
```ts
export type FieldType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature';

export interface SchemaField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  colSpan: number;
  placeholder?: string;
  options?: string[];
  remark?: string;
}

export interface SchemaV2 {
  version: 2;
  items: SchemaItem[];
}

export function flattenFields(schema: SchemaV2): SchemaField[] {
  const result: SchemaField[] = [];
  for (const item of schema.items) {
    if (item.type === 'row') result.push(...item.fields);
    else if (item.type === 'group') for (const row of item.rows) result.push(...row.fields);
  }
  return result;
}
```

**Apply to Phase 19:** Processing field config should reuse lightweight field types (`text`, `textarea`, `date`, single/multi-select, `phone`) but stay separate from formal `SchemaV2`. Do not add signature/dynamic-table/attachment processing fields.

## Shared Patterns

### Authentication And Permission Guards
**Source:** `backend/src/middlewares/auth.ts` lines 6-52  
**Apply to:** all backend archive/export/stats/notification routes
```ts
export const authGuard = (requiredPerm?: string) =>
  new Elysia({ name: `auth-guard-${requiredPerm ?? 'any'}` })
    .derive({ as: 'scoped' }, async ({ accessJwt, headers }: any) => {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) throw unauthorized();
      const payload = await accessJwt.verify(auth.slice(7));
      if (!payload || !payload.sub) throw unauthorized('令牌无效');

      const user = await prisma.user.findUnique({
        where: { id: Number(payload.sub) },
        include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
      });
      if (!user || user.status === 'DISABLED') throw unauthorized('账号不存在或已禁用');

      if (requiredPerm && !roleCodes.includes('ADMIN') && !permCodes.has(requiredPerm)) {
        throw forbidden(`缺少权限: ${requiredPerm}`);
      }

      return { currentUser: { id: user.id, username: user.username, realName: user.realName, roleCodes, permissions: Array.from(permCodes) } };
    });
```

### Error Handling
**Source:** `backend/src/index.ts` lines 53-60  
**Apply to:** all new backend modules
```ts
.onError(({ error, set }: any) => {
  if (error instanceof BizError) {
    set.status = error.status;
    return { code: error.code, message: error.message };
  }
  console.error('[ERR]', error);
  set.status = 500;
  return { code: 'INTERNAL', message: error.message ?? 'Server error' };
})
```

### Applicant Visibility Boundary
**Source:** `backend/src/modules/approval/application-submission.service.ts` lines 204-227  
**Apply to:** archive metadata additions and approval own-detail regressions
```ts
function serializeDetail(actor: ApprovalActor, application: OwnApplicationWithRelations) {
  return {
    ...serializeRow(actor, application),
    formData: application.formData,
    schemaSnapshot: application.schemaSnapshot,
    processSnapshot: application.processSnapshot,
    timeline: application.timelineEvents
      .filter((event) => {
        const payload = event.payload as { visibility?: unknown } | null;
        return !(event.type === 'COMMENT' && payload?.visibility === 'INTERNAL');
      })
      .map((event) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        comment: event.comment,
        payload: event.payload,
        createdAt: event.createdAt,
      })),
  };
}
```

### Responsive Operational UI
**Source:** `frontend/src/pages/ApprovalTaskPage.vue` and `frontend/src/pages/ApprovalTaskDetailPage.vue`  
**Apply to:** archive list/detail pages
- Desktop uses `q-table flat bordered dense` and side-by-side detail grid.
- Mobile uses tappable `q-card flat bordered`, bottom filter sheet, and reserved sticky action padding.
- Icon-only buttons must include `aria-label` and/or `q-tooltip`.

### Tests
**Source:** backend `bun:test` files and frontend Vitest files  
**Apply to:** all Phase 19 test files
- Backend service tests create DB fixtures and clean dependent rows in `beforeEach`.
- Backend route tests assert `module.config.prefix`, schema property names, `additionalProperties: false`, and serialized dates.
- Frontend store tests mock `src/boot/axios` with `vi.fn()`.
- Frontend page contract tests can read source text when full component mounting is unnecessary.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/src/modules/approval/archive-export.service.ts` | service | file-I/O + transform | No existing backend XLSX/ExcelJS export implementation exists. Use archive service query patterns, `exceljs` docs from `19-RESEARCH.md`, and PDF export discipline from `usePdfExport.ts`. |

## Metadata

**Analog search scope:** `backend/prisma/`, `backend/src/index.ts`, `backend/src/middlewares/`, `backend/src/modules/`, `frontend/src/types/`, `frontend/src/stores/`, `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/layouts/`, `frontend/src/router/`, `frontend/src/boot/`  
**Files scanned:** 80+  
**Pattern extraction date:** 2026-04-26
