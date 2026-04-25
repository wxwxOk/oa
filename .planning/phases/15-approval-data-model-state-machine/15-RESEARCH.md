# Phase 15: Approval Data Model And State Machine - Research

**Phase:** 15 - 审批数据模型与状态机
**Date:** 2026-04-25
**Status:** Ready for planning

## Research Goal

Plan the backend foundation for v2.0 approvals: process definitions, nodes, applications, tasks, immutable actions/timeline events, snapshots, state transitions, and tests. The plan must satisfy `MODEL-01` through `MODEL-04` without pulling later UI-heavy scope from Phases 16-19 into this phase.

## Current Codebase Findings

### Backend Stack And Existing Patterns

- Backend runtime is Bun with Elysia route modules under `backend/src/modules/*`.
- ORM is Prisma 5.22 with PostgreSQL; schema is centralized in `backend/prisma/schema.prisma`.
- Shared Prisma client lives in `backend/src/plugins/prisma.ts`.
- Business errors use `BizError`, `notFound`, `forbidden`, and `unauthorized` from `backend/src/utils/errors.ts`.
- Auth middleware in `backend/src/middlewares/auth.ts` derives `currentUser` with `id`, `username`, `realName`, `roleCodes`, and `permissions`.
- Existing tests use `bun:test`; current example is `backend/src/modules/template/__tests__/schema.validation.test.ts`.
- `backend/package.json` has no `test` script. Tests can still run directly with `bun test <path>`.
- Existing form data uses Prisma `Json` on `FormTemplate.schema` and `Submission.data`; approval snapshots should follow that pattern.
- Route modules currently put some business logic inline. Phase 15 should not copy that for approvals; state transitions should be centralized in service/state-machine files because illegal transitions and transactional side effects are core behavior.

### Existing Domain Models

Current schema has:

- `User`, `Department`, `Role`, `Permission`, `UserRole`, `RolePermission`
- `FormTemplate` with `schema Json`, `schemaVersion Int`, `status TemplateStatus`
- `ShareLink` and `Submission` for public collection

Phase 15 should leave `Submission` semantics unchanged. Approval is authenticated internal workflow and should use a separate `ApprovalApplication` aggregate.

## Recommended Model Shape

### Enums

Add explicit enums to `backend/prisma/schema.prisma`:

