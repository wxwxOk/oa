# Phase 16: 流程配置与模板绑定 - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 23
**Analogs found:** 23 / 23

## Project Context Applied

- `AGENTS.md` / `CLAUDE.md`: not present in repository root.
- Project skill index found: `.claude/skills/ui-ux-pro-max/SKILL.md`. Apply its relevant UI guidance to frontend plans: accessible form labels/errors, 44px touch targets, visible focus states, responsive layouts, no emoji icons, stable hover states, and Quasar-native controls.
- Semantic code index failed to initialize, so analog search used `rg --files`, targeted `rg -n`, and read-only file inspection.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/prisma/schema.prisma` | model | CRUD | `backend/prisma/schema.prisma` existing `FormTemplate`, `Department`, approval models | exact |
| `backend/prisma/migrations/*_add_process_config_template_binding/migration.sql` | migration | batch | `backend/prisma/migrations/20260425090000_add_approval_models/migration.sql` | exact |
| `backend/src/index.ts` | config | request-response | `backend/src/index.ts` module registration | exact |
| `backend/prisma/seed.ts` | config | batch | `backend/prisma/seed.ts` permission/role seed | exact |
| `backend/src/modules/approval/process.route.ts` | route/controller | CRUD, request-response | `backend/src/modules/template/template.route.ts`; child-row replace from `backend/src/modules/role/role.route.ts` | role-match |
| `backend/src/modules/approval/process-config.service.ts` | service | transform, CRUD, request-response | `backend/src/modules/approval/application.service.ts` | role-match |
| `backend/src/modules/approval/__tests__/process-config.service.test.ts` | test | batch | `backend/src/modules/approval/__tests__/application.service.test.ts` | exact |
| `backend/src/modules/template/template.route.ts` | route/controller | CRUD, request-response | same file current template CRUD | exact |
| `backend/src/modules/template/schema.validation.ts` | utility | transform | same file current TypeBox schema validation | exact |
| `backend/src/modules/template/__tests__/schema.validation.test.ts` | test | batch | same file current TypeBox tests | exact |
| `backend/src/modules/template/__tests__/template.approval-mode.test.ts` | test | request-response, CRUD | `backend/src/modules/approval/__tests__/application.service.test.ts` | role-match |
| `backend/src/modules/public/public.route.ts` | route/controller | request-response | same file current public submit route | exact |
| `backend/src/modules/department/department.route.ts` | route/controller | CRUD, request-response | same file current department CRUD/tree | exact |
| `frontend/src/stores/approvalProcess.ts` | store | CRUD, request-response | `frontend/src/stores/template.ts` | exact |
| `frontend/src/pages/ApprovalProcessPage.vue` | component | CRUD, request-response | `frontend/src/pages/RolePage.vue`; selectors from `UserPage.vue` | role-match |
| `frontend/src/stores/template.ts` | store | CRUD, request-response | same file current template store | exact |
| `frontend/src/pages/TemplatePage.vue` | component | CRUD, request-response | same file current table/card/actions | exact |
| `frontend/src/pages/FormDesignerPage.vue` | component | transform, request-response | same file current designer save/publish flow | exact |
| `frontend/src/pages/DepartmentPage.vue` | component | CRUD, request-response | same file current tree/dialog/save flow | exact |
| `frontend/src/router/routes.ts` | route config | request-response | same file guarded route metadata | exact |
| `frontend/src/layouts/MainLayout.vue` | component/config | request-response | same file permission-filtered menus | exact |
| `frontend/src/components/renderer/FieldRenderer.vue` | component | transform | same file required validation | exact |
| `frontend/src/components/renderer/GridFormRenderer.vue` | component | transform | same file field traversal/validation | exact |

## Pattern Assignments

### `backend/prisma/schema.prisma` (model, CRUD)

**Analog:** `backend/prisma/schema.prisma`

**Template model extension point** (lines 95-119):
```prisma
enum TemplateStatus {
  DRAFT
  PUBLISHED
  OFFLINE
}

model FormTemplate {
  id                   Int                   @id @default(autoincrement())
  name                 String
  description          String?
  schema               Json                  @default("[]")
  schemaVersion        Int                   @default(1)
  status               TemplateStatus        @default(DRAFT)
  requireIdentity      Boolean               @default(false)
  creatorId            Int
  creator              User                  @relation(fields: [creatorId], references: [id])
  shareLinks           ShareLink[]
  submissions          Submission[]
  approvalApplications ApprovalApplication[]
```

**Department relation extension point** (lines 43-54):
```prisma
model Department {
  id                   Int                   @id @default(autoincrement())
  name                 String
  parentId             Int?
  parent               Department?           @relation("DeptTree", fields: [parentId], references: [id])
  children             Department[]          @relation("DeptTree")
  sort                 Int                   @default(0)
  users                User[]
  approvalApplications ApprovalApplication[]

  @@index([parentId])
}
```

**Approval process/node shape to preserve** (lines 149-188):
```prisma
enum ApprovalApproverSourceType {
  USER
  ROLE
  DEPARTMENT_MANAGER
}

model ApprovalProcess {
  id           Int                   @id @default(autoincrement())
  name         String
  description  String?
  isActive     Boolean               @default(true)
  creatorId    Int
  creator      User                  @relation(fields: [creatorId], references: [id])
  nodes        ApprovalProcessNode[]
  applications ApprovalApplication[]
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt

  @@index([creatorId])
  @@index([isActive])
}
```

Planner should add `TemplateBusinessMode`, `businessMode`, `approvalProcessId`, template-to-process relation, department default approver relation, and indexes in this same style.

---

### `backend/prisma/migrations/*_add_process_config_template_binding/migration.sql` (migration, batch)

**Analog:** `backend/prisma/migrations/20260425090000_add_approval_models/migration.sql`

**Enum/table pattern** (lines 1-39):
```sql
-- CreateEnum
CREATE TYPE "ApprovalApproverSourceType" AS ENUM ('USER', 'ROLE', 'DEPARTMENT_MANAGER');

-- CreateTable
CREATE TABLE "ApprovalProcess" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creatorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalProcess_pkey" PRIMARY KEY ("id")
);
```

**Index/foreign-key pattern** (lines 122-135, 197-207):
```sql
CREATE INDEX "ApprovalProcess_creatorId_idx" ON "ApprovalProcess"("creatorId");
CREATE INDEX "ApprovalProcess_isActive_idx" ON "ApprovalProcess"("isActive");
CREATE UNIQUE INDEX "ApprovalProcessNode_processId_order_key" ON "ApprovalProcessNode"("processId", "order");

ALTER TABLE "ApprovalProcess" ADD CONSTRAINT "ApprovalProcess_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

### `backend/src/index.ts` (config, request-response)

**Analog:** `backend/src/index.ts`

**Imports and global error handling** (lines 1-15, 49-58):
```typescript
import { BizError } from './utils/errors';
import { formTemplateModule } from './modules/template/template.route';
import { publicFillModule } from './modules/public/public.route';

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

**API module registration** (lines 60-75):
```typescript
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
        .use(formTemplateModule)
        .use(submissionModule)
        .use(formStatsModule)
        .use(shareLinkStatsModule),
    )
    .use(publicFillModule),
)
```

Register `approvalProcessModule` under `/api/v1` with the authenticated internal modules, not beside the public fill route.

---

### `backend/prisma/seed.ts` (config, batch)

**Analog:** `backend/prisma/seed.ts`

**Permission definition pattern** (lines 7-36):
```typescript
const PERMISSIONS = [
  { code: 'department:list', name: '部门列表', module: 'department' },
  { code: 'role:assign-permission', name: '分配权限', module: 'role' },
  { code: 'form:template:list', name: '模板列表', module: 'form' },
  { code: 'form:link-stats:view', name: '查看分享链接统计', module: 'form' },
];
```

**Idempotent upsert and role assignment** (lines 41-79):
```typescript
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

Add approval permission codes to `PERMISSIONS`; keep ADMIN as all permissions. Replace the broad employee `endsWith(':list')` assumption for approval by explicitly granting `approval:application:create` and `approval:application:own`.

---

### `backend/src/modules/approval/process.route.ts` (route/controller, CRUD + request-response)

**Analogs:** `backend/src/modules/template/template.route.ts`, `backend/src/modules/role/role.route.ts`

**Imports and route guard pattern** (template.route.ts lines 1-9):
```typescript
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { authGuard } from '../../middlewares/auth';
import { BizError, notFound } from '../../utils/errors';

export const formTemplateModule = new Elysia({ prefix: '/templates' })
  .use(authGuard('form:template:list'))
```

**Paginated list pattern** (template.route.ts lines 10-26):
```typescript
.get('/', async ({ query }: any) => {
  const page = Number(query.page) || 1;
  const size = Number(query.size) || 10;
  const where: any = {};
  if (query.status) where.status = query.status;
  const [rows, total] = await Promise.all([
    prisma.formTemplate.findMany({
      where,
      include: { creator: { select: { id: true, realName: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.formTemplate.count({ where }),
  ]);
  return { rows, total, page, size };
})
```

**Guarded mutation + TypeBox body pattern** (template.route.ts lines 36-49):
```typescript
.guard({}, (app) =>
  app.use(authGuard('form:template:create')).post(
    '/',
    async ({ body, currentUser }: any) =>
      prisma.formTemplate.create({
        data: { name: body.name, description: body.description, creatorId: currentUser.id },
      }),
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 50 }),
        description: t.Optional(t.String()),
      }),
    },
  ),
)
```

**Replace child rows pattern** (role.route.ts lines 59-80):
```typescript
app.use(authGuard('role:assign-permission')).put(
  '/:id/permissions',
  async ({ params, body }: any) => {
    const roleId = Number(params.id);
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (body.permissionIds.length) {
      await prisma.rolePermission.createMany({
        data: body.permissionIds.map((permissionId: number) => ({ roleId, permissionId })),
      });
    }
    return { ok: true };
  },
  {
    params: t.Object({ id: t.String() }),
    body: t.Object({ permissionIds: t.Array(t.Number()) }),
  },
)
```

Use a transaction for process create/update and node replacement, borrowing transaction shape from `application.service.ts`.

---

### `backend/src/modules/approval/process-config.service.ts` (service, transform + request-response)

**Analog:** `backend/src/modules/approval/application.service.ts`

**Typed snapshot contracts** (lines 1-32):
```typescript
import type { ApprovalActionType, ApprovalApplication, ApprovalTask, Prisma } from '@prisma/client';

export type ApprovalSnapshotNode = {
  order: number;
  name: string;
  approverSourceType: 'USER' | 'ROLE' | 'DEPARTMENT_MANAGER';
  approverUserId?: number | null;
  approverRoleId?: number | null;
  assigneeId: number;
  assigneeName: string;
  approverSourceLabel?: string;
};

export type ApprovalProcessSnapshot = {
  processId?: number | null;
  processName?: string | null;
  nodes: ApprovalSnapshotNode[];
};
```

**JSON snapshot helper and invalid snapshot error** (lines 70-90):
```typescript
function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getProcessNodes(snapshot: Prisma.JsonValue | ApprovalProcessSnapshot): ApprovalSnapshotNode[] {
  const candidate = snapshot as ApprovalProcessSnapshot;
  if (!Array.isArray(candidate.nodes) || candidate.nodes.length === 0) {
    throw new BizError('审批流程快照缺少节点', 400, 'INVALID_APPROVAL_PROCESS_SNAPSHOT');
  }

  return [...candidate.nodes].sort((a, b) => a.order - b.order);
}
```

**Transaction + first task creation pattern** (lines 156-193):
```typescript
export async function submitApplication(
  applicationId: number,
  actor: ApprovalActor,
): Promise<ApprovalApplicationWithTasks> {
  return prisma.$transaction(async (tx) => {
    const application = await tx.approvalApplication.findUnique({
      where: { id: applicationId },
      include: { tasks: true },
    });
    if (!application) {
      throw notFound('审批申请不存在');
    }

    const [firstNode] = getProcessNodes(application.processSnapshot);
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
```

**Action/timeline double-write pattern** (lines 92-115):
```typescript
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

Use this service style for `validateProcessDefinition`, `resolveProcessSnapshot`, and `resolveDepartmentApprover`: typed inputs, deterministic sorting by node order, explicit `BizError` codes, and all submission-time resolution inside one transaction.

---

### `backend/src/modules/approval/__tests__/process-config.service.test.ts` (test, batch)

**Analog:** `backend/src/modules/approval/__tests__/application.service.test.ts`

**Fixture setup pattern** (lines 30-95):
```typescript
async function setupApprovalFixture() {
  const department = await prisma.department.create({ data: { name: '研发部' } });

  const applicant = await prisma.user.create({
    data: { username: 'applicant', password: 'hashed-password', realName: '申请人', departmentId: department.id },
  });

  const process = await prisma.approvalProcess.create({
    data: { name: '请假审批流程', creatorId: applicant.id },
  });

  await prisma.approvalProcessNode.createMany({
    data: [
      { processId: process.id, name: '部门负责人审批', order: 1, approverSourceType: 'USER', approverUserId: approver1.id },
      { processId: process.id, name: '总经理审批', order: 2, approverSourceType: 'USER', approverUserId: approver2.id },
    ],
  });
```

**Cleanup order pattern** (lines 166-187):
```typescript
beforeEach(async () => {
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
});
```

**Async rejection/rollback pattern** (lines 305-345):
```typescript
await expect(approveTask(task.id, { id: approver2.id, name: approver2.realName }, '越权通过'))
  .rejects.toThrow('无权处理该审批任务');

const unchangedTask = await prisma.approvalTask.findUniqueOrThrow({ where: { id: task.id } });
expect(unchangedTask.status).toBe('PENDING');
```

---

### `backend/src/modules/template/template.route.ts` (route/controller, CRUD + request-response)

**Analog:** same file

**Update schema version only on schema changes** (lines 51-80):
```typescript
// Update: if PUBLISHED and schema changed, bump schemaVersion
.guard({}, (app) =>
  app.use(authGuard('form:template:edit')).put(
    '/:id',
    async ({ params, body }: any) => {
      const id = Number(params.id);
      const tpl = await prisma.formTemplate.findUnique({ where: { id } });
      if (!tpl) throw notFound('模板不存在');
      const data: any = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.description !== undefined) data.description = body.description;
      if (body.schema !== undefined) {
        data.schema = body.schema;
        if (tpl.status === 'PUBLISHED') {
          data.schemaVersion = tpl.schemaVersion + 1;
        }
      }
      if (body.requireIdentity !== undefined) data.requireIdentity = body.requireIdentity;
      return prisma.formTemplate.update({ where: { id }, data });
    },
```

**Publish/offline transition guard** (lines 93-121):
```typescript
.guard({}, (app) =>
  app.use(authGuard('form:template:publish')).patch(
    '/:id/status',
    async ({ params, body }: any) => {
      const id = Number(params.id);
      const tpl = await prisma.formTemplate.findUnique({ where: { id } });
      if (!tpl) throw notFound('模板不存在');
      const transitions: Record<string, string> = {
        DRAFT: 'PUBLISHED',
        PUBLISHED: 'OFFLINE',
        OFFLINE: 'PUBLISHED',
      };
      const target = body.action === 'publish' ? 'PUBLISHED' : 'OFFLINE';
      if (transitions[tpl.status] !== target) {
        throw new BizError(`当前状态 ${tpl.status} 不可转为 ${target}`);
      }
```

**Share-link creation block point** (lines 123-143):
```typescript
app.use(authGuard('form:template:share')).post(
  '/:id/share-links',
  async ({ params, currentUser }: any) => {
    const templateId = Number(params.id);
    const tpl = await prisma.formTemplate.findUnique({ where: { id: templateId } });
    if (!tpl) throw notFound('模板不存在');
    if (tpl.status !== 'PUBLISHED') throw new BizError('仅已发布模板可生成分享链接');
    const link = await prisma.shareLink.create({
      data: { code: nanoid(12), templateId, creatorId: currentUser.id },
    });
    return link;
  },
)
```

Extend this route rather than creating template-binding routes elsewhere. Binding fields must not bump `schemaVersion`; schema changes still must.

---

### `backend/src/modules/template/schema.validation.ts` (utility, transform)

**Analog:** same file

**TypeBox schema style** (lines 1-22):
```typescript
import { t } from 'elysia';

const FieldType = t.Union([
  t.Literal('text'),
  t.Literal('textarea'),
  t.Literal('radio'),
  t.Literal('checkbox'),
  t.Literal('date'),
  t.Literal('phone'),
  t.Literal('signature'),
]);

const SchemaField = t.Object({
  id: t.String(),
  type: FieldType,
  label: t.String(),
  required: t.Boolean(),
  colSpan: t.Integer({ minimum: 1, maximum: 12 }),
```

**Schema item union/export pattern** (lines 61-66):
```typescript
const SchemaItem = t.Union([SchemaRow, SchemaGroup, SchemaDynamicTable]);

export const SchemaV2Body = t.Object({
  version: t.Literal(2),
  items: t.Array(SchemaItem),
});
```

Add `validateFormDataRequiredFields(schema, data)` here as a pure exported validator beside `SchemaV2Body`. Reuse frontend `flattenFields` semantics but implement locally in backend.

---

### `backend/src/modules/template/__tests__/schema.validation.test.ts` (test, batch)

**Analog:** same file

**TypeBox value-check test pattern** (lines 1-18):
```typescript
import { describe, it, expect } from 'bun:test';
import { Value } from '@sinclair/typebox/value';
import { SchemaV2Body } from '../schema.validation';

describe('SchemaV2Body validation', () => {
  it('accepts valid v2 schema with row items', () => {
    const payload = {
      version: 2,
      items: [
        {
          type: 'row',
          fields: [
            { id: 'f1', type: 'text', label: 'Name', required: true, colSpan: 6 },
          ],
        },
      ],
    };
    expect(Value.Check(SchemaV2Body, payload)).toBe(true);
```

**Negative validation pattern** (lines 65-105):
```typescript
it('rejects colSpan outside 1-12 range', () => {
  const payload = {
    version: 2,
    items: [{ type: 'row', fields: [{ id: 'f1', type: 'text', label: 'X', required: true, colSpan: 0 }] }],
  };
  expect(Value.Check(SchemaV2Body, payload)).toBe(false);
});

it('rejects missing required field in SchemaField', () => {
  const payload = {
    version: 2,
    items: [{ type: 'row', fields: [{ id: 'f1', type: 'text', label: 'X', colSpan: 6 }] }],
  };
  expect(Value.Check(SchemaV2Body, payload)).toBe(false);
});
```

Add direct tests for required text, textarea, date, phone, radio, checkbox, signature, optional missing fields, and dynamic-table non-enforcement.

---

### `backend/src/modules/template/__tests__/template.approval-mode.test.ts` (test, request-response + CRUD)

**Analog:** `backend/src/modules/approval/__tests__/application.service.test.ts`

**Snapshot/state assertion style** (lines 189-227):
```typescript
it('creates a draft application with schema and process snapshots', async () => {
  const { draftInput, processSnapshot, template, applicant, department } = await setupApprovalFixture();

  const application = await createDraftApplication(draftInput);

  expect(application.status).toBe('DRAFT');
  expect(application.schemaSnapshot).toEqual(formSchema);
  expect(application.processSnapshot).toEqual(processSnapshot);
  expect(application.templateName).toBe(template.name);
  expect(application.templateVersion).toBe(template.schemaVersion);
});
```

Use the same fixture/cleanup shape to cover template default `COLLECTION_ONLY`, publish validation, share-link rejection for approval-required templates, explicit disconnect confirmation, and `schemaVersion` bump boundaries.

---

### `backend/src/modules/public/public.route.ts` (route/controller, request-response)

**Analog:** same file

**Public route has no authGuard and returns limited template fields** (lines 1-35):
```typescript
import { Elysia, t } from 'elysia';
import { prisma } from '../../plugins/prisma';
import { notFound, BizError } from '../../utils/errors';

export const publicFillModule = new Elysia({ prefix: '/public/f' })
  .get('/:code', async ({ params }: any) => {
    const link = await prisma.shareLink.findUnique({
      where: { code: params.code },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            schema: true,
            schemaVersion: true,
            status: true,
            requireIdentity: true,
          },
        },
      },
    });
```

**Submit validation before create** (lines 40-65):
```typescript
const link = await prisma.shareLink.findUnique({
  where: { code: params.code },
  include: { template: true },
});
if (!link) throw notFound('链接无效');
if (link.template.status !== 'PUBLISHED') {
  throw new BizError('该表单已停止收集', 410, 'TEMPLATE_OFFLINE');
}
if (link.template.requireIdentity) {
  if (!body.submitterName?.trim()) throw new BizError('请输入姓名');
  if (!/^1\d{10}$/.test(body.submitterPhone ?? '')) throw new BizError('请输入有效手机号');
}
const submission = await prisma.submission.create({
  data: {
    data: body.data,
    schemaVersion: link.template.schemaVersion,
```

Call the new required-field validator here before `submission.create`; also reject `APPROVAL_REQUIRED` templates in public lookup/submit if a share link somehow exists.

---

### `backend/src/modules/department/department.route.ts` (route/controller, CRUD + request-response)

**Analog:** same file

**Tree build pattern** (lines 6-28):
```typescript
type DeptNode = {
  id: number;
  name: string;
  parentId: number | null;
  sort: number;
  children: DeptNode[];
};

function buildTree(rows: { id: number; name: string; parentId: number | null; sort: number }[]): DeptNode[] {
  const map = new Map<number, DeptNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: DeptNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  });
```

**CRUD guards and validation** (lines 48-87):
```typescript
export const departmentModule = new Elysia({ prefix: '/departments' })
  .use(authGuard('department:list'))
  .get('/', async () => prisma.department.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] }))
  .get('/tree', async () => {
    const rows = await prisma.department.findMany({ select: { id: true, name: true, parentId: true, sort: true } });
    return buildTree(rows);
  })
  .guard({}, (app) =>
    app
      .use(authGuard('department:create'))
      .post('/', async ({ body }: any) => prisma.department.create({ data: body }), {
        body: t.Object({
          name: t.String({ minLength: 1 }),
          parentId: t.Optional(t.Nullable(t.Number())),
          sort: t.Optional(t.Number()),
        }),
      }),
  )
```

Add `defaultApproverId` and selected `defaultApprover` to list/tree rows. Preserve parent cycle validation when updating.

---

### `frontend/src/stores/approvalProcess.ts` (store, CRUD + request-response)

**Analog:** `frontend/src/stores/template.ts`

**Pinia store and API import pattern** (lines 1-23):
```typescript
import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import type { SchemaV2, SchemaField, SchemaGroup, SchemaDynamicTable } from 'src/types/schema';

export interface Template {
  id: number;
  name: string;
  description: string | null;
  schema: SchemaV2;
  schemaVersion: number;
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE';
  requireIdentity: boolean;
  creatorId: number;
  creator: { id: number; realName: string };
  createdAt: string;
  updatedAt: string;
}

export const useTemplateStore = defineStore('template', {
```

**List/create/update/status action pattern** (lines 54-91):
```typescript
async fetchList() {
  this.loading = true;
  try {
    const params: Record<string, unknown> = { page: this.page, size: this.size };
    if (this.statusFilter) params.status = this.statusFilter;
    const { data } = await api.get('/templates', { params });
    this.rows = data.rows;
    this.total = data.total;
  } finally {
    this.loading = false;
  }
},
async fetchOne(id: number) {
  const { data } = await api.get(`/templates/${id}`);
  this.current = data;
  return data;
},
async update(id: number, payload: { name?: string; description?: string; schema?: SchemaV2; requireIdentity?: boolean }) {
  const { data } = await api.put(`/templates/${id}`, payload);
  if (this.current?.id === id) this.current = data;
  return data;
},
```

Use `/approval/processes` endpoints, keep `loading/page/size/current`, and expose `validateProcess`/`changeStatus` actions.

---

### `frontend/src/pages/ApprovalProcessPage.vue` (component, CRUD + request-response)

**Analogs:** `frontend/src/pages/RolePage.vue`, `frontend/src/pages/UserPage.vue`

**Desktop split layout + permission buttons** (RolePage.vue lines 9-74):
```vue
<template v-if="isDesktop">
  <div class="row q-gutter-md">
    <q-list bordered class="col-12 col-md-4" style="border-radius: 6px; background: var(--oa-surface)">
      <q-item v-for="r in roles" :key="r.id" clickable :active="selected?.id === r.id" @click="selectRole(r)">
        <q-item-section>
          <q-item-label>{{ r.name }}</q-item-label>
          <q-item-label caption>{{ r.code }} · 成员: {{ r._count?.users ?? 0 }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn v-perm="'role:update'" size="sm" flat dense icon="edit" @click.stop="openEdit(r)" />
          <q-btn v-perm="'role:delete'" size="sm" flat dense icon="delete" color="negative" @click.stop="onDelete(r)" />
        </q-item-section>
      </q-item>
    </q-list>
```

**Mobile detail/list switch pattern** (RolePage.vue lines 77-112):
```vue
<template v-if="isMobile">
  <div v-if="mobileView === 'permissions' && selected">
    <div class="row items-center q-mb-md">
      <q-btn flat icon="arrow_back" label="返回角色列表" @click="mobileView = 'list'" />
    </div>
    <div style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)" class="q-mb-md">
      {{ selected.name }} 的权限
    </div>
  </div>
  <div v-else>
    <q-list v-else bordered style="border-radius: 8px; background: var(--oa-surface)">
      <q-item v-for="r in roles" :key="r.id" clickable @click="selectRoleMobile(r)">
```

**Selectors and lazy metadata** (UserPage.vue lines 160-166, 285-304):
```vue
<q-select v-model="form.departmentId" :options="deptOptions" label="部门" outlined emit-value map-options clearable />
<q-select v-model="form.roleIds" :options="roleOptions" label="角色" outlined multiple emit-value map-options />
```
```typescript
async function loadDialogMeta() {
  const tasks: Array<Promise<void>> = [];
  if (auth.hasPerm('role:list')) {
    tasks.push(
      api.get('/roles').then(({ data }) => {
        roleOptions.value = data.map((x: any) => ({ label: x.name, value: x.id }));
      }),
    );
  }
  await Promise.all(tasks);
}
```

Use ordered node rows/forms, not a canvas. Use Quasar `q-select`, `q-toggle`, `q-btn`, clear validation messages, and `v-perm` on create/update/delete/status actions.

---

### `frontend/src/stores/template.ts` (store, CRUD + request-response)

**Analog:** same file

**Template interface extension point** (lines 9-21):
```typescript
export interface Template {
  id: number;
  name: string;
  description: string | null;
  schema: SchemaV2;
  schemaVersion: number;
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE';
  requireIdentity: boolean;
  creatorId: number;
  creator: { id: number; realName: string };
  createdAt: string;
  updatedAt: string;
}
```

**Update action extension point** (lines 75-79):
```typescript
async update(id: number, payload: { name?: string; description?: string; schema?: SchemaV2; requireIdentity?: boolean }) {
  const { data } = await api.put(`/templates/${id}`, payload);
  if (this.current?.id === id) this.current = data;
  return data;
},
```

Add `businessMode`, `approvalProcessId`, optional `approvalProcess` summary, and confirmation flag support without changing existing list/share methods for collection-only templates.

---

### `frontend/src/pages/TemplatePage.vue` (component, CRUD + request-response)

**Analog:** same file

**Toolbar/filter pattern** (lines 1-25):
```vue
<q-page padding>
  <div class="row items-center q-mb-md">
    <div class="text-h6">模板管理</div>
    <q-space />
    <q-btn v-perm="'form:template:create'" color="primary" icon="add" label="创建模板" @click="openCreate" />
  </div>

  <div class="row items-center q-gutter-sm q-mb-md">
    <q-btn-toggle
      v-model="store.statusFilter"
      toggle-color="primary"
      flat
      bordered
      :options="[
        { label: '全部', value: '' },
        { label: '草稿', value: 'DRAFT' },
```

**Desktop action buttons** (lines 95-132):
```vue
<template #body-cell-actions="props">
  <q-td :props="props">
    <q-btn v-perm="'form:template:edit'" size="sm" flat dense icon="edit_note"
      @click="$router.push(`/templates/${props.row.id}/design`)" />
    <q-btn v-if="props.row.status === 'PUBLISHED'" v-perm="'form:template:share'"
      size="sm" flat dense icon="share" color="primary" @click="openShare(props.row)" />
    <q-btn v-perm="'form:submission:list'" size="sm" flat dense icon="visibility" color="primary"
      @click="$router.push(`/templates/${props.row.id}/submissions`)" />
    <q-btn v-if="props.row.status === 'DRAFT' || props.row.status === 'OFFLINE'"
      v-perm="'form:template:publish'" size="sm" flat dense icon="publish" color="primary" @click="onPublish(props.row)" />
  </q-td>
</template>
```

**Mobile card pattern** (lines 136-180):
```vue
<div v-else class="q-gutter-sm">
  <q-card v-for="t in store.rows" :key="t.id" flat bordered>
    <q-card-section>
      <div class="row items-center">
        <div class="text-subtitle1">{{ t.name }}</div>
        <q-space />
        <q-badge :color="statusColor(t.status)" text-color="white" :label="statusLabel(t.status)" />
      </div>
      <div class="text-caption q-mt-xs" style="color: var(--oa-text-secondary)">
        v{{ t.schemaVersion }} · {{ formatDate(t.updatedAt) }}
      </div>
    </q-card-section>
```

Add a purpose badge beside status; hide/disable share and submissions actions for `APPROVAL_REQUIRED` according to locked decisions.

---

### `frontend/src/pages/FormDesignerPage.vue` (component, transform + request-response)

**Analog:** same file

**Toolbar save/publish placement** (lines 4-29):
```vue
<div class="designer-toolbar row items-center no-wrap">
  <q-btn flat dense icon="arrow_back" aria-label="返回模板列表" @click="router.push('/templates')" />
  <span class="text-h6 q-ml-sm ellipsis">{{ store.current?.name ?? '' }}</span>
  <q-space />
  <q-toggle
    v-if="store.current"
    v-model="store.current.requireIdentity"
    label="要求填写者提供身份信息"
    dense
    class="q-mr-md"
  />
  <q-btn flat label="保存设计" :loading="saving" @click="handleSave" />
```

**Save flow with schemaVersion notification** (lines 74-92):
```typescript
async function handleSave() {
  if (!store.current) return;
  saving.value = true;
  try {
    const prev = store.current.schemaVersion;
    await store.update(templateId, {
      schema: store.current.schema,
      requireIdentity: store.current.requireIdentity,
    });
    $q.notify({ type: 'positive', message: '保存成功' });
    if (store.current.schemaVersion > prev) {
      $q.notify({ type: 'info', message: `模板已更新至 v${store.current.schemaVersion}` });
    }
  } catch {
    $q.notify({ type: 'negative', message: '保存失败' });
  } finally {
    saving.value = false;
  }
}
```

Add business mode/process binding controls in the existing toolbar/settings area. Binding changes should use `store.update` but should not trigger schema-version expectations.

---

### `frontend/src/pages/DepartmentPage.vue` (component, CRUD + request-response)

**Analog:** same file

**Tree header/action pattern** (lines 30-48):
```vue
<q-tree v-else :nodes="tree" node-key="id" label-key="name" children-key="children" default-expand-all>
  <template #default-header="props">
    <div class="row items-center full-width">
      <q-icon name="folder" class="q-mr-sm text-amber" />
      <div>{{ props.node.name }}</div>
      <q-space />
      <q-btn v-perm="'department:create'" size="sm" flat dense icon="add" @click.stop="openEdit({ parentId: props.node.id })" />
      <q-btn v-perm="'department:update'" size="sm" flat dense icon="edit" @click.stop="openEdit(props.node)" />
      <q-btn v-perm="'department:delete'" size="sm" flat dense icon="delete" color="negative" @click.stop="onDelete(props.node)" />
    </div>
  </template>
</q-tree>
```

**Dialog form pattern** (lines 50-95):
```vue
<q-dialog v-model="dialog" :maximized="isMobile"
          :transition-show="isMobile ? 'slide-up' : 'scale'"
          :transition-hide="isMobile ? 'slide-down' : 'scale'">
  <q-card :style="isMobile ? '' : 'min-width: 320px'">
    <q-card-section class="text-h6">{{ form.id ? '编辑部门' : '新建部门' }}</q-card-section>
    <q-card-section class="q-gutter-sm">
      <q-input ref="nameRef" v-model="form.name" outlined lazy-rules="ondemand"
        :rules="[(v: string) => !!v || '请输入部门名称']">
        <template #label>部门名称 <span class="text-negative">*</span></template>
      </q-input>
```

**Save payload pattern** (lines 201-222):
```typescript
async function onSave() {
  const nameValid = await nameRef.value?.validate();
  const sortValid = await sortRef.value?.validate();
  if (!nameValid || !sortValid) return;

  if (form.id) {
    await api.put(`/departments/${form.id}`, {
      name: form.name,
      parentId: form.parentId ?? null,
      sort: form.sort,
    });
  } else {
    await api.post('/departments', {
      name: form.name,
      parentId: form.parentId ?? null,
      sort: form.sort,
    });
  }
```

Add default approver display and selector inside this existing dialog; reuse `UserPage.vue` select option loading.

---

### `frontend/src/router/routes.ts` (route config, request-response)

**Analog:** same file

**Guarded child route pattern** (lines 20-32):
```typescript
{
  path: '/',
  component: () => import('layouts/MainLayout.vue'),
  redirect: '/dashboard',
  children: [
    { path: 'dashboard', component: () => import('pages/DashboardPage.vue'), meta: { title: '首页', icon: 'dashboard' } },
    { path: 'departments', component: () => import('pages/DepartmentPage.vue'), meta: { title: '部门管理', icon: 'account_tree', perm: 'department:list' } },
    { path: 'templates', component: () => import('pages/TemplatePage.vue'), meta: { title: '模板管理', icon: 'description', perm: 'form:template:list' } },
    { path: 'templates/:id/design', component: () => import('pages/FormDesignerPage.vue'), meta: { title: '表单设计', perm: 'form:template:edit' } },
  ],
}
```

Add `/approval/processes` with `meta.perm: 'approval:process:list'`.

---

### `frontend/src/layouts/MainLayout.vue` (component/config, request-response)

**Analog:** same file

**Menu rendering pattern** (lines 31-52):
```vue
<q-list>
  <q-item-label header>导航</q-item-label>
  <template v-for="m in visibleMenus" :key="m.path ?? m.title">
    <q-expansion-item v-if="m.children" :icon="m.icon" :label="m.title" default-opened>
      <q-item v-for="child in m.children" :key="child.path" clickable v-ripple :to="child.path" active-class="text-primary" class="q-pl-xl">
        <q-item-section avatar><q-icon :name="child.icon" /></q-item-section>
        <q-item-section>{{ child.title }}</q-item-section>
      </q-item>
    </q-expansion-item>
    <q-item v-else clickable v-ripple :to="m.path" active-class="text-primary">
      <q-item-section avatar><q-icon :name="m.icon" /></q-item-section>
      <q-item-section>{{ m.title }}</q-item-section>
    </q-item>
  </template>
</q-list>
```

**Permission-filtered menu config** (lines 148-182):
```typescript
interface MenuConfig {
  path?: string;
  title: string;
  icon: string;
  perm?: string;
  children?: MenuConfig[];
}

const allMenus: MenuConfig[] = [
  { path: '/dashboard', title: '首页', icon: 'dashboard', perm: '' },
  { path: '/departments', title: '部门', icon: 'account_tree', perm: 'department:list' },
  {
    title: '收集统计表', icon: 'assessment',
    children: [
      { path: '/templates', title: '模板管理', icon: 'description', perm: 'form:template:list' },
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
```

Add an approval/admin group with process config under `approval:process:list`.

---

### `frontend/src/components/renderer/FieldRenderer.vue` (component, transform)

**Analog:** same file

**Required mark and field rules** (lines 3-20, 54-70):
```vue
<div class="field-label">
  {{ field.label }}
  <span v-if="field.required && mode !== 'print'" class="required-mark">*</span>
</div>

<q-input
  v-if="field.type === 'text'"
  :model-value="modelValue"
  @update:model-value="$emit('update:modelValue', $event)"
  outlined
  :placeholder="field.placeholder"
  :rules="field.required ? [requiredRule] : []"
/>
```

**Current imperative validation gap** (lines 149-173):
```typescript
const requiredRule = (v: string) => !!v?.trim() || '此项为必填';
const radioError = ref(false);
const checkboxError = ref(false);
const sigError = ref(false);

function validate(value: any, field: SchemaField): boolean {
  if (!field.required) return true;
  if (field.type === 'radio') {
    radioError.value = value == null;
    return !radioError.value;
  }
  if (field.type === 'checkbox') {
    checkboxError.value = !value?.length;
    return !checkboxError.value;
  }
  if (field.type === 'signature') {
    sigError.value = !value;
    return !sigError.value;
  }
  return true;
}
```

Extend `validate()` to cover text, textarea, date, and phone directly. Keep radio/checkbox/signature visible error refs.

---

### `frontend/src/components/renderer/GridFormRenderer.vue` (component, transform)

**Analog:** same file

**Renderer wiring and refs** (lines 42-82):
```vue
<template v-else>
  <template v-for="(item, idx) in schema.items" :key="idx">
    <div v-if="item.type === 'row'" class="grid-row">
      <FieldRenderer
        v-for="field in item.fields"
        :key="field.id"
        :ref="(el: any) => { if (el) fieldRefMap[field.id] = el }"
        :field="field"
        :mode="mode"
        :style="{ gridColumn: `span ${field.colSpan}` }"
        :model-value="modelValue?.[field.id]"
        @update:model-value="emitField(field.id, $event)"
      />
    </div>
```

**Field traversal validation pattern** (lines 141-183):
```typescript
const fieldRefMap = reactive<Record<string, InstanceType<typeof FieldRenderer>>>({});
const groupRefs: InstanceType<typeof GroupRenderer>[] = [];

function getAllFieldRefs(): Record<string, InstanceType<typeof FieldRenderer>> {
  const merged = { ...fieldRefMap };
  for (const g of groupRefs) {
    if (g?.fieldRefMap) Object.assign(merged, g.fieldRefMap);
  }
  return merged;
}

function validateFields(): boolean {
  const allRefs = getAllFieldRefs();
  const fields = flattenFields(props.schema);
  let valid = true;
  for (const f of fields) {
    const renderer = allRefs[f.id];
    if (renderer?.validate) {
      if (!renderer.validate(props.modelValue?.[f.id], f)) valid = false;
    }
  }
  return valid;
}

defineExpose({ validateFields, saveSignatures, fieldRefMap });
```

Keep this as the single PC/mobile validation path. Backend validator should mirror `flattenFields` behavior and skip dynamic-table column required until schema supports it.

## Shared Patterns

### Backend Auth Guards

**Source:** `backend/src/middlewares/auth.ts` (lines 5-53)  
**Apply to:** all internal route/controller files.

```typescript
export const authGuard = (requiredPerm?: string) =>
  new Elysia({ name: `auth-guard-${requiredPerm ?? 'any'}` })
    .derive({ as: 'scoped' }, async ({ accessJwt, headers }: any) => {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) throw unauthorized();
      const payload = await accessJwt.verify(token);
      if (requiredPerm && !roleCodes.includes('ADMIN') && !permCodes.has(requiredPerm)) {
        throw forbidden(`缺少权限: ${requiredPerm}`);
      }
      return { currentUser: { id: user.id, realName: user.realName, roleCodes, permissions: Array.from(permCodes) } };
    });
```

### Backend Error Handling

**Source:** `backend/src/utils/errors.ts` and `backend/src/index.ts`  
**Apply to:** services, routes, validators.

```typescript
export class BizError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'BIZ_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (msg = '资源不存在') => new BizError(msg, 404, 'NOT_FOUND');
```

Global response formatter is in `backend/src/index.ts` lines 50-58. Throw `BizError`/`notFound`; do not hand-format error JSON in each route.

### Frontend Permission Controls

**Source:** `frontend/src/boot/perm.ts` (lines 5-12), `frontend/src/stores/auth.ts` (lines 60-64)  
**Apply to:** page buttons, nav entries, process/template binding controls.

```typescript
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

### Axios/API Calls

**Source:** `frontend/src/boot/axios.ts` (lines 7-24, 29-67)  
**Apply to:** all authenticated stores/pages.

```typescript
const api: AxiosInstance = axios.create({
  baseURL: process.env.API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});
```

### Responsive Admin UI

**Source:** `TemplatePage.vue`, `RolePage.vue`, `DepartmentPage.vue`  
**Apply to:** `ApprovalProcessPage.vue`, department/template changes.

- Desktop: dense `q-table` or split list/detail; actions as small dense icon buttons.
- Mobile: cards, single-column mode switch, or maximized dialogs.
- Dialogs use `:maximized="isMobile"` and slide-up transitions.
- Follow local skill guidance: labels on controls, clear nearby validation errors, no emoji icons, 44px touch targets for primary mobile actions.

### Required Field Validation

**Source:** `FieldRenderer.vue` + `GridFormRenderer.vue` + `public.route.ts`  
**Apply to:** frontend fill paths and backend public/approval submission.

Frontend currently calls:
```typescript
const formValid = await formRef.value?.validate();
const customValid = gridRef.value?.validateFields() ?? true;
if (!formValid || !customValid) return;
```

Backend must add equivalent validation before data creation:
```typescript
if (link.template.requireIdentity) {
  if (!body.submitterName?.trim()) throw new BizError('请输入姓名');
  if (!/^1\d{10}$/.test(body.submitterPhone ?? '')) throw new BizError('请输入有效手机号');
}
const submission = await prisma.submission.create({ data: { data: body.data } });
```

### Transactional Snapshot/Task Integrity

**Source:** `backend/src/modules/approval/application.service.ts` (lines 156-193, 225-300)  
**Apply to:** process snapshot resolution and later approval submission.

Use `prisma.$transaction(async (tx) => { ... })`, resolve concrete assignees before writes, and throw `BizError` before creating partial applications/tasks.

## No Analog Found

All inferred files have at least a role-match analog in the current codebase. No file should need patterns solely from `RESEARCH.md`.

## Metadata

**Analog search scope:** `backend/src/modules`, `backend/prisma`, `frontend/src/pages`, `frontend/src/stores`, `frontend/src/router`, `frontend/src/layouts`, `frontend/src/components/renderer`, `frontend/src/boot`  
**Files scanned:** 127  
**Pattern extraction date:** 2026-04-25
