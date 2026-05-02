# Phase 18: 待我审批与移动审批 - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 17
**Analogs found:** 16 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/modules/approval/task.route.ts` | route | request-response | `backend/src/modules/approval/application.route.ts` | exact |
| `backend/src/modules/approval/task.service.ts` | service | request-response | `backend/src/modules/approval/application-submission.service.ts` | role-match |
| `backend/src/index.ts` | config | request-response | `backend/src/index.ts` | exact |
| `backend/src/modules/approval/application-submission.service.ts` | service | request-response | `backend/src/modules/approval/application-submission.service.ts` | exact |
| `backend/src/modules/approval/__tests__/task.route.test.ts` | test | request-response | `backend/src/modules/approval/__tests__/application.route.test.ts` | exact |
| `backend/src/modules/approval/__tests__/task.service.test.ts` | test | request-response | `backend/src/modules/approval/__tests__/application-submission.service.test.ts` | role-match |
| `backend/src/modules/approval/__tests__/application-submission.service.test.ts` | test | request-response | `backend/src/modules/approval/__tests__/application-submission.service.test.ts` | exact |
| `frontend/src/types/approvalTask.ts` | model | transform | `frontend/src/types/approvalApplication.ts` | exact |
| `frontend/src/types/__tests__/approvalTask.test.ts` | test | transform | `frontend/src/types/__tests__/approvalApplication.test.ts` | exact |
| `frontend/src/stores/approvalTask.ts` | store | request-response | `frontend/src/stores/approvalApplication.ts` | exact |
| `frontend/src/stores/__tests__/approvalTask.test.ts` | test | request-response | `frontend/src/stores/__tests__/approvalApplication.test.ts` | exact |
| `frontend/src/pages/ApprovalTaskPage.vue` | component | request-response | `frontend/src/pages/ApprovalApplicationPage.vue` | exact |
| `frontend/src/pages/ApprovalTaskDetailPage.vue` | component | request-response | `frontend/src/pages/ApprovalApplicationDetailPage.vue` | exact |
| `frontend/src/router/routes.ts` | route | request-response | `frontend/src/router/routes.ts` | exact |
| `frontend/src/layouts/MainLayout.vue` | component | request-response | `frontend/src/layouts/MainLayout.vue` | exact |
| `frontend/src/components/approval/ApplicationTimeline.vue` | component | transform | `frontend/src/components/approval/ApplicationTimeline.vue` | exact |
| `frontend/src/pages/__tests__/ApprovalTaskDetailPage.test.ts` | test | request-response | none | no-analog |

## Pattern Assignments

### `backend/src/modules/approval/task.route.ts` (route, request-response)

**Primary analog:** `backend/src/modules/approval/application.route.ts`  
**Secondary analog:** `backend/src/middlewares/auth.ts`

**Imports + actor coercion** (`backend/src/modules/approval/application.route.ts` lines 1-14, 130-135):
```ts
import { Elysia, t } from 'elysia';

import { authGuard } from '../../middlewares/auth';
import {
  cancelOwnApplication,
  createApplicationDraft,
  getOwnApplicationDetail,
  listAvailableApprovalTemplates,
  listOwnApplications,
  submitDraftApplication,
  updateDraftApplication,
  type ApplicationListFilters,
} from './application-submission.service';
import type { ApprovalActor } from './application.service';

function toActor(currentUser: { id: number; realName?: string; username?: string }): ApprovalActor {
  return {
    id: currentUser.id,
    name: currentUser.realName || currentUser.username || String(currentUser.id),
  };
}
```

**Schema pattern** (`backend/src/modules/approval/application.route.ts` lines 72-123):
```ts
const formDataSchema = t.Record(t.String(), t.Any());

export const cancelBodySchema = t.Object(
  {
    reason: t.Optional(t.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);

const paramsSchema = t.Object({ id: t.String() });

const listQuerySchema = t.Object({
  page: t.Optional(t.String()),
  size: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal(''),
      t.Literal('DRAFT'),
      t.Literal('IN_PROGRESS'),
      t.Literal('SUBMITTED'),
      t.Literal('APPROVING'),
      t.Literal('APPROVED'),
      t.Literal('REJECTED'),
      t.Literal('CANCELED'),
    ]),
  ),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
});
```

**Serialization pattern** (`backend/src/modules/approval/application.route.ts` lines 137-204):
```ts
export function serializeApplicationRow(row: ApplicationRouteRow) {
  return {
    id: row.id,
    applicationNo: row.applicationNo,
    status: row.status,
    templateId: row.templateId,
    templateName: row.templateName,
    templateVersion: row.templateVersion,
    processId: row.processId,
    processName: row.processName,
    applicantName: row.applicantName,
    applicantDepartmentName: row.applicantDepartmentName,
    currentNodeOrder: row.currentNodeOrder,
    currentNodeName: row.currentNodeName,
    submittedAt: toIso(row.submittedAt),
    completedAt: toIso(row.completedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    canCancel: row.canCancel ?? (row.status === 'SUBMITTED' || row.status === 'APPROVING'),
  };
}
```

**Guarded route grouping** (`backend/src/modules/approval/application.route.ts` lines 206-279):
```ts
export const approvalApplicationModule = new Elysia({ prefix: '/approval/applications' })
  .guard({}, (app) =>
    app
      .use(authGuard('approval:application:create'))
      .get('/templates', async () => listAvailableApprovalTemplates())
      .post('/drafts', async ({ body, currentUser }: any) => /* ... */, { body: createDraftBodySchema })
      .put('/:id/draft', async ({ params, body, currentUser }: any) => /* ... */, {
        params: paramsSchema,
        body: updateDraftBodySchema,
      })
      .post('/:id/submit', async ({ params, body, currentUser }: any) => /* ... */, {
        params: paramsSchema,
        body: submitBodySchema,
      }),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('approval:application:own'))
      .get('/', async ({ query, currentUser }: any) => /* ... */, { query: listQuerySchema })
      .get('/:id', async ({ params, currentUser }: any) => /* ... */, { params: paramsSchema })
      .post('/:id/cancel', async ({ params, body, currentUser }: any) => /* ... */, {
        params: paramsSchema,
        body: cancelBodySchema,
      }),
  );
