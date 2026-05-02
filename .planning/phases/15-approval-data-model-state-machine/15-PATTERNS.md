# Phase 15: Pattern Map

**Phase:** 15 - 审批数据模型与状态机
**Date:** 2026-04-25
**Status:** Ready for planning

## Purpose

Map planned approval files to the closest existing codebase analogs so execution follows local conventions instead of inventing a new backend style.

## Target Files And Closest Analogs

| Target | Role | Closest Existing Analog | Pattern To Reuse |
|--------|------|-------------------------|------------------|
| `backend/prisma/schema.prisma` | Prisma source of truth for approval enums, relations, indexes, JSON snapshots | same file existing `User`, `Department`, `FormTemplate`, `Submission`, `TemplateStatus` | Uppercase enum values, `Int @id @default(autoincrement())`, relation arrays on parent models, `@@index` for query filters, `Json` fields for dynamic schema/data |
| `backend/prisma/migrations/<timestamp>_add_approval_models/migration.sql` | Database migration for approval models | `backend/prisma/migrations/20260420120000_add_form_template_share_submission/migration.sql` | Prisma-generated SQL migration directory naming and migration lock conventions |
| `backend/src/modules/approval/state-machine.ts` | Central approval status transition rules | `backend/src/modules/template/template.route.ts` status transition block plus `backend/src/utils/errors.ts` | Keep legal transitions explicit, throw `BizError` for invalid business operations, avoid scattering transition maps in route handlers |
| `backend/src/modules/approval/application.service.ts` | Transactional workflow service for draft/submit/approve/reject/cancel/event append | `backend/src/plugins/prisma.ts`, `backend/src/modules/template/template.route.ts`, `backend/src/modules/submission/submission.route.ts` | Import shared `prisma`; use Prisma queries and transactions; use `BizError`/`notFound` for business failures; keep service callable from tests |
| `backend/src/modules/approval/timeline.service.ts` | Small helper for paired action/timeline inserts, if separate helper reduces duplication | `backend/src/utils/errors.ts` and shared utility style | Keep narrow helper functions with concrete payloads; do not add broad abstraction unless repeated event insert logic warrants it |
| `backend/src/modules/approval/__tests__/state-machine.test.ts` | Unit tests for legal/illegal transitions | `backend/src/modules/template/__tests__/schema.validation.test.ts` | Use `describe`, `it`, `expect` from `bun:test`; direct function assertions; no watch mode |
| `backend/src/modules/approval/__tests__/application.service.test.ts` | Service tests for snapshot persistence, first task creation, serial advancement, terminal closure, event append | existing Bun test structure and Prisma client usage | Prefer direct service tests. If DB integration is required, isolate test data and clean by model order |
| `backend/src/index.ts` | Route registration only if Phase 15 adds minimal approval routes | existing `.use(formTemplateModule)` and `.use(submissionModule)` chain | Import `approvalModule` and add `.use(approvalModule)` under `/api/v1`; do not register if no route file is implemented |

## Existing Code Excerpts To Preserve

### Prisma JSON And Relation Style

`backend/prisma/schema.prisma` already uses `Json` and parent relation arrays:

```prisma
model FormTemplate {
  id              Int            @id @default(autoincrement())
  name            String
  schema          Json           @default("[]")
  schemaVersion   Int            @default(1)
  status          TemplateStatus @default(DRAFT)
  creatorId       Int
  creator         User           @relation(fields: [creatorId], references: [id])
  shareLinks      ShareLink[]
  submissions     Submission[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([creatorId])
  @@index([status])
}
```

Approval snapshots should mirror this with `Json` fields such as `formData`, `schemaSnapshot`, `processSnapshot`, and event `payload`.

### Shared Prisma Client

`backend/src/plugins/prisma.ts`:

```ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});
```

Approval services should import this client instead of constructing another Prisma client.

### Business Error Style

`backend/src/utils/errors.ts`:

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

export const notFound = (msg = '资源不存在') => new BizError(msg, 404, 'NOT_FOUND');
```

Approval state-machine and service code should throw `BizError`, with specific codes where useful, for example `INVALID_APPROVAL_TRANSITION`.

### Existing Explicit Transition Pattern

`backend/src/modules/template/template.route.ts` currently uses an inline transition map:

```ts
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

For approval, extract this style into `state-machine.ts` because approval transitions are more numerous and tested independently.

### Auth Current User Shape

`backend/src/middlewares/auth.ts` derives:

```ts
currentUser: {
  id: user.id,
  username: user.username,
  realName: user.realName,
  roleCodes,
  permissions: Array.from(permCodes),
}
```

If Phase 15 includes route/API smoke work, applicant and actor snapshots should use `currentUser.id` and `currentUser.realName`.

### Bun Test Style

`backend/src/modules/template/__tests__/schema.validation.test.ts`:

```ts
import { describe, it, expect } from 'bun:test';

describe('SchemaV2Body validation', () => {
  it('accepts valid v2 schema with row items', () => {
    expect(Value.Check(SchemaV2Body, payload)).toBe(true);
  });
});
```

Approval tests should use the same import and assertion style.

## Data Flow Pattern For Phase 15

1. `ApprovalApplication` is created with `formData`, `schemaSnapshot`, `processSnapshot`, template snapshot fields, and applicant/department snapshot fields.
2. `submitApplication` runs in one Prisma transaction:
   - `DRAFT -> SUBMITTED`
   - append `SUBMIT` action/timeline
   - create first `PENDING` task from `processSnapshot.nodes[0]`
   - append `ASSIGN` action/timeline
   - `SUBMITTED -> APPROVING`
3. `approveTask` runs in one transaction:
   - close current task as `APPROVED`
   - append `APPROVE`
   - create next task and append `ASSIGN`, or set final `APPROVED`
4. `rejectTask` and `cancelApplication` run in one transaction:
   - close pending tasks as `REJECTED` or `CANCELED`
   - append event
   - set terminal application state
5. `appendApplicationEvent` appends `EDIT`, `MARK`, and `COMMENT` action/timeline rows without silently mutating original submitted data.

## Commands Planner Should Reference

- Schema/migration: `cd backend && bun --env-file=../.env prisma migrate dev --name add_approval_models`
- Prisma client: `cd backend && bun --env-file=../.env prisma generate`
- State-machine tests: `cd backend && bun test src/modules/approval/__tests__/state-machine.test.ts`
- Service tests: `cd backend && bun test src/modules/approval/__tests__/application.service.test.ts`
- Backend build: `cd backend && bun run build`

## PATTERN MAPPING COMPLETE
