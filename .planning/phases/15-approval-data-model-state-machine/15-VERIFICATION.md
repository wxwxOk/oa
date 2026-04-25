---
phase: 15-approval-data-model-state-machine
verified: 2026-04-25T08:43:23Z
status: passed
score: 23/23 must-haves verified
overrides_applied: 0
---

# Phase 15: 审批数据模型与状态机 Verification Report

**Phase Goal:** 建立 v2.0 审批中心的后端基础，使申请、流程、任务、时间线和状态流转有可信数据模型
**Verified:** 2026-04-25T08:43:23Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Prisma schema 可表达流程定义、节点、审批实例、任务、动作和时间线事件，并通过 migration | VERIFIED | `backend/prisma/schema.prisma` defines `ApprovalProcess`, `ApprovalProcessNode`, `ApprovalApplication`, `ApprovalTask`, `ApprovalAction`, and `ApprovalTimelineEvent` at lines 155-297; migration creates matching tables/enums/FKs at `backend/prisma/migrations/20260425090000_add_approval_models/migration.sql` lines 2-243. Orchestrator reports `prisma validate` and schema drift check passed. |
| 2 | 审批申请创建时保存表单 schema 快照和流程配置快照 | VERIFIED | `createDraftApplication` writes `formData`, `schemaSnapshot`, `processSnapshot`, template, process, applicant, and department snapshot fields at `application.service.ts` lines 133-153. Test asserts persisted snapshots at `application.service.test.ts` lines 189-201. |
| 3 | 状态机拒绝非法状态跳转，并覆盖 draft/submitted/approving/approved/rejected/canceled | VERIFIED | Central transition map covers all six states at `state-machine.ts` lines 5-14 and throws `BizError` at lines 23-29. Tests cover happy path, reject/cancel paths, invalid skips, and terminal exits at `state-machine.test.ts` lines 12-52. |
| 4 | 提交、分配、审批、驳回、撤销、编辑、标记和备注事件都可追加记录操作者、节点、动作、意见和时间 | VERIFIED | `ApprovalActionType` includes `SUBMIT`, `ASSIGN`, `APPROVE`, `REJECT`, `CANCEL`, `EDIT`, `MARK`, `COMMENT` at `schema.prisma` lines 138-147. `createActionAndTimeline` writes paired action/timeline rows with application/task/actor/node/type/comment/payload fields at `application.service.ts` lines 92-114; `createdAt` is persisted in schema lines 268 and 291. |
| 5 | 后端服务/API 测试覆盖首个任务创建、串行推进、终态关闭待办和非法操作拒绝 | VERIFIED | `application.service.test.ts` covers first pending task lines 204-226, serial approval lines 229-252, reject/cancel closure lines 254-285, terminal illegal operations lines 288-303, non-assignee and non-applicant guards lines 305-345. Orchestrator reports approval tests passed: 16 pass, 0 fail. |
| 6 | Prisma schema defines approval process, process node, application, task, action, and timeline event models | VERIFIED | Model definitions present at `schema.prisma` lines 155, 171, 190, 229, 254, and 276. |
| 7 | ApprovalApplication stores formData, schemaSnapshot, processSnapshot, template snapshot, applicant snapshot, and department snapshot fields | VERIFIED | Fields present at `schema.prisma` lines 194-209 and written by service at `application.service.ts` lines 138-151. |
| 8 | ApprovalAction and ApprovalTimelineEvent can record all required event types | VERIFIED | Shared enum includes all required types at `schema.prisma` lines 138-147; both models use `ApprovalActionType` at lines 265 and 287. |
| 9 | A Prisma migration named add_approval_models exists and creates approval enums/tables/indexes | VERIFIED | Concrete migration found at `backend/prisma/migrations/20260425090000_add_approval_models/migration.sql`; grep confirms enum/table/index/FK creation at lines 2-243. |
| 10 | Prisma generate/build or exact database blocker recorded before service plans execute | VERIFIED | Summaries record initial host DB blocker and successful 127.0.0.1 migration path. Orchestrator reports `bun run build` and `prisma validate` passed. |
| 11 | Approval state transition rules are centralized in state-machine.ts | VERIFIED | `APPLICATION_TRANSITIONS` and exported guards are in `state-machine.ts` lines 5-40; service imports guards from this file at `application.service.ts` line 10. |
| 12 | DRAFT -> SUBMITTED -> APPROVING -> APPROVED is legal | VERIFIED | Transition map allows the chain at `state-machine.ts` lines 8-10; tests assert it at `state-machine.test.ts` lines 12-22. |
| 13 | APPROVING -> REJECTED and APPROVING -> CANCELED are legal | VERIFIED | Transition map allows both at `state-machine.ts` line 10; tests assert both at `state-machine.test.ts` lines 15 and 21. |
| 14 | APPROVED, REJECTED, and CANCELED are terminal states | VERIFIED | Terminal list at `state-machine.ts` line 5 and empty transition arrays at lines 11-13; tests assert terminal exits throw at `state-machine.test.ts` lines 36-38. |
| 15 | Invalid skips such as DRAFT -> APPROVING and SUBMITTED -> APPROVED throw BizError | VERIFIED | `assertApplicationTransition` throws `INVALID_APPROVAL_TRANSITION` at `state-machine.ts` lines 23-29; tests assert invalid skips at `state-machine.test.ts` lines 30-32. |
| 16 | Approval service creates applications with all required snapshots | VERIFIED | `createDraftApplication` persists all snapshot fields at `application.service.ts` lines 133-153; integration test checks schema/process/template/applicant/department snapshots at lines 189-201. |
| 17 | Submitting a draft writes SUBMIT and ASSIGN events and creates first PENDING task in one Prisma transaction | VERIFIED | `submitApplication` wraps work in `prisma.$transaction` at line 160, writes `SUBMIT` lines 175-180, creates first `PENDING` task lines 182-193, writes task-linked `ASSIGN` lines 195-203, and updates application lines 207-216. |
| 18 | Approving a serial task closes current task and creates next PENDING task, or sets APPROVED at final node | VERIFIED | `approveTask` claims current task lines 237-252, writes `APPROVE` lines 254-263, creates next pending task lines 269-290, or finalizes `APPROVED` lines 302-313. Test verifies both serial steps at lines 229-252. |
| 19 | Rejecting or canceling closes pending tasks and sets terminal status | VERIFIED | `rejectTask` cancels other pending tasks and sets `REJECTED` at `application.service.ts` lines 349-381; `cancelApplication` cancels pending tasks and sets `CANCELED` at lines 403-436. Tests verify both at lines 254-285. |
| 20 | approveTask and rejectTask reject non-assignee actors | VERIFIED | Both functions check `actor.id !== task.assigneeId` and throw `APPROVAL_TASK_FORBIDDEN` at `application.service.ts` lines 229-230 and 326-327. Tests verify no mutation at `application.service.test.ts` lines 305-318. |
| 21 | cancelApplication rejects non-applicant actors | VERIFIED | `cancelApplication` checks `actor.id !== application.applicantId` and throws `APPROVAL_CANCEL_FORBIDDEN` at `application.service.ts` lines 399-400. Test verifies application remains `APPROVING` at lines 320-330. |
| 22 | COMMENT, MARK, and EDIT append action/timeline records with actor, node, action, comment, payload, and time fields | VERIFIED | `appendApplicationEvent` only allows those three types at `application.service.ts` lines 440-453 and uses the same paired action/timeline writer. Test appends all three and confirms form data is unchanged at `application.service.test.ts` lines 348-384. |
| 23 | Illegal service operations throw BizError and do not silently mutate terminal applications | VERIFIED | Service uses `assertApplicationTransition` and `assertPendingTask` in submit/approve/reject/cancel paths. Tests verify terminal cancellation and closed-task handling reject at `application.service.test.ts` lines 288-303, and unauthorized mutation paths leave records unchanged at lines 305-345. |