```

**Apply to Phase 18:** split `approval:task:list` read routes from `approval:task:handle` action routes the same way; keep TypeBox schemas at route-layer and return ISO-string serialized DTOs only.

---

### `backend/src/modules/approval/task.service.ts` (service, request-response)

**Primary analog:** `backend/src/modules/approval/application-submission.service.ts`  
**Secondary analog:** `backend/src/modules/approval/application.service.ts`

**Imports + Prisma/BizError shape** (`backend/src/modules/approval/application-submission.service.ts` lines 1-13):
```ts
import type { ApprovalApplicationStatus, Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';

import { prisma } from '../../plugins/prisma';
import { BizError, notFound } from '../../utils/errors';
import {
  cancelApplication,
  createDraftApplication as createWorkflowDraftApplication,
  submitApplication,
  type ApprovalActor,
} from './application.service';
```

**Normalization helpers** (`backend/src/modules/approval/application-submission.service.ts` lines 73-109):
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
  if (boundary === 'end' && !value.includes('T')) {
    parsed.setHours(23, 59, 59, 999);
  }
  return parsed;
}
```

**List/detail serializer pattern** (`backend/src/modules/approval/application-submission.service.ts` lines 182-235):
```ts
function serializeRow(actor: ApprovalActor, application: Prisma.ApprovalApplicationGetPayload<Record<string, never>>) {
  return {
    id: application.id,
    applicationNo: application.applicationNo,
    status: application.status,
    templateId: application.templateId,
    templateName: application.templateName,
    templateVersion: application.templateVersion,
    processId: application.processId,
    processName: application.processName,
    applicantName: application.applicantName,
    applicantDepartmentName: application.applicantDepartmentName,
    currentNodeOrder: application.currentNodeOrder,
    currentNodeName: application.currentNodeName,
    submittedAt: application.submittedAt,
    completedAt: application.completedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    canCancel: canCancelApplication(actor, application),
  };
}

function serializeDetail(actor: ApprovalActor, application: OwnApplicationWithRelations) {
  return {
    ...serializeRow(actor, application),
    formData: application.formData,
    schemaSnapshot: application.schemaSnapshot,
    processSnapshot: application.processSnapshot,
    timeline: application.timelineEvents.map((event) => ({
      id: event.id,
      taskId: event.taskId,
      actorId: event.actorId,
      actorName: event.actorName,
      nodeOrder: event.nodeOrder,
      nodeName: event.nodeName,
      type: event.type,
      title: event.title,
      comment: event.comment,
      payload: event.payload,
      createdAt: event.createdAt,
    })),
    tasks: application.tasks.map((task) => ({
      id: task.id,
      nodeOrder: task.nodeOrder,
      nodeName: task.nodeName,
      status: task.status,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      assignedAt: task.assignedAt,
      handledAt: task.handledAt,
      comment: task.comment,
    })),
  };
}
```

**Query pattern** (`backend/src/modules/approval/application-submission.service.ts` lines 330-380):
```ts
export async function listOwnApplications(actor: ApprovalActor, filters: ApplicationListFilters = {}) {
  const page = normalizePage(filters.page, 1);
  const size = normalizeSize(filters.size, 10);
  const statuses = normalizeStatusFilter(filters.status);
  const dateFrom = parseDateBoundary(filters.dateFrom, 'start');
  const dateTo = parseDateBoundary(filters.dateTo, 'end');

  const where: Prisma.ApprovalApplicationWhereInput = { applicantId: actor.id };
  if (statuses) where.status = { in: statuses };
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.approvalApplication.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.approvalApplication.count({ where }),
  ]);

  return { rows: rows.map((row) => serializeRow(actor, row)), total, page, size };
}
```

**Action wrapper boundary** (`backend/src/modules/approval/application.service.ts` lines 220-315, 440-454 and `backend/src/modules/approval/application-submission.service.ts` lines 383-387):
```ts
export async function approveTask(taskId: number, actor: ApprovalActor, comment?: string) {
  return prisma.$transaction(async (tx) => {
    const task = await findTaskWithApplication(tx, taskId);
    assertPendingTask(task.status);

    if (actor.id !== task.assigneeId) {
      throw new BizError('无权处理该审批任务', 403, 'APPROVAL_TASK_FORBIDDEN');
    }

    const claimed = await tx.approvalTask.updateMany({
      where: { id: task.id, status: 'PENDING', assigneeId: actor.id },
      data: { status: 'APPROVED', handledAt: new Date(), comment: comment ?? null },
    });

    if (claimed.count !== 1) {
      throw new BizError('审批任务已被处理', 400, 'INVALID_APPROVAL_TASK_STATUS');
    }
    // ...
  });
}

export async function appendApplicationEvent(input: AppendApplicationEventInput): Promise<void> {
  if (!['COMMENT', 'MARK', 'EDIT'].includes(input.type)) {
    throw new BizError('仅允许追加备注、标记或编辑事件', 400, 'INVALID_APPROVAL_EVENT_TYPE');
  }
  await prisma.$transaction(async (tx) => {
    const application = await tx.approvalApplication.findUnique({ where: { id: input.applicationId } });
    if (!application) throw notFound('审批申请不存在');
    await createActionAndTimeline(tx, input);
  });
}

const normalizedReason = reason?.trim() ? reason.trim().slice(0, 200) : undefined;
```

**Apply to Phase 18:** keep list/detail query logic in `task.service.ts`; delegate approve/reject/comment writes to `approveTask`, `rejectTask`, `appendApplicationEvent`; normalize opinions/remarks with `trim().slice(0, 200)` before crossing the boundary.

---

### `backend/src/index.ts` (config, request-response)

**Analog:** `backend/src/index.ts`

**Module registration pattern** (`backend/src/index.ts` lines 16-18, 62-80):
```ts
import { approvalProcessModule } from './modules/approval/process.route';
import { approvalApplicationModule } from './modules/approval/application.route';

.group('/api', (app) =>
  app
    .group('/v1', (app) =>
      app
        .use(authModule)
        .use(userModule)
        .use(departmentModule)
        .use(roleModule)
        .use(permissionModule)
        .use(dashboardModule)
        .use(approvalProcessModule)
        .use(approvalApplicationModule)
        .use(formTemplateModule)
        .use(submissionModule)
        .use(formStatsModule)
        .use(shareLinkStatsModule),
    )
    .use(publicFillModule),
)
```

**Apply to Phase 18:** add `approvalTaskModule` as a sibling `.use(...)` beside `approvalApplicationModule`; do not mount task routes under public or non-approval groups.

---

### `backend/src/modules/approval/application-submission.service.ts` (modify existing own-detail visibility boundary)

**Analog:** `backend/src/modules/approval/application-submission.service.ts`

**Current detail serialization point** (`backend/src/modules/approval/application-submission.service.ts` lines 204-235):
```ts
function serializeDetail(actor: ApprovalActor, application: OwnApplicationWithRelations) {
  return {
    ...serializeRow(actor, application),
    formData: application.formData,
    schemaSnapshot: application.schemaSnapshot,
    processSnapshot: application.processSnapshot,
    timeline: application.timelineEvents.map((event) => ({
      id: event.id,
      taskId: event.taskId,
      actorId: event.actorId,
      actorName: event.actorName,
      nodeOrder: event.nodeOrder,
      nodeName: event.nodeName,
      type: event.type,
      title: event.title,
      comment: event.comment,
      payload: event.payload,
      createdAt: event.createdAt,
    })),
    tasks: application.tasks.map((task) => ({
      id: task.id,
      nodeOrder: task.nodeOrder,
      nodeName: task.nodeName,
      status: task.status,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      assignedAt: task.assignedAt,
      handledAt: task.handledAt,
      comment: task.comment,
    })),
  };
}
```

**Current fetch point** (`backend/src/modules/approval/application-submission.service.ts` lines 366-380):
```ts
export async function getOwnApplicationDetail(actor: ApprovalActor, id: number) {
  await loadOwnApplicationOrThrow(actor, id, 'view');
  const application = await prisma.approvalApplication.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: [{ nodeOrder: 'asc' }, { id: 'asc' }] },
      timelineEvents: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    },
  });

  if (!application) {
    throw notFound('审批申请不存在');
  }

  return serializeDetail(actor, application);
}
```

**Apply to Phase 18:** filter out internal `COMMENT` events here for applicant own-detail before mapping to DTO. This is the exact modification point for D-29 / APR-06; keep task ordering and applicant ownership checks unchanged.

---

### `backend/src/modules/approval/__tests__/task.route.test.ts` (test, request-response)

**Analog:** `backend/src/modules/approval/__tests__/application.route.test.ts`

**Schema guardrail pattern** (`backend/src/modules/approval/__tests__/application.route.test.ts` lines 13-26, 86-96):
```ts
const forbiddenTrustedFields = [
  'applicationNo',
  'schemaSnapshot',
  'processSnapshot',
  'applicantId',
  'applicantName',
  'applicantDepartmentId',
  'applicantDepartmentName',
];

function schemaPropertyNames(schema: unknown) {
  const candidate = schema as { properties?: Record<string, unknown> };
  return Object.keys(candidate.properties ?? {});
}

for (const schema of [createDraftBodySchema, updateDraftBodySchema, submitBodySchema]) {
  const propertyNames = schemaPropertyNames(schema);
  for (const field of forbiddenTrustedFields) {
    expect(propertyNames).not.toContain(field);
  }
}
```

**Serialization contract pattern** (`backend/src/modules/approval/__tests__/application.route.test.ts` lines 98-153):
```ts
const response = serializeApplicationListResponse({
  rows: [detail],
  total: 1,
  page: 2,
  size: 10,
});

expect(response).toEqual({
  rows: [
    expect.objectContaining({
      id: 17,
      applicationNo: 'APP-20260425-ABCDEFGH',
      status: 'APPROVING',
      templateName: '请假申请',
      templateVersion: 5,
      currentNodeName: '部门负责人审批',
      canCancel: true,
      submittedAt: '2026-04-25T08:00:00.000Z',
      updatedAt: '2026-04-25T08:00:00.000Z',
    }),
  ],
  total: 1,
  page: 2,
  size: 10,
});
```

**Apply to Phase 18:** assert `/approval/tasks` prefix, action body max-length/required-comment schemas, assignee-scoped response DTO serialization, and exclusion of server-trusted fields from approve/reject/comment bodies.

---

### `backend/src/modules/approval/__tests__/task.service.test.ts` (test, request-response)

**Primary analog:** `backend/src/modules/approval/__tests__/application-submission.service.test.ts`  
**Secondary analog:** `backend/src/modules/approval/__tests__/application.service.test.ts`

**Fixture + cleanup pattern** (`backend/src/modules/approval/__tests__/application-submission.service.test.ts` lines 32-149):
```ts
async function setupApplicationSubmissionFixture() {
  const department = await prisma.department.create({ data: { name: '研发部' } });
  const applicant = await prisma.user.create({ data: { /* ... */ } });
  const otherUser = await prisma.user.create({ data: { /* ... */ } });
  const approver = await prisma.user.create({ data: { /* ... */ } });
  const process = await prisma.approvalProcess.create({ data: { /* ... */ } });
  await prisma.approvalProcessNode.create({ data: { /* ... */ } });
  const template = await prisma.formTemplate.create({ data: { /* ... */ } });
  return { department, applicant, otherUser, approver, process, template };
}

async function cleanApprovalData() {
  await prisma.approvalTimelineEvent.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.approvalTask.deleteMany();
  await prisma.approvalApplication.deleteMany();
  await prisma.approvalProcessNode.deleteMany();
  await prisma.approvalProcess.deleteMany();
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
```

**Workflow assertions** (`backend/src/modules/approval/__tests__/application.service.test.ts` lines 229-318, 348-385):
```ts
await approveTask(firstTask.id, { id: approver1.id, name: approver1.realName }, '一级通过');
const secondTask = await prisma.approvalTask.findFirstOrThrow({
  where: { applicationId: submitted.id, status: 'PENDING' },
});
expect(secondTask.nodeOrder).toBe(2);

await expect(
  approveTask(task.id, { id: approver2.id, name: approver2.realName }, '越权通过'),
).rejects.toThrow('无权处理该审批任务');

await appendApplicationEvent({
  applicationId: application.id,
  actor,
  type: 'COMMENT',
  title: '内部备注',
  comment: '内部备注',
  payload: { text: '内部备注' },
});
expect(await timelineTypes(application.id)).toEqual(['COMMENT', 'MARK', 'EDIT']);
```

**Apply to Phase 18:** cover pending vs handled queries, assignee-only detail, approve/reject stale-task rejection, required reject comment, optional approve comment trimming, handled-history `CANCELED` treatment, and `COMMENT` append without `formData` mutation.

---

### `backend/src/modules/approval/__tests__/application-submission.service.test.ts` (modify existing visibility regression test)

**Analog:** `backend/src/modules/approval/__tests__/application-submission.service.test.ts`

**Current applicant-detail assertion block** (`backend/src/modules/approval/__tests__/application-submission.service.test.ts` lines 331-378):
```ts
it('returns own detail with snapshots, tasks, timeline, and applicant-only cancellation', async () => {
  const { applicant, otherUser, template } = await setupApplicationSubmissionFixture();
  const draft = await createApplicationDraft(
    { id: applicant.id, name: applicant.realName },
    { templateId: template.id, formData: validFormData },
  );
  const submitted = await submitDraftApplication(
    { id: applicant.id, name: applicant.realName },
    draft.id,
    validFormData,
  );

  const detail = await getOwnApplicationDetail({ id: applicant.id, name: applicant.realName }, submitted.id);
  expect(detail.schemaSnapshot).toEqual(requiredSchema);
  expect(detail.formData).toEqual(validFormData);
  expect(detail.timeline).toHaveLength(2);
  expect(detail.tasks).toHaveLength(1);
  expect(detail.canCancel).toBe(true);
  // ...
});
```

**Apply to Phase 18:** extend this existing test file instead of inventing a new applicant-visibility suite; add a `COMMENT` event first, then assert applicant detail hides it while task detail still exposes it.

---

### `frontend/src/types/approvalTask.ts` (model, transform)

**Analog:** `frontend/src/types/approvalApplication.ts`

**DTO shape pattern** (`frontend/src/types/approvalApplication.ts` lines 29-98):
```ts
export interface ApprovalApplicationRow {
  id: number;
  applicationNo: string;
  status: ApprovalApplicationStatus;
  templateId: number;
  templateName: string;
  templateVersion: number;
  processId: number | null;
  processName: string | null;
  applicantName: string;
  applicantDepartmentName: string | null;
  currentNodeOrder: number | null;
  currentNodeName: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canCancel: boolean;
}

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

export interface ApprovalTaskSummary {
  id: number;
  nodeOrder: number;
  nodeName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'SKIPPED';
  assigneeId: number;
  assigneeName: string;
  assignedAt: string;
  handledAt: string | null;
  comment: string | null;
}
```

**Helper pattern** (`frontend/src/types/approvalApplication.ts` lines 100-162):
```ts
export interface ApplicationListFilters {
  page?: number;
  size?: number;
  status?: ApplicationListStatusFilter;
  dateFrom?: string;
  dateTo?: string;
}

const STATUS_LABELS: Record<ApprovalApplicationStatus, string> = {
  DRAFT: '草稿',
  SUBMITTED: '审批中',
  APPROVING: '审批中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELED: '已撤销',
};

export function statusLabel(status: ApprovalApplicationStatus): string {
  return STATUS_LABELS[status];
}
```

**Apply to Phase 18:** keep all task DTOs, list filters, action payload types, payload-key constants, and task/application status helper functions in one types file; reuse the existing `ApprovalTimelineEvent` shape instead of redefining event records per page.

---

### `frontend/src/types/__tests__/approvalTask.test.ts` (test, transform)

**Analog:** `frontend/src/types/__tests__/approvalApplication.test.ts`

**Helper test pattern** (`frontend/src/types/__tests__/approvalApplication.test.ts` lines 14-96):
```ts
describe('approval application status helpers', () => {
  it('maps status labels according to the UI contract', () => {
    expect(statusLabel('DRAFT')).toBe('草稿');
    expect(statusLabel('SUBMITTED')).toBe('审批中');
    expect(statusLabel('APPROVING')).toBe('审批中');
    expect(statusLabel('APPROVED')).toBe('已通过');
    expect(statusLabel('REJECTED')).toBe('已驳回');
    expect(statusLabel('CANCELED')).toBe('已撤销');
  });

  it('documents payload keys without trusted snapshots or applicant identity', () => {
    for (const keys of [
      CREATE_DRAFT_PAYLOAD_KEYS,
      UPDATE_DRAFT_PAYLOAD_KEYS,
      SUBMIT_APPLICATION_PAYLOAD_KEYS,
    ]) {
      for (const field of forbidden) {
        expect(keys).not.toContain(field);
      }
    }
  });
});
```

**Apply to Phase 18:** mirror this style for task-status label/color helpers, handled-state helpers, reject/approve/comment payload key guards, and any `canHandleTask` / `isHandledTask` helpers.

---

### `frontend/src/stores/approvalTask.ts` (store, request-response)

**Analog:** `frontend/src/stores/approvalApplication.ts`

**State + async action pattern** (`frontend/src/stores/approvalApplication.ts` lines 11-121):
```ts
export const useApprovalApplicationStore = defineStore('approvalApplication', {
  state: () => ({
    templates: [] as AvailableApprovalTemplate[],
    rows: [] as ApprovalApplicationRow[],
    total: 0,
    loading: false,
    detailLoading: false,
    actionLoading: false,
    page: 1,
    size: 10,
    statusFilter: '' as ApplicationListFilters['status'],
    dateFrom: '',
    dateTo: '',
    current: null as ApprovalApplicationDetail | null,
  }),
  actions: {
    async fetchList(filters?: ApplicationListFilters) {
      this.loading = true;
      try {
        const requestParams: Record<string, unknown> = {
          page: filters?.page ?? this.page,
          size: filters?.size ?? this.size,
        };
        const status = filters?.status ?? this.statusFilter;
        if (status) requestParams.status = status;
        const dateFrom = filters?.dateFrom ?? this.dateFrom;
        if (dateFrom) requestParams.dateFrom = dateFrom;
        const dateTo = filters?.dateTo ?? this.dateTo;
        if (dateTo) requestParams.dateTo = dateTo;

        const { data } = await api.get('/approval/applications', { params: requestParams });
        this.rows = data.rows;
        this.total = data.total;
        if (data.page) this.page = Number(data.page);
        if (data.size) this.size = Number(data.size);
        return data;
      } finally {
        this.loading = false;
      }
    },
    async fetchDetail(id: number) {
      this.detailLoading = true;
      try {
        const { data } = await api.get(`/approval/applications/${id}`);
        this.current = data;
        return data as ApprovalApplicationDetail;
      } finally {
        this.detailLoading = false;
      }
    },
  },
});
```

**Apply to Phase 18:** keep one Pinia store with `rows/total/loading/detailLoading/actionLoading/page/size/current`; add separate task-mode filters (`pending` vs `handled`) and action methods for `approve/reject/comment` that update `current` and then let pages refresh list/detail datasets.

---

### `frontend/src/stores/__tests__/approvalTask.test.ts` (test, request-response)

**Analog:** `frontend/src/stores/__tests__/approvalApplication.test.ts`

**Mocked axios + state assertion pattern** (`frontend/src/stores/__tests__/approvalApplication.test.ts` lines 1-154):
```ts
vi.mock('src/boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('approval application store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
    mockedApi.put.mockReset();
  });

  it('fetches list with page, size, status, and date filters', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        rows: [row],
        total: 1,
        page: 2,
        size: 20,
      },
    });

    const store = useApprovalApplicationStore();
    store.page = 2;
    store.size = 20;
    await store.fetchList({
      status: 'IN_PROGRESS',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-25',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/approval/applications', {
      params: {
        page: 2,
        size: 20,
        status: 'IN_PROGRESS',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-25',
      },
    });
    expect(store.loading).toBe(false);
  });
});
```

**Apply to Phase 18:** keep endpoint wiring tests at store layer; assert `/approval/tasks`, `/approval/tasks/:id`, `/approve`, `/reject`, `/comment`; verify loading flags reset after failures.

---

### `frontend/src/pages/ApprovalTaskPage.vue` (component, request-response)

**Primary analog:** `frontend/src/pages/ApprovalApplicationPage.vue`  
**Secondary analog:** `frontend/src/components/FilterSheet.vue`

**Page shell + desktop/mobile branching** (`frontend/src/pages/ApprovalApplicationPage.vue` lines 1-58, 92-172):
```vue
<q-page padding class="approval-app-page">
  <div class="row items-center q-mb-md q-gutter-sm">
    <div class="text-h6">我的申请</div>
    <q-space />
    <q-btn v-if="isMobile" flat dense round icon="filter_list" aria-label="筛选我的申请" @click="filterDialog = true">
      <q-tooltip>筛选</q-tooltip>
    </q-btn>
  </div>

  <div v-if="isDesktop" class="application-filter row items-center q-gutter-sm q-mb-md">
    <q-btn-toggle
      v-model="store.statusFilter"
      toggle-color="primary"
      flat
      bordered
      :options="statusOptions"
      @update:model-value="applyFilters"
    />
    <!-- date filters -->
  </div>

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
  />

  <div v-else class="q-gutter-sm">
    <q-card
      v-for="row in store.rows"
      :key="row.id"
      flat
      bordered
      class="application-card cursor-pointer"
      @click="openApplication(row)"
    >
      <q-card-section>
        <div class="row items-start no-wrap q-gutter-sm">
          <div class="col min-width-0">
            <div class="text-subtitle1 wrap-text">{{ row.templateName }}</div>
            <div class="text-caption muted">申请编号：{{ row.applicationNo }}</div>
          </div>
          <ApplicationStatusChip :status="row.status" />
        </div>
      </q-card-section>
    </q-card>
  </div>
</q-page>
```

**Mobile filter sheet local-state pattern** (`frontend/src/components/FilterSheet.vue` lines 1-23, 25-63):
```vue
<q-dialog :model-value="modelValue" position="bottom" @update:model-value="$emit('update:modelValue', $event)">
  <q-card style="width: 100%; border-radius: 16px 16px 0 0">
    <div class="flex flex-center q-pt-sm q-pb-xs">
      <div style="width: 40px; height: 4px; border-radius: 2px; background: var(--oa-border)"></div>
    </div>
    <q-card-section class="q-gutter-md">
      <!-- local controls -->
    </q-card-section>
    <q-card-actions>
      <q-btn flat label="重置筛选" @click="onReset" />
      <q-space />
      <q-btn color="primary" label="应用筛选" @click="onApply" v-close-popup />
    </q-card-actions>
  </q-card>
</q-dialog>

watch(() => props.modelValue, (open) => {
  if (open) {
    local.keyword = props.keyword;
    local.departmentId = props.departmentId;
    local.status = props.status;
  }
});
```

**Script/load/pagination pattern** (`frontend/src/pages/ApprovalApplicationPage.vue` lines 276-393):
```ts
const firstLoading = ref(true);
const error = ref(false);
const filterDialog = ref(false);

const pagination = computed(() => ({
  page: store.page,
  rowsPerPage: store.size,
  rowsNumber: store.total,
}));

async function load() {
  try {
    await store.fetchList();
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    firstLoading.value = false;
  }
}

function onRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  store.page = props.pagination.page;
  store.size = props.pagination.rowsPerPage;
  load();
}

function applyFilters() {
  store.page = 1;
  filterDialog.value = false;
  load();
}
```

**Apply to Phase 18:** reuse this page skeleton for pending/handled tabs, loading/error/empty states, desktop `q-table`, mobile cards, and bottom filter sheet. Keep filter state in the page, not in a global store.

---

### `frontend/src/pages/ApprovalTaskDetailPage.vue` (component, request-response)

**Primary analog:** `frontend/src/pages/ApprovalApplicationDetailPage.vue`  
**Secondary analogs:** `frontend/src/pages/ApprovalApplicationFormPage.vue`, `frontend/src/pages/PublicFillPage.vue`

**Full-page detail layout + snapshot rendering** (`frontend/src/pages/ApprovalApplicationDetailPage.vue` lines 1-99, 217-295):
```vue
<q-page padding class="approval-detail-page">
  <div class="detail-wrapper">
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-btn flat dense round icon="arrow_back" aria-label="返回" @click="goBack">
        <q-tooltip>返回</q-tooltip>
      </q-btn>
      <div class="text-h6">申请详情</div>
      <ApplicationStatusChip v-if="detail" :status="detail.status" />
      <q-space />
    </div>

    <div v-else-if="detail" class="detail-grid">
      <div class="detail-main">
        <q-card flat bordered class="detail-section q-mb-md">
          <q-card-section>
            <div class="section-title">申请信息</div>
            <div class="summary-grid q-mt-md">
              <div><span class="muted">申请编号：</span>{{ detail.applicationNo }}</div>
              <div><span class="muted">申请类型：</span>{{ detail.templateName }} v{{ detail.templateVersion }}</div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="detail-section">
          <q-card-section>
            <div class="section-title q-mb-md">表单内容</div>
            <GridFormRenderer
              :schema="detail.schemaSnapshot"
              mode="print"
              :model-value="detail.formData"
            />
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
  </div>
</q-page>

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

  .detail-section :deep(.mode-print .print-cell) {
    overflow-wrap: anywhere;
  }
}
```

**Dialog pattern** (`frontend/src/pages/ApprovalApplicationDetailPage.vue` lines 102-129):
```vue
<q-dialog v-model="cancelDialog" persistent>
  <q-card class="cancel-dialog">
    <q-card-section class="text-h6">撤销申请</q-card-section>
    <q-card-section>
      <q-input
        v-model="cancelReason"
        outlined
        type="textarea"
        autogrow
        maxlength="200"
        counter
        label="撤销原因（选填）"
      />
    </q-card-section>
    <q-card-actions align="right" class="q-pa-md">
      <q-btn flat label="返回" :disable="canceling" v-close-popup />
      <q-btn color="negative" label="确认撤销" :loading="canceling" @click="confirmCancel" />
    </q-card-actions>
  </q-card>
</q-dialog>
```

**Mobile sticky action bar pattern** (`frontend/src/pages/ApprovalApplicationFormPage.vue` lines 74-90, 221-236 and `frontend/src/pages/PublicFillPage.vue` lines 234-244):
```vue
<div v-if="isMobile && detail" class="mobile-actions">
  <q-btn outline color="primary" label="保存草稿" :loading="saving" :disable="isBusy" @click="saveDraft" />
  <q-btn color="primary" label="提交申请" :loading="submitting" :disable="isBusy" @click="submitApplication" />
</div>

.mobile-actions {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: var(--oa-surface);
  border-top: 1px solid var(--oa-border);
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 10;
}

.mobile-actions .q-btn {
  min-height: 44px;
}
```

**Notify + refresh pattern** (`frontend/src/pages/ApprovalApplicationDetailPage.vue` lines 160-197):
```ts
async function load() {
  loading.value = true;
  try {
    detail.value = await store.fetchDetail(applicationId.value);
    error.value = false;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function confirmCancel() {
  canceling.value = true;
  try {
    await store.cancel(applicationId.value, cancelReason.value.trim() || undefined);
    Notify.create({ type: 'positive', message: '申请已撤销' });
    cancelDialog.value = false;
    cancelReason.value = '';
    await load();
    await store.fetchList();
  } finally {
    canceling.value = false;
  }
}
```

**Apply to Phase 18:** use `ApprovalApplicationDetailPage.vue` for the page skeleton and print layout; borrow sticky bottom action-bar styling from the form/fill pages for mobile approve/reject controls.

---

### `frontend/src/router/routes.ts` (route, request-response)

**Analog:** `frontend/src/router/routes.ts`

**Authenticated child-route pattern** (`frontend/src/router/routes.ts` lines 20-36):
```ts
{
  path: '/',
  component: () => import('layouts/MainLayout.vue'),
  redirect: '/dashboard',
  children: [
    { path: 'approval/processes', component: () => import('pages/ApprovalProcessPage.vue'), meta: { title: '流程配置', icon: 'rule', perm: 'approval:process:list' } },
    { path: 'approval/applications', component: () => import('pages/ApprovalApplicationPage.vue'), meta: { title: '我的申请', icon: 'assignment', perm: 'approval:application:own' } },
    { path: 'approval/applications/:id/edit', component: () => import('pages/ApprovalApplicationFormPage.vue'), meta: { title: '填写申请', perm: 'approval:application:create' } },
    { path: 'approval/applications/:id', component: () => import('pages/ApprovalApplicationDetailPage.vue'), meta: { title: '申请详情', perm: 'approval:application:own' } },
  ],
}
```

**Apply to Phase 18:** add `/approval/tasks` and `/approval/tasks/:id` here with `meta.perm: 'approval:task:list'`; do not reuse applicant-route permissions.

---

### `frontend/src/layouts/MainLayout.vue` (component, request-response)

**Analog:** `frontend/src/layouts/MainLayout.vue`

**Menu config pattern** (`frontend/src/layouts/MainLayout.vue` lines 156-176):
```ts
const allMenus: MenuConfig[] = [
  { path: '/dashboard', title: '首页', icon: 'dashboard', perm: '' },
  {
    title: '审批管理',
    icon: 'approval',
    children: [
      { path: '/approval/applications', title: '我的申请', icon: 'assignment', perm: 'approval:application:own' },
      { path: '/approval/processes', title: '流程配置', icon: 'rule', perm: 'approval:process:list' },
    ],
  },
];
```

**Permission filtering pattern** (`frontend/src/layouts/MainLayout.vue` lines 178-200):
```ts
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

const visibleMenus = computed(() => filterMenus(allMenus));
const flattenedVisibleMenus = computed(() => flattenMenus(visibleMenus.value));
```

**Drawer item rendering pattern** (`frontend/src/layouts/MainLayout.vue` lines 33-52, 60-87):
```vue
<template v-for="m in visibleMenus" :key="m.path ?? m.title">
  <q-expansion-item v-if="m.children" :icon="m.icon" :label="m.title" default-opened>
    <q-item
      v-for="child in m.children"
      :key="child.path"
      clickable
      v-ripple
      :to="child.path"
      active-class="text-primary"
      class="q-pl-xl"
    >
      <q-item-section avatar><q-icon :name="child.icon" /></q-item-section>
      <q-item-section>{{ child.title }}</q-item-section>
    </q-item>
  </q-expansion-item>
</template>
```

**Apply to Phase 18:** insert `待我审批` under `审批管理` in this array and let existing filter/render logic handle desktop drawer, mobile drawer, and mobile footer tabs automatically.

---

### `frontend/src/components/approval/ApplicationTimeline.vue` (component, transform)

**Analog:** `frontend/src/components/approval/ApplicationTimeline.vue`

**Timeline rendering pattern** (`frontend/src/components/approval/ApplicationTimeline.vue` lines 1-54):
```vue
<div class="application-timeline">
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
  <div v-else class="empty-timeline">暂无审批动态</div>
</div>

const orderedEvents = computed(() =>
  [...props.events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  ),
);

function eventTitle(event: ApprovalTimelineEvent) {
  if (event.type === 'SUBMIT') return '提交申请';
  if (event.type === 'ASSIGN') return `进入 ${event.nodeName || '审批节点'}`;
  if (event.type === 'APPROVE') return '审批通过';
  if (event.type === 'REJECT') return '审批驳回';
  if (event.type === 'CANCEL') return '撤销申请';
  return event.title;
}
```

**Wrapping pattern** (`frontend/src/components/approval/ApplicationTimeline.vue` lines 57-80):
```css
.application-timeline {
  overflow-wrap: anywhere;
}

.timeline-comment {
  margin-top: 8px;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
}

.empty-timeline {
  color: var(--oa-text-secondary);
  font-size: 14px;
  padding: 16px 0;
}
```

**Apply to Phase 18:** extend this component in place for `COMMENT -> 内部备注` and the new copy contract, but preserve oldest-to-newest sorting and `white-space: pre-wrap`.

---

### `frontend/src/pages/__tests__/ApprovalTaskDetailPage.test.ts` (optional test, request-response)

**Closest analog:** none

No existing page-level tests live under `frontend/src/pages/__tests__`. If planner chooses this optional test, it will need a new mount pattern using Vitest + `@vue/test-utils`; borrow mocking style from store tests, but there is no direct in-repo page test analog to copy.

## Shared Patterns

### Authentication / Permission Gate
**Source:** `backend/src/middlewares/auth.ts` lines 6-52  
**Apply to:** `backend/src/modules/approval/task.route.ts`
```ts
export const authGuard = (requiredPerm?: string) =>
  new Elysia({ name: `auth-guard-${requiredPerm ?? 'any'}` })
    .derive({ as: 'scoped' }, async ({ accessJwt, headers }: any) => {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) throw unauthorized();
      const token = auth.slice(7);
      const payload = await accessJwt.verify(token);
      if (!payload || !payload.sub) throw unauthorized('令牌无效');
      if (payload.type !== 'access') throw unauthorized('请使用 access token');
      // ...
      if (requiredPerm && !roleCodes.includes('ADMIN') && !permCodes.has(requiredPerm)) {
        throw forbidden(`缺少权限: ${requiredPerm}`);
      }
      return {
        currentUser: {
          id: user.id,
          username: user.username,
          realName: user.realName,
          roleCodes,
          permissions: Array.from(permCodes),
        },
      };
    });
```

### Business Errors
**Source:** `backend/src/utils/errors.ts` lines 1-14  
**Apply to:** all new backend route/service files
```ts
export class BizError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'BIZ_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const unauthorized = (msg = '未登录或登录已过期') => new BizError(msg, 401, 'UNAUTHORIZED');
export const forbidden = (msg = '无权限访问') => new BizError(msg, 403, 'FORBIDDEN');
export const notFound = (msg = '资源不存在') => new BizError(msg, 404, 'NOT_FOUND');
```

### Transactional Approval Writes
**Source:** `backend/src/modules/approval/application.service.ts` lines 92-115, 220-315, 440-454  
**Apply to:** `backend/src/modules/approval/task.service.ts`
```ts
async function createActionAndTimeline(tx: ApprovalEventClient, input: AppendApplicationEventInput): Promise<void> {
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
  await tx.approvalTimelineEvent.create({
    data: {
      ...base,
      title: input.title,
    },
  });
}
```

### Frontend Permission Checks
**Source:** `frontend/src/boot/perm.ts` lines 5-18 and `frontend/src/stores/auth.ts` lines 60-64  
**Apply to:** task-page buttons, menu entries, task-detail action area
```ts
function applyPerm(el: HTMLElement, binding: any) {
  const auth = useAuthStore();
  const code = binding.value as string | string[];
  const codes = Array.isArray(code) ? code : [code];
  const has = codes.some((c) => auth.hasPerm(c));
  el.style.display = has ? '' : 'none';
}

hasPerm(code: string): boolean {
  if (!this.user) return false;
  if (this.user.roles.includes('ADMIN')) return true;
  return this.user.permissions.includes(code);
}
```

### Responsive Branching
**Source:** `frontend/src/composables/useResponsive.ts` lines 4-9  
**Apply to:** `ApprovalTaskPage.vue`, `ApprovalTaskDetailPage.vue`
```ts
export function useResponsive() {
  const $q = useQuasar();
  const isDesktop = computed(() => $q.screen.gt.sm);
  const isMobile = computed(() => !$q.screen.gt.sm);
  return { isDesktop, isMobile };
}
```

### Empty State
**Source:** `frontend/src/components/EmptyState.vue` lines 1-24  
**Apply to:** pending empty, handled empty, template/remark fallback states
```vue
<div class="flex flex-center" style="padding: 48px 16px">
  <div class="text-center">
    <q-icon :name="icon" size="64px" style="color: var(--oa-text-tertiary)" />
    <div class="q-mt-md" style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)">
      {{ title }}
    </div>
    <div class="q-mt-sm" style="font-size: 14px; color: var(--oa-text-secondary)">
      {{ description }}
    </div>
    <q-btn v-if="ctaText" color="primary" :label="ctaText" class="q-mt-md" @click="$emit('action')" />
  </div>
</div>
```

### Status Chip Styling
**Source:** `frontend/src/components/approval/ApplicationStatusChip.vue` lines 1-26  
**Apply to:** any new `ApprovalTaskStatusChip.vue` or inline task-chip extraction
```vue
<q-chip
  dense
  square
  :color="chipColor"
  text-color="white"
  :label="label"
  class="application-status-chip"
/>

const label = computed(() => statusLabel(props.status));
const chipColor = computed(() => (statusColor(props.status) === 'grey' ? 'grey-5' : statusColor(props.status)));
```

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/pages/__tests__/ApprovalTaskDetailPage.test.ts` | test | request-response | The repo currently has no page-level Vue tests under `frontend/src/pages/__tests__`; planner must introduce the mount/setup pattern from scratch if it wants automated sticky-bar coverage. |

## Metadata

**Analog search scope:** `backend/src/modules/approval`, `backend/src/middlewares`, `backend/src/utils`, `backend/src/index.ts`, `frontend/src/pages`, `frontend/src/stores`, `frontend/src/types`, `frontend/src/components/approval`, `frontend/src/components`, `frontend/src/layouts`, `frontend/src/router`, `frontend/src/boot`, `frontend/src/composables`, `.planning/phases/17-my-applications-dynamic-submission`, `.planning/phases/18-approval-task-inbox-mobile-approval`  
**Files scanned:** 77  
**Pattern extraction date:** 2026-04-26
