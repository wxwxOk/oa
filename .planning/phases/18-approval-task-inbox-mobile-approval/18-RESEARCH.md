# Phase 18: 待我审批与移动审批 - Research

**Researched:** 2026-04-26  
**Domain:** 审批任务视角的待办/已办列表、详情审批流、移动端 sticky 审批体验  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

Verbatim copy from `.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md` [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md]

### Locked Decisions
- **D-01:** 新增独立的审批人入口“待我审批”，作为“审批管理”下与“我的申请”“流程配置”并列的菜单项；不要把审批人待办混入申请人自己的“我的申请”列表。
- **D-02:** 后端新增审批任务视角的 authenticated API，推荐语义为 `/api/v1/approval/tasks`；列表和详情读取 `ApprovalTask` 并关联 `ApprovalApplication`，不复用只能查看本人申请的 `/approval/applications` own-route。
- **D-03:** 待办列表只展示当前登录用户有权处理的任务：`ApprovalTask.assigneeId = currentUser.id`，待办默认限定 `status = PENDING`。后端必须继续在 approve/reject 时用 `approveTask` / `rejectTask` 校验任务仍是 pending 且 assignee 是当前用户。
- **D-04:** 权限沿用 Phase 16 种子权限：`approval:task:list` 控制待办/已办入口和只读详情，`approval:task:handle` 控制通过、驳回和内部备注动作。普通员工默认没有处理权限，管理员通过角色配置授予审批人。
- **D-05:** Phase 18 不提供部门待办、全部待办、代办、转交或管理员代审批入口；这些会扩大权限模型，保留给后续阶段。
- **D-06:** “待我审批”默认进入待办视图，只显示当前用户的 `PENDING` 任务，并按分配时间或申请更新时间倒序展示最新任务。
- **D-07:** 列表筛选支持模板、申请人、部门、状态和日期范围；PC 使用横向筛选区，Mobile 使用底部筛选 sheet，延续 Phase 17 的响应式模式。
- **D-08:** 已办历史必须与待办清晰分离，推荐使用 tab 或分段控件：“待办”与“已处理”。已处理视图展示当前用户已处理过的任务，主要包括 `APPROVED` 和 `REJECTED`，并显示申请当前状态以区分“已通过并转入后续节点”“最终通过”和“已驳回”。
- **D-09:** 被申请人撤销或他人动作关闭的 `CANCELED` 任务不算审批人“已处理”主记录；如展示，应作为“已关闭/已失效”状态，不与审批人主动通过/驳回混淆。
- **D-10:** 列表行/卡片至少展示申请编号、模板名称和版本、申请人、部门、任务节点、任务状态、申请状态、分配/处理时间和主要操作。
- **D-11:** 审批详情使用任务 ID 作为主入口，展示该任务、关联申请、当前节点、表单内容和完整审批动态；详情应能从待办和已办历史进入。
- **D-12:** 表单内容必须使用 `ApprovalApplication.schemaSnapshot` + `formData` 只读渲染，复用 `GridFormRenderer mode="print"`；不得读取当前模板 schema 覆盖历史申请。
- **D-13:** 详情布局复用 Phase 17 申请详情的全页模式：桌面双列（左侧表单和申请信息，右侧当前任务/时间线/处理区），移动端单列，避免抽屉承载长表单。
- **D-14:** 时间线复用或扩展 `ApplicationTimeline`，按时间从旧到新展示 `SUBMIT`、`ASSIGN`、`APPROVE`、`REJECT`、`CANCEL`、`COMMENT` 等事件；意见和备注必须保留换行并在窄屏正常换行。
- **D-15:** 审批人详情可以展示审批所需的申请人/部门快照和完整节点动态，但不能允许审批人直接修改申请人的原始 `formData`。
- **D-16:** 通过和驳回动作只在当前用户的 `PENDING` 任务详情中显示；列表可以提供“查看/处理”入口，但不做首版列表内快捷审批，避免误操作。
- **D-17:** 通过使用确认弹窗，审批意见可选，最多 200 字；驳回使用确认弹窗，驳回意见必填，最多 200 字。两种动作都要显示当前申请编号、模板和节点，避免审批人处理错任务。
- **D-18:** 后端动作 API 应调用已有 `approveTask` / `rejectTask`，保持一个事务内完成任务关闭、动作记录、时间线追加、下一节点任务创建或终态更新。
- **D-19:** 审批成功后前端刷新详情、待办列表和已办历史；如果通过后进入下一节点，当前审批人的任务进入已处理，申请状态保持审批中并展示新的当前节点；如果最后节点通过，则申请进入已通过终态。
- **D-20:** 驳回沿用 Phase 15 锁定语义：驳回即终止申请，关闭全部未处理待办并进入 `REJECTED` 终态。Phase 18 不引入退回申请人修改或重新提交策略。
- **D-21:** 所有动作失败时使用现有 `BizError` 消息显示负向 Notify；任务已被处理、非本人任务、终态申请和权限不足都必须被后端拒绝。
- **D-22:** Mobile 待办列表使用卡片布局，卡片可直接进入详情；每个卡片的主信息顺序为申请类型、状态 chip、申请编号、申请人/部门、节点和分配时间。
- **D-23:** Mobile 详情使用单列内容流，审批操作区固定在底部 sticky 区域，包含“通过”和“驳回”两个主要动作；底部区域必须有 safe-area padding。
- **D-24:** 长表单、动态表格和签名字段在移动端不得被 sticky 操作区遮挡。详情内容需要足够的底部 padding，并沿用 Phase 17 对 print table 的移动端 block 化处理。
- **D-25:** Mobile 时间线必须可读，建议放在表单内容之后或当前任务卡之后；不要让时间线与操作按钮互相覆盖。
- **D-26:** 所有移动端审批按钮和筛选控件最小触控高度 44px，图标按钮必须有 `aria-label` 或 tooltip。
- **D-27:** Phase 18 覆盖 APR-06 的内部处理备注，但仅限审批人添加纯文本内部备注；标签/标记、处理字段和提交后编辑仍留给 Phase 19。
- **D-28:** 内部备注使用 `ApprovalActionType.COMMENT` 追加业务事件和时间线，不修改 `ApprovalApplication.formData`，不写入申请人正式提交内容。
- **D-29:** 内部备注应在审批人详情和审批任务时间线中可见，标题建议为“内部备注”；它不应在申请人自己的“我的申请”详情中暴露，除非后续阶段明确把备注改为申请人可见。规划时需要过滤 own-application timeline 或在 payload 中标记 internal visibility。
- **D-30:** 备注权限使用 `approval:task:handle`；允许当前 pending 任务审批人添加备注，也允许已经处理过该申请任务的审批人在已办详情中补充备注。具体是否允许非当前节点但有历史任务的审批人补充备注由实现阶段按安全性收紧。