**Score:** 23/23 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/prisma/schema.prisma` | Approval persistence schema | VERIFIED | Exists, substantive, defines required enums/models/relations/indexes. Wired through Prisma client types consumed by approval service. |
| `backend/prisma/migrations/20260425090000_add_approval_models/migration.sql` | Database migration for approval models | VERIFIED | Exists and creates approval enums, tables, indexes, unique constraints, and foreign keys. Orchestrator reports drift check `false`. |
| `backend/src/modules/approval/state-machine.ts` | Central approval status transition guard | VERIFIED | Exists, substantive, exports transition/pending-task guards and is imported by `application.service.ts`. |
| `backend/src/modules/approval/__tests__/state-machine.test.ts` | Unit coverage for legal and illegal approval transitions | VERIFIED | Exists and passed locally: 6 pass, 0 fail. |
| `backend/src/modules/approval/application.service.ts` | Transactional approval workflow service | VERIFIED | Exists, substantive, exports draft/submit/approve/reject/cancel/event append functions, uses Prisma transactions and state-machine guards. |
| `backend/src/modules/approval/__tests__/application.service.test.ts` | Service tests for snapshots, first task, serial approval, terminal closure, immutable events | VERIFIED | Exists and covers Phase 15 service behaviors. Orchestrator reports approval service suite passed. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ApprovalApplication.templateId` | `FormTemplate.id` | Prisma relation and FK | VERIFIED | Relation in schema at line 198; migration FK at line 210. |
| `ApprovalTask.applicationId` | `ApprovalApplication.id` | Prisma relation and FK | VERIFIED | Relation in schema at line 232; migration FK at line 222. |
| `state-machine assertApplicationTransition` | `BizError` | Invalid transition business error | VERIFIED | Imports `BizError` at `state-machine.ts` line 3 and throws `INVALID_APPROVAL_TRANSITION` at line 28. |
| `application.service submitApplication` | `state-machine assertApplicationTransition` | DRAFT -> SUBMITTED -> APPROVING guard | VERIFIED | Imports guard at line 10 and calls it at lines 173 and 205. |
| `application.service appendApplicationEvent` | `ApprovalAction` and `ApprovalTimelineEvent` | Paired append-only records | VERIFIED | `createActionAndTimeline` writes both tables at lines 108-114; `appendApplicationEvent` calls it at line 453. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `application.service.ts` | `schemaSnapshot`, `processSnapshot`, template/applicant/department snapshots | `CreateDraftApplicationInput` -> `prisma.approvalApplication.create` | Yes | VERIFIED - fields are persisted in create call and read back by integration test. |
| `application.service.ts` | `processSnapshot.nodes` | Persisted `ApprovalApplication.processSnapshot` -> `getProcessNodes` | Yes | VERIFIED - submit/approve create tasks from snapshot nodes, not live process rows. |
| `application.service.ts` | event actor/node/type/comment/payload | service mutation input -> `createActionAndTimeline` | Yes | VERIFIED - same base payload is written to `approvalAction` and `approvalTimelineEvent`. |
| `state-machine.ts` | application status transition | static transition map -> service guard calls | Yes | VERIFIED - service calls guards before status mutation paths. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| State-machine transitions reject illegal skips and terminal exits | `bun test src/modules/approval/__tests__/state-machine.test.ts` from `backend/` | 6 pass, 0 fail | PASS |
| Approval service snapshots/task progression/events | `DATABASE_URL=postgresql://oa:...@127.0.0.1:5432/oa_db?schema=public bun test src/modules/approval/__tests__/state-machine.test.ts src/modules/approval/__tests__/application.service.test.ts` | Orchestrator reported 16 pass, 0 fail | PASS |
| Backend build | `bun run build` | Orchestrator reported passed | PASS |
| Prisma schema validity | `bun --env-file=../.env prisma validate` | Orchestrator reported passed | PASS |
| Migration/schema drift | schema drift check | Orchestrator reported `drift_detected false` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MODEL-01 | 15-01 | 系统可保存审批流程定义、流程节点、审批实例、审批任务、审批动作和时间线事件 | SATISFIED | Schema and migration define all required models/tables and relations. |
| MODEL-02 | 15-01, 15-03 | 用户提交审批申请时，系统保存表单 schema 快照和审批流程快照，历史申请不受后续模板/流程修改影响 | SATISFIED | Application creation persists schema/process snapshots and template/applicant/department snapshot fields; submit/approve uses persisted process snapshot. |
| MODEL-03 | 15-02, 15-03 | 审批实例只允许在 draft、submitted、approving、approved、rejected、canceled 之间按合法状态流转 | SATISFIED | Central state machine covers all six statuses and rejects invalid transitions; service tests verify illegal terminal/task operations. |
| MODEL-04 | 15-01, 15-03 | 提交、分配、审批、驳回、撤销、编辑、标记和备注都会追加不可变业务事件，记录操作者、动作、节点、意见和时间 | SATISFIED | Enum supports all eight event types; paired action/timeline creation records actor, task/node, type, comment, payload, and `createdAt`. |