- `ApprovalApplicationStatus`: `DRAFT`, `SUBMITTED`, `APPROVING`, `APPROVED`, `REJECTED`, `CANCELED`
- `ApprovalTaskStatus`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELED`, `SKIPPED`
- `ApprovalActionType`: `SUBMIT`, `ASSIGN`, `APPROVE`, `REJECT`, `CANCEL`, `EDIT`, `MARK`, `COMMENT`
- `ApprovalApproverSourceType`: `USER`, `ROLE`, `DEPARTMENT_MANAGER`

Enum values should use existing Prisma uppercase style (`TemplateStatus`, `UserStatus`).

### Process Definition Models

Phase 15 should create backend persistence for Phase 16 to configure later:

- `ApprovalProcess`
  - `id`
  - `name`
  - `description?`
  - `isActive Boolean @default(true)`
  - `creatorId`
  - `createdAt`, `updatedAt`
  - relations to `creator User`, `nodes ApprovalProcessNode[]`, `applications ApprovalApplication[]`
- `ApprovalProcessNode`
  - `id`
  - `processId`
  - `name`
  - `order Int`
  - `approverSourceType ApprovalApproverSourceType`
  - `approverUserId?`
  - `approverRoleId?`
  - `createdAt`, `updatedAt`
  - relations to process, optional user, optional role
  - unique `(processId, order)`

This gives Phase 16 a place to bind and configure simple serial flows without replacing Phase 15 foundations.

### Application Aggregate

Add `ApprovalApplication`:

- `id`
- `applicationNo String @unique`
- `status ApprovalApplicationStatus @default(DRAFT)`
- `formData Json @default("{}")`
- `schemaSnapshot Json`
- `processSnapshot Json`
- `templateId Int`
- `templateName String`
- `templateVersion Int`
- `processId Int?`
- `processName String?`
- `applicantId Int`
- `applicantName String`
- `applicantDepartmentId Int?`
- `applicantDepartmentName String?`
- `currentNodeOrder Int?`
- `currentNodeName String?`
- `submittedAt DateTime?`
- `completedAt DateTime?`
- `createdAt`, `updatedAt`
- relations to `template FormTemplate`, optional `process ApprovalProcess`, `applicant User`, optional `applicantDepartment Department`, `tasks`, `actions`, and `timelineEvents`

Indexes:

- `@@index([templateId])`
- `@@index([applicantId])`
- `@@index([applicantDepartmentId])`
- `@@index([status])`
- `@@index([createdAt])`
- optionally `@@index([currentNodeOrder])`

### Task Model

Add `ApprovalTask`:

- `id`
- `applicationId`
- `nodeOrder Int`
- `nodeName String`
- `status ApprovalTaskStatus @default(PENDING)`
- `assigneeId Int`
- `assigneeName String`
- `approverSourceSnapshot Json`
- `assignedAt DateTime @default(now())`
- `handledAt DateTime?`
- `comment String?`
- `createdAt`, `updatedAt`
- relations to application and assignee user

Indexes:

- `@@index([applicationId])`
- `@@index([assigneeId, status])`
- `@@index([status])`
- `@@unique([applicationId, nodeOrder, assigneeId])`

### Action And Timeline Event Models

Use two append-only tables for clarity:

- `ApprovalAction`
  - source-of-truth audit record for business actions
  - `id`, `applicationId`, `taskId?`, `actorId?`, `actorName`, `nodeOrder?`, `nodeName?`, `type ApprovalActionType`, `comment?`, `payload Json?`, `createdAt`
- `ApprovalTimelineEvent`
  - read-optimized timeline row
  - `id`, `applicationId`, `taskId?`, `actorId?`, `actorName`, `nodeOrder?`, `nodeName?`, `type ApprovalActionType`, `title`, `comment?`, `payload Json?`, `createdAt`

This duplicates some action data, but it keeps audit history immutable and lets later detail pages query a user-facing timeline without reconstructing titles on every read. Both tables should only be created, never updated or deleted by services.

Indexes:

- action: `@@index([applicationId, createdAt])`, `@@index([taskId])`, `@@index([actorId])`, `@@index([type])`
- timeline: `@@index([applicationId, createdAt])`, `@@index([taskId])`, `@@index([actorId])`, `@@index([type])`

## State Machine

Centralize transitions in `backend/src/modules/approval/state-machine.ts`.

### Legal Application Status Transitions

| From | To | Reason |
|------|----|--------|
| `DRAFT` | `SUBMITTED` | applicant submits saved draft |
| `SUBMITTED` | `APPROVING` | first task assigned in same transaction as submission |
| `SUBMITTED` | `CANCELED` | applicant cancels before first assignment |
| `APPROVING` | `APPROVED` | final serial node approved |
| `APPROVING` | `REJECTED` | approver rejects; rejection terminates MVP application |
| `APPROVING` | `CANCELED` | applicant cancels before terminal approval |

`APPROVED`, `REJECTED`, and `CANCELED` are terminal. No transition may leave them.

### Functions To Plan

- `assertApplicationTransition(from, to)` throws `BizError` with code `INVALID_APPROVAL_TRANSITION` or message containing `非法状态流转`.
- `canTransitionApplication(from, to)` returns boolean.
- `isTerminalApplicationStatus(status)` returns true for `APPROVED`, `REJECTED`, `CANCELED`.
- Optional: `assertPendingTask(task)` throws if task status is not `PENDING`.

Tests should cover all legal transitions and representative illegal transitions, including terminal-state rejection.

## Transactional Service Design

Create service code under `backend/src/modules/approval/`, for example:

- `state-machine.ts`
- `application.service.ts`
- `timeline.service.ts`
- `approval.route.ts` only if minimal API smoke coverage is needed

Keep route handlers thin. Core behavior should be callable from tests without starting the HTTP server.

### Required Service Operations

1. `createDraftApplication`
   - creates an application in `DRAFT`
   - saves `formData`, `schemaSnapshot`, template snapshot fields, applicant snapshot fields
   - no approval task is created
   - can append an `EDIT` event if draft save semantics are included, otherwise defer route-level draft editing to Phase 17

2. `submitApplication`
   - transaction:
     - validate `DRAFT -> SUBMITTED`
     - write `SUBMIT` action and timeline
     - resolve first process snapshot node
     - create first `PENDING` task with concrete `assigneeId/assigneeName` and approver source snapshot
     - write `ASSIGN` action and timeline
     - validate `SUBMITTED -> APPROVING`
     - update application to `APPROVING`, `submittedAt`, `currentNodeOrder`, `currentNodeName`
   - If planning chooses a combined create-and-submit helper, it must still preserve the same transaction semantics.

3. `approveTask`
   - transaction:
     - ensure task is `PENDING`
     - ensure application is `APPROVING`
     - close current task as `APPROVED`
     - write `APPROVE` action and timeline
     - if next node exists: create next `PENDING` task, write `ASSIGN`, update current node
     - if no next node: validate `APPROVING -> APPROVED`, set terminal status, set `completedAt`

4. `rejectTask`
   - transaction:
     - ensure task is `PENDING`
     - ensure application is `APPROVING`
     - close current task as `REJECTED`
     - close all other pending tasks for application as `CANCELED`
     - write `REJECT` action and timeline
     - validate `APPROVING -> REJECTED`
     - set terminal status and `completedAt`

5. `cancelApplication`
   - transaction:
     - allow only `SUBMITTED` or `APPROVING`
     - close all pending tasks as `CANCELED`
     - write `CANCEL` action and timeline
     - set terminal status and `completedAt`

6. `appendApplicationEvent`
   - supports `COMMENT`, `MARK`, and `EDIT` records so `MODEL-04` is covered in Phase 15 even if full UI/API for remarks, marks, and post-submit editing comes later.
   - Does not mutate form data by itself unless a later service calls it inside a broader transaction.

### Process Snapshot Shape

`processSnapshot` should be executable and self-contained. Recommended JSON:

```json
{
  "processId": 1,
  "processName": "Leave approval",
  "nodes": [
    {
      "order": 1,
      "name": "Department manager",
      "approverSourceType": "DEPARTMENT_MANAGER",
      "approverUserId": null,
      "approverRoleId": null,
      "approverSourceLabel": "提交人部门负责人"
    }
  ]
}
```

Task assignment should use this snapshot, not live process nodes.

## Planning Constraints

- Do not change `Submission` ownership or route shape in Phase 15.
- Do not build admin process configuration UI/API beyond what is needed for model/service tests.
- Do not build applicant or approver frontend pages in Phase 15.
- Preserve Phase 16 compatibility: models must support single-step and serial multi-step flows, approver source by user/role/department manager, and template binding later.
- Use Prisma transaction APIs for multi-row workflow changes.
- Create migration artifacts through Prisma migration flow; do not rely on generated client types alone.
- Include a blocking schema task because this phase modifies `backend/prisma/schema.prisma`.

## Schema And Command Requirements

The planner must include a blocking schema step after schema edits and before behavior verification.

Recommended commands from `backend/`:

- `bun --env-file=../.env prisma migrate dev --name add_approval_models`
- `bun --env-file=../.env prisma generate`
- `bun test src/modules/approval/__tests__/state-machine.test.ts src/modules/approval/__tests__/application.service.test.ts`
- `bun run build`

If the execution environment has no database, the executor should still create the Prisma migration file and report the blocked database command clearly. The plan should prefer migration generation over `db push` because this repo already uses `backend/prisma/migrations/*/migration.sql`.

## Security And Integrity Notes

Threats to account for in PLAN.md threat models:

- T-15-01: illegal state transition corrupts approval truth. Mitigation: centralized state machine and tests.
- T-15-02: partial transaction creates orphan task or missing timeline. Mitigation: Prisma transaction around application/task/action/timeline writes.
- T-15-03: historical application meaning changes after template/process edits. Mitigation: persist `schemaSnapshot`, `processSnapshot`, template name/version, applicant and department snapshot fields.
- T-15-04: unauthorized actor handles task. Mitigation: service checks task assignee or route auth checks in later API; Phase 15 service tests can include assignee guard if route is included.
- T-15-05: audit event mutation hides business history. Mitigation: append-only service methods and no update/delete paths for action/timeline rows.

## Validation Architecture

### Test Infrastructure

- Framework: Bun built-in test runner (`bun:test`)
- Existing config: none dedicated; tests run by path.
- Quick command: `cd backend && bun test src/modules/approval/__tests__/state-machine.test.ts`
- Full command: `cd backend && bun test src/modules/approval/__tests__/state-machine.test.ts src/modules/approval/__tests__/application.service.test.ts`
- Build command: `cd backend && bun run build`

### Required Test Coverage

1. `state-machine.test.ts`
   - accepts `DRAFT -> SUBMITTED`
   - accepts `SUBMITTED -> APPROVING`
   - accepts `APPROVING -> APPROVED`
   - accepts `APPROVING -> REJECTED`
   - accepts `APPROVING -> CANCELED`
   - rejects terminal transitions from `APPROVED`, `REJECTED`, `CANCELED`
   - rejects invalid skips such as `DRAFT -> APPROVING` and `SUBMITTED -> APPROVED`

2. `application.service.test.ts`
   - creates application with `schemaSnapshot`, `processSnapshot`, template snapshot, applicant snapshot
   - submit creates first pending task and records `SUBMIT` plus `ASSIGN` events
   - approve first task in a serial flow closes current task and creates next task
   - approve final task sets application to `APPROVED` and leaves no pending task
   - reject sets application to `REJECTED` and closes pending tasks
   - cancel sets application to `CANCELED` and closes pending tasks
   - illegal task action against closed/terminal application throws `BizError`
   - `COMMENT`, `MARK`, and `EDIT` action/event append functions persist actor, node/action/comment/time fields

### Nyquist Sampling Strategy

- Every schema/task plan must include one automated verification command.
- After state machine changes: run `cd backend && bun test src/modules/approval/__tests__/state-machine.test.ts`.
- After service changes: run the full approval test command.
- After schema and service integration: run `cd backend && bun run build`.
- Final phase verification must include Prisma migration/generate status, full approval tests, and backend build.

## Source Items Planner Must Cover

- `MODEL-01`: Prisma models/enums for process definitions, nodes, applications, tasks, actions, timeline events.
- `MODEL-02`: application creation stores `schemaSnapshot`, `processSnapshot`, template name/version, applicant/department snapshots.
- `MODEL-03`: centralized state machine rejects illegal transitions and covers `draft/submitted/approving/approved/rejected/canceled`.
- `MODEL-04`: append-only events for submit, assign, approve, reject, cancel, edit, mark, comment with actor, node, action, comment, time.
- Roadmap success criteria: migration passes, task creation/serial advancement/terminal closure/illegal operations covered by tests.

## Suggested Plan Decomposition

1. Prisma schema and migration for approval enums/models/relations.
2. State machine and event/timeline helper tests.
3. Approval service transaction implementation and service tests.
4. Minimal route registration or API smoke endpoints only if needed to prove integration; keep UI and full API workflow for later phases.

## RESEARCH COMPLETE

This research is sufficient to plan Phase 15 with concrete file paths, schema models, state transitions, transactional service boundaries, threat model references, and validation commands.