### Claude's Discretion
- 具体文件名、API 子路径、Pinia store 名称和 DTO 命名可按现有 approval module 风格决定，但应保持任务视角与申请人 own-route 分离。
- 列表默认排序、状态 chip 颜色、空状态文案、加载骨架、错误提示和桌面详情右侧卡片顺序可由实现阶段按现有 Quasar 风格决定。
- 已办历史中 `CANCELED` 任务是否默认隐藏或作为“已关闭”筛选项展示可由 planner 结合实现复杂度决定，但不得把它标成审批人主动处理结果。

### Deferred Ideas (OUT OF SCOPE)
- 标签/标记、字段级提交后编辑、处理字段、归档查询、Excel/PDF 导出、统计和站内通知 - Phase 19.
- 部门/全部审批队列、管理员代审批、转交、委托、催办、超时升级和批量审批 - future approval operations phases.
- 退回申请人修改、重新提交策略、驳回复制重发、附件上传、条件分支、并行/会签和外部企业通知 - future advanced workflow phases.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APR-01 | 审批人可查看“待我审批”任务列表，并按模板、申请人、部门、状态和日期筛选 | Use an assignee-scoped `/approval/tasks` list query built on `ApprovalTask` + related `ApprovalApplication`, with separate `PENDING` and handled tabs, Prisma relation filters, and Quasar server-side pagination patterns [VERIFIED: .planning/REQUIREMENTS.md+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md][CITED: https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting][CITED: https://quasar.dev/vue-components/table/] |
| APR-02 | 审批人可打开审批详情，查看按 schema 快照渲染的表单数据、当前节点和完整时间线 | Reuse `GridFormRenderer mode="print"` and `ApplicationTimeline`, but drive detail by task id and task-aware serializer instead of applicant own-route detail [VERIFIED: frontend/src/pages/ApprovalApplicationDetailPage.vue+frontend/src/components/approval/ApplicationTimeline.vue+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
| APR-03 | 审批人可对待办执行通过或驳回，并填写审批意见；系统推进下一节点或进入最终状态 | Wrap existing `approveTask` / `rejectTask` service primitives in new task routes; do not duplicate workflow transition logic [VERIFIED: backend/src/modules/approval/application.service.ts+backend/src/modules/approval/__tests__/application.service.test.ts] |
| APR-04 | 审批人可查看已处理审批历史，区分已通过、已驳回和已转入后续节点的记录 | Handled-history must query tasks where current user already acted, expose task status plus current application status, and keep `CANCELED` out of the main handled bucket [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
| APR-05 | Mobile 审批详情页提供可读时间线和 sticky 操作区，动态表格、签名和长表单在窄屏可用 | Keep full-page detail; use bottom sticky actions with safe-area padding and preserve Phase 17 mobile print-table block rendering so long content is not obscured [VERIFIED: .planning/phases/17-my-applications-dynamic-submission/17-UI-SPEC.md+frontend/src/pages/ApprovalApplicationDetailPage.vue][CITED: https://quasar.dev/layout/page-sticky/] |
| APR-06 | 审批人可添加内部处理备注，备注独立于原始提交数据并显示在详情/时间线中 | Use `ApprovalActionType.COMMENT` through `appendApplicationEvent`, and add a visibility boundary so applicant own-detail does not leak internal remarks [VERIFIED: backend/src/modules/approval/application.service.ts+backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
</phase_requirements>

## Summary

Phase 18 is not a workflow-engine phase; the workflow engine already exists and is covered by `approveTask`, `rejectTask`, `appendApplicationEvent`, the `ApprovalTask` schema, and approval service tests [VERIFIED: backend/src/modules/approval/application.service.ts+backend/src/modules/approval/__tests__/application.service.test.ts]. The planning focus should therefore be a clean task-view slice: new assignee-scoped read APIs, new task DTO/store/page/detail route, permission-gated navigation, and mobile-safe detail actions [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md+frontend/src/router/routes.ts+frontend/src/layouts/MainLayout.vue].

The most important architectural guardrail is route separation: applicant-owned `/approval/applications` routes already encode applicant-only authorization and currently serialize all timeline events, so reusing them for approver work would produce both permission drift and internal-remark leakage [VERIFIED: backend/src/modules/approval/application.route.ts+backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md]. The plan should therefore treat `/approval/tasks` as a first-class module, with its own list/detail/action endpoints, task-oriented serializers, and task-oriented frontend types/store/pages [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].

Mobile behavior should reuse the Phase 17 full-page detail pattern rather than introducing drawers or list-row quick actions [VERIFIED: .planning/phases/17-my-applications-dynamic-submission/17-UI-SPEC.md+frontend/src/pages/ApprovalApplicationDetailPage.vue]. Quasar already supports server-side `QTable`, bottom-position dialogs, and page-scoped sticky content, so this phase can stay inside the existing stack without adding dependencies or framework upgrades [CITED: https://quasar.dev/vue-components/table/][CITED: https://quasar.dev/vue-components/dialog][CITED: https://quasar.dev/layout/page-sticky/][VERIFIED: frontend/package.json+backend/package.json].

**Primary recommendation:** Build a dedicated `approval task` backend/frontend slice that reuses existing transaction logic and snapshot rendering, adds timeline visibility filtering for internal remarks, and keeps mobile approval actions on the full detail page instead of in list rows [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md+backend/src/modules/approval/application.service.ts+frontend/src/pages/ApprovalApplicationDetailPage.vue].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale | Provenance |
|------------|--------------|----------------|-----------|------------|
| 待办/已办任务查询 | API / Backend | Database / Storage | Authorization is assignee-scoped and must be enforced server-side against `ApprovalTask.assigneeId`; the database already indexes `(assigneeId, status)` for this access path | [VERIFIED: backend/prisma/schema.prisma+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
| 任务筛选与分页交互 | Browser / Client | API / Backend | The UI owns filter controls and pagination state, but the server should apply the real filters and return paged results to keep permissions and counts authoritative | [VERIFIED: frontend/src/stores/approvalApplication.ts][CITED: https://quasar.dev/vue-components/table/][CITED: https://www.prisma.io/docs/orm/prisma-client/queries/pagination] |
| 审批详情快照渲染 | Browser / Client | API / Backend | The server returns historical snapshot payloads; the client renders them read-only via `GridFormRenderer mode="print"` | [VERIFIED: frontend/src/pages/ApprovalApplicationDetailPage.vue+frontend/src/components/renderer/GridFormRenderer.vue] |
| 通过/驳回事务推进 | API / Backend | Database / Storage | Transition safety, stale-task rejection, next-task creation, and terminal-state updates must stay inside a single database transaction | [VERIFIED: backend/src/modules/approval/application.service.ts][CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions] |
| 内部备注可见性边界 | API / Backend | Browser / Client | The backend must decide what timeline events the applicant route may see; the client should not receive internal-only comments on own-application detail | [VERIFIED: backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
| 移动端 sticky 审批操作区 | Browser / Client | — | Layout safety, touch targets, safe-area padding, and non-overlap with long form content are page-level UI responsibilities | [VERIFIED: .planning/phases/17-my-applications-dynamic-submission/17-UI-SPEC.md][CITED: https://quasar.dev/layout/page-sticky/] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard | Provenance |
|---------|---------|---------|--------------|------------|
| Vue | repo `3.5.12`; npm latest `3.5.33` published 2026-04-22 | Frontend runtime and page composition | The repo already uses Vue 3 SFC pages and Composition API throughout approval flows; Phase 18 should extend that baseline instead of introducing a parallel UI runtime | [VERIFIED: frontend/package.json+npm registry] |
| Quasar | repo `2.17.0`; npm latest `2.19.3` published 2026-04-06 | Responsive page shell, table/cards/dialogs/sticky UX | Existing approval pages, filters, dialogs, and status chips are all Quasar-based; `QTable`, `QDialog`, and `QPageSticky` directly cover this phase’s list/mobile needs | [VERIFIED: frontend/package.json+frontend/src/pages/ApprovalApplicationPage.vue][CITED: https://quasar.dev/vue-components/table/][CITED: https://quasar.dev/vue-components/dialog][CITED: https://quasar.dev/layout/page-sticky/] |
| Pinia | repo `2.2.4`; npm latest `3.0.4` published 2025-11-05 | Frontend task state, pagination state, async actions | Existing approval state uses Pinia option stores with async actions; task APIs should mirror that pattern for consistency and testability | [VERIFIED: frontend/package.json+frontend/src/stores/approvalApplication.ts][CITED: https://pinia.vuejs.org/core-concepts/actions.html] |
| Vue Router | repo `4.4.5`; npm latest `5.0.6` published 2026-04-22 | Dedicated list/detail routes and menu integration | The current app already uses route-level permission metadata for approval pages, which is the right extension point for `approval:task:list` routes | [VERIFIED: frontend/package.json+frontend/src/router/routes.ts] |
| Elysia | repo `1.1.24`; npm latest `1.4.28` published 2026-03-16 | Authenticated route modules with grouped prefix/schema guards | The backend already composes feature modules under `/api/v1` with per-route schemas and auth middleware; task routes should use the same grouping pattern | [VERIFIED: backend/package.json+backend/src/index.ts+backend/src/modules/approval/application.route.ts][CITED: https://elysiajs.com/essential/plugin] |
| Prisma / `@prisma/client` | repo `5.22.0`; npm latest `7.8.0` published 2026-04-22 | Task/application queries, transactions, relation filters | Approval persistence already lives in Prisma models and transaction-based services; task-list filters and action routes should stay inside the same ORM model | [VERIFIED: backend/package.json+backend/prisma/schema.prisma+backend/src/modules/approval/application.service.ts][CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions][CITED: https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting] |

### Supporting

| Library | Version | Purpose | When to Use | Provenance |
|---------|---------|---------|-------------|------------|
| Vitest | repo `0.34.6`; npm latest `4.1.5` published 2026-04-21 | Frontend store/type regression tests | Use for new task store/type tests and any UI helper logic that stays outside full DOM-heavy page tests | [VERIFIED: frontend/package.json+frontend/vitest.config.ts+npm registry] |
| `@vue/test-utils` | repo `2.4.6`; npm latest `2.4.8` published 2026-04-24 | Vue component mounting in frontend tests | Use only if planner chooses page/component tests beyond the current store/type-heavy pattern | [VERIFIED: frontend/package.json+npm registry] |
| Bun test | local runtime `1.3.12` | Backend approval service/route tests | Existing backend approval tests already run on Bun’s built-in test runner; new task route/service tests should stay there | [VERIFIED: backend/src/modules/approval/__tests__/application.service.test.ts+local environment] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Provenance |
|------------|-----------|----------|------------|
| New `/approval/tasks` module | Reuse `/approval/applications` own-routes | Faster to type, but wrong security boundary and wrong mental model; applicant routes are applicant-owned and currently leak full timeline payloads | [VERIFIED: backend/src/modules/approval/application.route.ts+backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
| Full-page detail with sticky action area | Drawer or modal detail | Drawers are a poor fit for long snapshot forms, timelines, dynamic tables, and mobile safe-area actions | [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md+.planning/phases/17-my-applications-dynamic-submission/17-UI-SPEC.md] |
| Reuse `approveTask` / `rejectTask` | Re-implement approval transitions in task service | Reimplementation would fork workflow semantics already covered by tests and increase race-condition risk | [VERIFIED: backend/src/modules/approval/application.service.ts+backend/src/modules/approval/__tests__/application.service.test.ts] |

**Installation:**
```bash
# No new package install is required for the Phase 18 core path.
# Reuse the existing frontend/backend dependency sets.
```

**Version verification:** The repo is behind current npm releases for multiple libraries, but this phase should stay on the repo baseline rather than bundling framework upgrades into a feature delivery [VERIFIED: frontend/package.json+backend/package.json+npm registry].

## Architecture Patterns

### System Architecture Diagram

```text
User (PC/Mobile)
  -> Vue Router `/approval/tasks` or `/approval/tasks/:id`
  -> ApprovalTaskPage / ApprovalTaskDetailPage
  -> Pinia `approvalTask` store
  -> Axios `/api/v1/approval/tasks`
  -> Elysia task route module
  -> authGuard(`approval:task:list` / `approval:task:handle`)
  -> task service
     -> Prisma list query on `ApprovalTask` + related `ApprovalApplication`
     -> Prisma transaction wrapper around `approveTask` / `rejectTask` / `appendApplicationEvent`
  -> PostgreSQL

Task detail path
  -> task detail serializer
  -> application snapshot (`schemaSnapshot` + `formData`)
  -> `GridFormRenderer mode="print"`
  -> task/application timeline
  -> internal remark visibility filter
```

### Recommended Project Structure

```text
backend/src/modules/approval/
├── task.route.ts          # assignee-scoped list/detail/action routes
├── task.service.ts        # task queries + action wrappers + serializers
└── __tests__/
    ├── task.route.test.ts
    └── task.service.test.ts

frontend/src/
├── types/approvalTask.ts          # task row/detail/filter DTOs + helpers
├── stores/approvalTask.ts         # list/detail/action state
├── pages/ApprovalTaskPage.vue     # pending/handled tabs + responsive list
├── pages/ApprovalTaskDetailPage.vue
└── stores/__tests__/approvalTask.test.ts
```

The file split above matches the repo’s existing approval feature decomposition and keeps task-view concerns separate from applicant-owned pages [VERIFIED: backend/src/modules/approval/application.route.ts+frontend/src/stores/approvalApplication.ts+frontend/src/pages/ApprovalApplicationPage.vue].

### Pattern 1: Assignee-Scoped Task Route Module

**What:** Create a dedicated Elysia module with prefix `/approval/tasks`, separate guards for read vs handle actions, and task-oriented body/query/params schemas [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md+backend/src/modules/approval/application.route.ts].  
**When to use:** For task list/detail/approve/reject/comment endpoints; do not attach these behaviors to applicant-owned routes [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Example:**

```typescript
// Source: existing application.route.ts pattern +
// https://elysiajs.com/essential/plugin
export const approvalTaskModule = new Elysia({ prefix: '/approval/tasks' })
  .guard({}, (app) =>
    app
      .use(authGuard('approval:task:list'))
      .get('/', ({ query, currentUser }) => listApprovalTasks(toActor(currentUser), query), {
        query: taskListQuerySchema,
      })
      .get('/:id', ({ params, currentUser }) => getApprovalTaskDetail(toActor(currentUser), Number(params.id)), {
        params: idParamsSchema,
      }),
  )
  .guard({}, (app) =>
    app
      .use(authGuard('approval:task:handle'))
      .post('/:id/approve', ({ params, body, currentUser }) =>
        approveApprovalTask(toActor(currentUser), Number(params.id), body.comment), {
          params: idParamsSchema,
          body: approveBodySchema,
        },
      )
      .post('/:id/reject', ({ params, body, currentUser }) =>
        rejectApprovalTask(toActor(currentUser), Number(params.id), body.comment), {
          params: idParamsSchema,
          body: rejectBodySchema,
        },
      )
      .post('/:id/comments', ({ params, body, currentUser }) =>
        addInternalRemark(toActor(currentUser), Number(params.id), body.comment), {
          params: idParamsSchema,
          body: commentBodySchema,
        },
      ),
  )
```

### Pattern 2: Prisma Task List Query With Related Application Filters

**What:** Query `ApprovalTask` as the primary model, scope by `assigneeId`, branch pending vs handled by task status, and filter through the related `application` object for template/applicant/department/date dimensions [VERIFIED: backend/prisma/schema.prisma+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**When to use:** Any list endpoint that must preserve task ownership semantics while still surfacing application context [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Example:**

```typescript
// Source: Prisma filtering/sorting docs +
// existing listOwnApplications Promise.all pattern
const where: Prisma.ApprovalTaskWhereInput = {
  assigneeId: actor.id,
  status: tab === 'pending' ? 'PENDING' : { in: ['APPROVED', 'REJECTED'] },
  application: {
    ...(templateId ? { templateId } : {}),
    ...(applicantName ? { applicantName: { contains: applicantName, mode: 'insensitive' } } : {}),
    ...(departmentName ? { applicantDepartmentName: { contains: departmentName, mode: 'insensitive' } } : {}),
  },
  ...(dateFrom || dateTo
    ? {
        [tab === 'pending' ? 'assignedAt' : 'handledAt']: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      }
    : {}),
}

const [rows, total] = await Promise.all([
  prisma.approvalTask.findMany({
    where,
    include: { application: true },
    orderBy: [{ [tab === 'pending' ? 'assignedAt' : 'handledAt']: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * size,
    take: size,
  }),
  prisma.approvalTask.count({ where }),
])
```

### Pattern 3: Snapshot Detail + Timeline Visibility Filter

**What:** Detail serialization should compose task data, related application snapshot data, and timeline events, but the serializer must distinguish approver-visible internal comments from applicant-visible timeline rows [VERIFIED: backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**When to use:** Any detail payload that includes `COMMENT` events or task-level histories [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Example:**

```typescript
// Source: existing serializeDetail() pattern + Phase 18 visibility rule
function serializeTaskDetail(task: TaskWithRelations) {
  return {
    id: task.id,
    status: task.status,
    assignedAt: task.assignedAt,
    handledAt: task.handledAt,
    application: {
      id: task.application.id,
      applicationNo: task.application.applicationNo,
      status: task.application.status,
      templateName: task.application.templateName,
      templateVersion: task.application.templateVersion,
      currentNodeName: task.application.currentNodeName,
      formData: task.application.formData,
      schemaSnapshot: task.application.schemaSnapshot,
    },
    timeline: task.application.timelineEvents.map((event) => ({
      ...event,
      isInternal: event.type === 'COMMENT' && event.payload && (event.payload as any).visibility === 'internal',
    })),
  }
}
```

### Pattern 4: Full-Page Mobile Detail With Bottom Sticky Actions

**What:** Keep the task detail as a page, not a drawer, and reserve bottom space for sticky approve/reject actions so long snapshot content can scroll without being obscured [VERIFIED: .planning/phases/17-my-applications-dynamic-submission/17-UI-SPEC.md+frontend/src/pages/ApprovalApplicationDetailPage.vue].  
**When to use:** Mobile detail only; desktop can keep actions in the right column card [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Example:**

```vue
<!-- Source: Phase 17 detail layout + https://quasar.dev/layout/page-sticky/ -->
<q-page padding class="approval-task-detail-page">
  <div class="detail-wrapper">
    <!-- summary + timeline + GridFormRenderer -->
  </div>

  <q-page-sticky v-if="isMobile && canHandleTask" position="bottom" expand>
    <div class="mobile-action-bar">
      <q-btn color="positive" label="通过" class="col" />
      <q-btn color="negative" outline label="驳回" class="col" />
    </div>
  </q-page-sticky>
</q-page>
```

### Anti-Patterns to Avoid

- **复用 applicant own-route 充当 approver route：** This breaks authorization semantics and makes internal visibility filtering harder because the existing route contract is applicant-centric [VERIFIED: backend/src/modules/approval/application.route.ts+backend/src/modules/approval/application-submission.service.ts].
- **读取当前模板 schema 渲染历史任务：** This would corrupt historical readability after template edits; detail must stay on `schemaSnapshot` + `formData` [VERIFIED: frontend/src/pages/ApprovalApplicationDetailPage.vue+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].
- **在列表里直接“快捷通过/驳回”：** Locked scope explicitly avoids list-level approval to reduce mis-click risk and mobile UX errors [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].
- **把内部备注写回 `formData`：** `COMMENT` events are append-only business events, not applicant-submitted data mutations [VERIFIED: backend/src/modules/approval/application.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].
- **移动端用 fixed bar 但不补底部 padding：** This will cover dynamic tables, signatures, and bottom timeline items on narrow screens [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md+.planning/phases/17-my-applications-dynamic-submission/17-UI-SPEC.md].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why | Provenance |
|---------|-------------|-------------|-----|------------|
| 审批状态流转 | New ad hoc task state machine | Existing `approveTask` / `rejectTask` transaction functions | They already enforce assignee checks, stale-task protection, next-node creation, and terminal rejection semantics | [VERIFIED: backend/src/modules/approval/application.service.ts+backend/src/modules/approval/__tests__/application.service.test.ts] |
| 历史表单只读渲染 | Custom read-only renderer for approval detail | `GridFormRenderer mode="print"` | The project already solved snapshot print rendering, including mobile table block rendering | [VERIFIED: frontend/src/components/renderer/GridFormRenderer.vue+frontend/src/pages/ApprovalApplicationDetailPage.vue] |
| 时间线组件 | New task-only timeline renderer from scratch | Extend/reuse `ApplicationTimeline` | Existing component already orders old-to-new, preserves line breaks, and maps workflow titles | [VERIFIED: frontend/src/components/approval/ApplicationTimeline.vue] |
| 响应式断点逻辑 | Per-page custom breakpoint constants | `useResponsive()` | The repo already standardizes desktop/mobile split on Quasar screen state | [VERIFIED: frontend/src/composables/useResponsive.ts] |
| 列表分页协议 | Home-grown table pagination contract | Quasar `QTable` request/rowsNumber pattern + Pinia page/size store state | The current list/store pattern already fits server-side pagination and is consistent with existing approval pages | [VERIFIED: frontend/src/pages/ApprovalApplicationPage.vue+frontend/src/stores/approvalApplication.ts][CITED: https://quasar.dev/vue-components/table/] |

**Key insight:** This phase’s hard parts are authorization boundaries and timeline visibility, not UI widgets or workflow math, so reuse the existing primitives and spend planning effort on the boundaries [VERIFIED: backend/src/modules/approval/application.service.ts+backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].

## Common Pitfalls

### Pitfall 1: Applicant and Approver Read Models Drift Together

**What goes wrong:** A planner reuses applicant list/detail serializers for approver task work and later patches behavior with conditionals [VERIFIED: backend/src/modules/approval/application.route.ts+backend/src/modules/approval/application-submission.service.ts].  
**Why it happens:** The application detail already contains most of the payload shape, so reuse looks superficially cheaper [VERIFIED: backend/src/modules/approval/application-submission.service.ts].  
**How to avoid:** Make `ApprovalTask` the list/detail root model from day one and keep applicant routes read-only for applicant ownership [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Warning signs:** The design starts discussing “extra flags” on `/approval/applications/:id` instead of a new `/approval/tasks/:id` contract [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].

### Pitfall 2: Internal Remarks Leak Into Applicant Detail

**What goes wrong:** `COMMENT` events are appended correctly but still appear in applicant “我的申请” detail because the own-detail serializer currently returns all timeline events [VERIFIED: backend/src/modules/approval/application.service.ts+backend/src/modules/approval/application-submission.service.ts].  
**Why it happens:** Phase 17 had no internal-only timeline event type, so the existing serializer has no visibility filter yet [VERIFIED: backend/src/modules/approval/application-submission.service.ts].  
**How to avoid:** Add an explicit visibility rule for `COMMENT` events in own-application serialization or mark internal payloads and filter them before response construction [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Warning signs:** The planner says “remarks are just timeline events, so nothing else changes” [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].

### Pitfall 3: Handled History Uses Application Status Alone

**What goes wrong:** A handled list derived from application status misclassifies “我已通过但流程仍在下一节点审批中” records [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Why it happens:** Application status alone cannot distinguish task outcome from whole-process outcome in serial approval flows [VERIFIED: backend/src/modules/approval/application.service.ts+backend/src/modules/approval/__tests__/application.service.test.ts].  
**How to avoid:** Base handled history on task rows handled by the current approver, and display both task status and current application status in the list/detail UI [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Warning signs:** The design proposes a handled-history query over `ApprovalApplication` without referencing `ApprovalTask.handledAt` [VERIFIED: backend/prisma/schema.prisma].

### Pitfall 4: Mobile Sticky Actions Cover Long Snapshot Content

**What goes wrong:** Approve/reject buttons overlap dynamic tables, signatures, or the last timeline items on narrow screens [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Why it happens:** Pure CSS `position: sticky` or `fixed` bars are added without page-bottom spacing and safe-area handling [VERIFIED: .planning/phases/17-my-applications-dynamic-submission/17-UI-SPEC.md].  
**How to avoid:** Keep detail as a full page, reserve bottom padding in the scroll container, and use Quasar page-sticky semantics or equivalent layout-safe positioning [CITED: https://quasar.dev/layout/page-sticky/][VERIFIED: frontend/src/pages/ApprovalApplicationDetailPage.vue].  
**Warning signs:** The mobile mock shows the form touching the bottom of the viewport with no reserved action space [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].

### Pitfall 5: Task Action Routes Trust Frontend Preconditions

**What goes wrong:** The UI hides buttons correctly, but backend action routes forget to re-check pending status, assignee, or permission context [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].  
**Why it happens:** Engineers mistake client gating for authorization [ASSUMED].  
**How to avoid:** Keep action routes thin and delegate to the already-tested transaction services that reject stale or foreign tasks [VERIFIED: backend/src/modules/approval/application.service.ts+backend/src/modules/approval/__tests__/application.service.test.ts].  
**Warning signs:** New route code updates task/application tables directly instead of calling `approveTask` / `rejectTask` [VERIFIED: backend/src/modules/approval/application.service.ts].

## Code Examples

Verified patterns from official sources and the current codebase:

### Async Pinia Action Wrapper

```typescript
// Source: frontend/src/stores/approvalApplication.ts
// and https://pinia.vuejs.org/core-concepts/actions.html
export const useApprovalTaskStore = defineStore('approvalTask', {
  state: () => ({
    rows: [],
    loading: false,
    detailLoading: false,
    actionLoading: false,
  }),
  actions: {
    async fetchList(params?: ApprovalTaskListFilters) {
      this.loading = true
      try {
        const { data } = await api.get('/approval/tasks', { params })
        this.rows = data.rows
        return data
      } finally {
        this.loading = false
      }
    },
  },
})
```

### Transactional Task Handling Boundary

```typescript
// Source: backend/src/modules/approval/application.service.ts
// and https://www.prisma.io/docs/orm/prisma-client/queries/transactions
export async function approveApprovalTask(actor: ApprovalActor, taskId: number, comment?: string) {
  const normalized = comment?.trim() ? comment.trim().slice(0, 200) : undefined
  return approveTask(taskId, actor, normalized)
}
```

### Quasar Server-Side Pagination Contract

```vue
<!-- Source: https://quasar.dev/vue-components/table/ -->
<q-table
  :rows="store.rows"
  :loading="store.loading"
  row-key="id"
  :pagination="{ page: store.page, rowsPerPage: store.size, rowsNumber: store.total }"
  :rows-per-page-options="[10, 20, 50]"
  @request="onRequest"
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact | Provenance |
|--------------|------------------|--------------|--------|------------|
| Vuex-style centralized store | Pinia option stores with async actions | Pinia docs current as of 2026-04-26 | Match the repo’s existing approval stores; do not introduce a second state-management style for Phase 18 | [CITED: https://pinia.vuejs.org/core-concepts/actions.html][VERIFIED: frontend/src/stores/approvalApplication.ts] |
| Re-rendering from live template definitions | Snapshot rendering from `schemaSnapshot` + `formData` | Locked in Phases 15-17 | Historical approval detail remains stable after template edits | [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md+frontend/src/pages/ApprovalApplicationDetailPage.vue] |
| Application-level history as the sole approver read model | Task-level history plus current application status | Required by Phase 18 handled-history semantics | Lets the same approver distinguish “我已处理但流程仍在后续节点” from final approval/rejection | [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |

**Deprecated/outdated:**

- Reusing applicant own-routes for approver handling is outdated for this repo because applicant and approver scopes now have explicitly different permissions and visibility rules [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md+backend/prisma/seed.ts].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Engineers may be tempted to trust frontend gating for task-action authorization | Common Pitfalls / Pitfall 5 | Low; the plan still mandates backend enforcement, but wording about the cause is interpretive rather than code-verified |

## Open Questions (RESOLVED)

1. **内部备注的“内外可见性”字段落点放哪里最稳妥？**
   - What we know: Applicant own-detail currently serializes all timeline events, and Phase 18 requires internal remarks to stay hidden from applicant routes [VERIFIED: backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].
   - RESOLVED: Phase 18 uses backend serializer-side filtering on the applicant own-detail response, while the approver task-detail route may show internal `COMMENT` events. If a payload visibility marker is added later it is optional future hardening, not a Phase 18 requirement [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].
   - Chosen contract: Implement the own-detail visibility boundary in `application-submission.service.ts` and keep approver-task serialization free to include internal remarks without reusing applicant route semantics [VERIFIED: backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].

2. **`CANCELED` handled-history rows 默认隐藏还是归入“已关闭”筛选项？**
   - What we know: Phase 18 forbids treating `CANCELED` as an approver-acted result, but allows planner discretion on whether it is hidden or placed under a distinct closed bucket [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].
   - RESOLVED: `CANCELED` tasks are hidden from the main handled-history default and never counted as an approver-handled result. They may appear only under an explicit `CANCELED` / `已关闭` filter if the UI implements that separate state [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].
   - Chosen contract: Pending defaults stay untouched, handled defaults stay focused on approver actions (`APPROVED` / `REJECTED`), and any closed-state exposure must remain opt-in and visually distinct from approver outcomes [VERIFIED: .planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].

## Environment Availability

| Dependency | Required By | Available | Version | Fallback | Provenance |
|------------|------------|-----------|---------|----------|------------|
| Node.js | Frontend build/tests | ✓ | `v22.20.0` | — | [VERIFIED: local environment] |
| npm | Frontend package scripts and registry checks | ✓ | `10.9.3` | — | [VERIFIED: local environment] |
| Bun | Backend runtime/tests/Prisma scripts | ✓ | `1.3.12` | — | [VERIFIED: local environment+backend/package.json] |
| Docker | Project-standard PostgreSQL/backend/frontend boot path | ✓ | `29.4.0` | — | [VERIFIED: local environment+docker-compose.yml] |
| PostgreSQL host CLI (`psql`, `pg_isready`) | Host-side DB probing and manual verification | ✗ | — | Use Dockerized `postgres:16-alpine` service and `docker exec oa-postgres ...` | [VERIFIED: local environment+docker-compose.yml] |
| Root `.env` / `backend/.env` | Backend JWT/DB configuration | ✓ | files present | Use process-local `DATABASE_URL` override only when host-side Prisma cannot resolve Docker hostname | [VERIFIED: .env+backend/.env+.planning/phases/15-approval-data-model-state-machine/15-01-SUMMARY.md] |

**Missing dependencies with no fallback:**

- None identified for planning; execution only blocks if neither Dockerized PostgreSQL nor an equivalent database is running [VERIFIED: docker-compose.yml+.planning/PROJECT.md].

**Missing dependencies with fallback:**

- Host-side PostgreSQL CLI tools are missing, but the repo-standard Docker Compose PostgreSQL service provides a viable replacement for test setup and manual DB inspection [VERIFIED: docker-compose.yml+.planning/PROJECT.md].

## Validation Architecture

The `workflow.nyquist_validation` key is absent from `.planning/config.json`, so validation architecture remains enabled by default [VERIFIED: .planning/config.json].

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Backend: Bun test; Frontend: Vitest `0.34.6` with `happy-dom` [VERIFIED: backend/src/modules/approval/__tests__/application.service.test.ts+frontend/package.json+frontend/vitest.config.ts] |
| Config file | Frontend: `frontend/vitest.config.ts`; Backend: none, uses Bun built-in runner [VERIFIED: frontend/vitest.config.ts+backend/src/modules/approval/__tests__/application.service.test.ts] |
| Quick run command | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts src/modules/approval/__tests__/task.route.test.ts && cd ../frontend && npm test -- src/stores/__tests__/approvalTask.test.ts src/types/__tests__/approvalTask.test.ts` [ASSUMED] |
| Full suite command | `cd backend && bun test && bun run build && cd ../frontend && npm test && npm run build` [ASSUMED] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APR-01 | Assignee-only pending/handled list with filters | backend unit/integration + frontend store | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts src/modules/approval/__tests__/task.route.test.ts` | ❌ Wave 0 |
| APR-02 | Task detail returns snapshot form data and full visible timeline | backend route/service + frontend type/store | `cd backend && bun test src/modules/approval/__tests__/task.route.test.ts && cd ../frontend && npm test -- src/types/__tests__/approvalTask.test.ts` | ❌ Wave 0 |
| APR-03 | Approve/reject opinion validation and state refresh | backend service/route + frontend store | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts && cd ../frontend && npm test -- src/stores/__tests__/approvalTask.test.ts` | ❌ Wave 0 |
| APR-04 | Handled history distinguishes task outcome from current application state | backend service + frontend type/store | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts` | ❌ Wave 0 |
| APR-05 | Mobile sticky action layout and non-overlap contract | manual UI check + optional component test | `npm test -- src/pages/__tests__/ApprovalTaskDetailPage.test.ts` | ❌ Wave 0 |
| APR-06 | Internal remark append and applicant-side visibility filter | backend service/route | `cd backend && bun test src/modules/approval/__tests__/task.service.test.ts src/modules/approval/__tests__/application-submission.service.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Run the focused backend and frontend task tests for the changed surface area [VERIFIED: repo test patterns from backend/src/modules/approval/__tests__ and frontend/src/stores/__tests__].
- **Per wave merge:** Run approval-module backend tests plus frontend approval task store/type tests [VERIFIED: backend/src/modules/approval/__tests__/application.service.test.ts+frontend/src/stores/__tests__/approvalApplication.test.ts].
- **Phase gate:** Full backend/frontend test + build pass before `/gsd-verify-work` [ASSUMED].

### Wave 0 Gaps

- [ ] `backend/src/modules/approval/__tests__/task.service.test.ts` — assignee-only list/detail, approve/reject/comment boundary, handled-history classification
- [ ] `backend/src/modules/approval/__tests__/task.route.test.ts` — route contract, body schema, permission boundary, serialization
- [ ] `frontend/src/stores/__tests__/approvalTask.test.ts` — task store list/detail/action loading state and endpoint wiring
- [ ] `frontend/src/types/__tests__/approvalTask.test.ts` — status labels/helpers, handled-state helpers, payload key guardrails
- [ ] `frontend/src/pages/__tests__/ApprovalTaskDetailPage.test.ts` — optional if planner chooses to lock mobile sticky layout behavior in automated tests

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control | Provenance |
|---------------|---------|------------------|------------|
| V2 Authentication | yes | `authGuard(...)` on task routes with existing JWT-based auth stack | [VERIFIED: backend/src/modules/approval/application.route.ts+backend/src/index.ts] |
| V3 Session Management | yes | Existing access/refresh JWT split and backend startup secret checks | [VERIFIED: backend/src/index.ts] |
| V4 Access Control | yes | Server-side assignee checks in `approveTask` / `rejectTask` plus route-level `approval:task:list` / `approval:task:handle` permissions | [VERIFIED: backend/src/modules/approval/application.service.ts+backend/prisma/seed.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
| V5 Input Validation | yes | Elysia TypeBox route schemas, max-length comment enforcement, normalized server-side strings | [VERIFIED: backend/src/modules/approval/application.route.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
| V6 Cryptography | yes | Existing JWT and bcrypt libraries; Phase 18 should not introduce custom crypto | [VERIFIED: backend/package.json+backend/src/index.ts+backend/prisma/seed.ts] |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation | Provenance |
|---------|--------|---------------------|------------|
| IDOR on task detail/action | Elevation of Privilege / Information Disclosure | Scope list/detail by assignee and re-check assignee in action transaction | [VERIFIED: backend/src/modules/approval/application.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
| Stale-task double submit | Tampering | Keep `updateMany` claim-on-pending pattern and fail when affected row count is not `1` | [VERIFIED: backend/src/modules/approval/application.service.ts] |
| Internal remark leakage to applicant | Information Disclosure | Filter `COMMENT` visibility on applicant own-detail serialization | [VERIFIED: backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md] |
| Over-posting trusted fields | Tampering | Keep route body schemas limited to comment/opinion payloads; never accept snapshot or applicant identity fields from clients | [VERIFIED: backend/src/modules/approval/__tests__/application.route.test.ts] |
| Injection through filters | Tampering | Use Prisma query objects instead of string-built SQL | [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting][VERIFIED: backend/src/modules/approval/application-submission.service.ts] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md` - locked scope, permissions, mobile UX, internal remark visibility, and API direction
- `.planning/ROADMAP.md` - Phase 18 goal, dependency, requirements, success criteria
- `.planning/REQUIREMENTS.md` - APR-01 through APR-06 requirement text
- `backend/prisma/schema.prisma` - approval task/action/timeline schema and indexes
- `backend/src/modules/approval/application.service.ts` - transaction semantics for approve/reject/comment
- `backend/src/modules/approval/application-submission.service.ts` - current applicant list/detail serializers and timeline exposure
- `backend/src/modules/approval/application.route.ts` - Elysia route/module schema pattern
- `frontend/src/pages/ApprovalApplicationPage.vue` - Quasar list/filter/mobile-card pattern
- `frontend/src/pages/ApprovalApplicationDetailPage.vue` - full-page snapshot detail pattern and mobile print-table handling
- `frontend/src/stores/approvalApplication.ts` - Pinia async action/store shape
- `frontend/src/components/approval/ApplicationTimeline.vue` - reusable timeline rendering behavior
- `frontend/package.json`, `backend/package.json` - repo baseline library versions
- npm registry (`npm view`) - current package versions and publish dates for Vue, Quasar, Pinia, Vue Router, Elysia, Prisma, Vitest, and `@vue/test-utils`
- Quasar Table docs: https://quasar.dev/vue-components/table/
- Quasar Dialog docs: https://quasar.dev/vue-components/dialog
- Quasar QPageSticky docs: https://quasar.dev/layout/page-sticky/
- Pinia Actions docs: https://pinia.vuejs.org/core-concepts/actions.html
- Prisma Transactions docs: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- Prisma Filtering/Sorting docs: https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting
- Prisma Pagination docs: https://www.prisma.io/docs/orm/prisma-client/queries/pagination
- Elysia Plugin/Group/Guard docs: https://elysiajs.com/essential/plugin and https://elysiajs.com/tutorial/getting-started/guard

### Secondary (MEDIUM confidence)

- `.planning/phases/17-my-applications-dynamic-submission/17-PATTERNS.md` - implementation decomposition patterns to mirror for task-view files
- `.planning/phases/17-my-applications-dynamic-submission/17-UI-SPEC.md` - approved responsive and mobile interaction contract reused by Phase 18
- `.planning/PROJECT.md` - project-level one-command Docker expectation and current milestone framing

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All recommended libraries are already present in the repo and their broader capabilities were checked against official docs and npm registry [VERIFIED: frontend/package.json+backend/package.json+npm registry].
- Architecture: HIGH - The plan rides directly on existing approval models, tests, serializers, and page/store patterns rather than proposing a new subsystem [VERIFIED: backend/src/modules/approval/application.service.ts+frontend/src/pages/ApprovalApplicationDetailPage.vue].
- Pitfalls: MEDIUM - The visibility leak and handled-history risks are strongly evidenced, and the chosen Phase 18 contracts are now explicit: serializer-side applicant filtering for internal remarks, plus default-hidden `CANCELED` history outside explicit closed filters [VERIFIED: backend/src/modules/approval/application-submission.service.ts+.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md].

**Research date:** 2026-04-26  
**Valid until:** 2026-05-26 for repo structure and phase scope; re-check npm registry versions sooner if the planner decides to combine this phase with dependency upgrades [VERIFIED: current research session].