No orphaned Phase 15 requirements found in `.planning/REQUIREMENTS.md`; MODEL-01 through MODEL-04 are all claimed by plan frontmatter and accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/modules/approval/application.service.ts` | 105 | `...(input.payload === undefined ? {} : { payload: input.payload })` | Info | Intentional optional payload omission; not a stub and does not affect goal achievement. |

No TODO/FIXME/placeholders, console-only implementations, empty return stubs, or hardcoded empty rendered data were found in Phase 15 files.

### Human Verification Required

None. Phase 15 is backend data/model/state-machine work with automated schema, build, and service-test evidence.

### Gaps Summary

No Phase 15 goal gaps found.

Residual regression debt: the broader regression command including `backend/src/modules/template/__tests__/schema.validation.test.ts` reportedly still fails two pre-existing template validation tests for group/dynamic-table acceptance. Phase 15 did not modify template validation code, and approval-specific tests/build/schema checks are green, so this is not a Phase 15 blocker.

Disconfirmation pass notes: event field-level assertions are not exhaustive in tests, but code inspection verifies actor/node/type/comment/payload/time persistence through schema and the shared writer. Invalid empty `processSnapshot.nodes` has a service guard but no dedicated test; this is a coverage note, not a goal gap for the listed success criteria.

---

_Verified: 2026-04-25T08:43:23Z_
_Verifier: Claude (gsd-verifier)_
