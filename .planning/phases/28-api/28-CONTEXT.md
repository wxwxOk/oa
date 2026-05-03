# Phase 28: 工作记录数据模型 + 后端 API - Context

**Gathered:** 2026-05-03 (auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

建立 v1.5 固定工作记录模块的后端基础：新增独立 `WorkReport` Prisma 模型、日报/周报/月报周期枚举和草稿/已提交状态，统一由后端计算周期边界并保证同一员工同一周期类型同一周期只保留一条记录；补齐工作记录权限种子和对象级可见性边界；交付 `/api/v1/work-reports` 列表、详情、创建草稿、编辑草稿和提交接口及 focused backend tests。Phase 28 只交付数据层、权限、周期口径和后端 API 契约；员工 PC/Mobile 填报页面属于 Phase 29，部门汇总视图属于 Phase 30，Excel 导出和 UAT 收尾属于 Phase 31。

</domain>

<decisions>
## Implementation Decisions

### 固定模型与字段边界
- **D-01:** 工作记录采用固定业务模型，不复用 `ApprovalApplication`、`Submission` 或自定义表单 JSONB 作为主数据；新增独立 `WorkReport` 模型并挂在固定工作记录模块下。
- **D-02:** 新增枚举建议为 `WorkReportPeriodType`（`DAILY`、`WEEKLY`、`MONTHLY`）和 `WorkReportStatus`（`DRAFT`、`SUBMITTED`）；Phase 28 只需要 `DRAFT -> SUBMITTED` 单向流转。
- **D-03:** `WorkReport` 保存固定字段：记录编号、周期类型、周期开始、周期结束、状态、完成事项、下一周期计划、问题风险、需要协助、备注、提交人 ID/姓名快照、部门 ID/名称快照、提交时间、创建/更新时间。
- **D-04:** 提交人和部门快照在创建草稿时从当前登录用户读取并写入；历史记录不随用户改名或部门调整而静默变化。
- **D-05:** 工作记录不新增审批、退回、评论、评分、提醒、待办或 AI 总结字段；这些都保持 v1.5 out of scope 或后续增强。

### 周期计算与唯一性
- **D-06:** 前端/调用方只提交 `periodType` 和一个周期锚点日期（建议命名 `periodDate`）；后端 helper 统一计算 `periodStart` 与 `periodEnd`，不信任客户端传入的原始周期边界。
- **D-07:** 日报周期为锚点日期当天，周报周期采用 ISO 周一至周日，月报周期采用自然月第一天至最后一天；所有周期校验和列表日期过滤都在 service helper 中集中处理，避免 route 和前端各算一套。
- **D-08:** 数据库层增加唯一约束 `@@unique([submitterId, periodType, periodStart])`，应用层创建/编辑草稿前也返回清晰重复错误；草稿和已提交都计入唯一性，避免同周期多草稿导致后续提交冲突。
- **D-09:** 编辑草稿允许调整周期锚点和内容，但若目标周期已存在本人另一条记录则拒绝；已提交记录默认不可编辑或重新提交。

### 权限与可见性
- **D-10:** 新增工作记录权限码并集中放入 `backend/prisma/seed.ts`：`work-report:create`、`work-report:own`、`work-report:department`、`work-report:all`、`work-report:export`。
- **D-11:** `ADMIN` 继续通过全量权限获得所有工作记录权限；`EMPLOYEE` 默认只获得 `work-report:create` 和 `work-report:own`，不默认获得部门、全部或导出权限。
- **D-12:** 普通员工只能创建、查看、编辑草稿和提交自己的工作记录；管理员或拥有查看权限的用户可以查看范围内记录，但不能替员工创建、编辑或提交他人草稿。
- **D-13:** `work-report:department` 范围按当前用户所属部门与记录中的提交人部门快照 ID 精确匹配；`work-report:all` 可查看全部记录；`ADMIN` 视同全部范围。
- **D-14:** 后端所有列表、详情、编辑和提交接口都必须在 service 层基于 `currentUser`、角色权限、提交人归属和部门范围做对象级校验；前端路由或按钮隐藏不是安全边界。
- **D-15:** `work-report:export` 本阶段只做权限种子预留，具体导出接口和 Excel 安全口径属于 Phase 31。

### 后端 API 契约
- **D-16:** 新增 `backend/src/modules/work-report/`，至少拆分 `work-report.route.ts` 和 `work-report.service.ts`；模块挂载为 `/api/v1/work-reports` 并在 `backend/src/index.ts` 的 `/api/v1` group 下注册。
- **D-17:** 列表接口 `GET /work-reports` 返回 `{ rows, total, page, size }`，支持 `periodType`、`status`、`dateFrom`、`dateTo`、`keyword`、`submitterId`、`departmentId`、`page`、`size` 等受控筛选；空筛选不生效，`size` 最大 100。
- **D-18:** 列表范围先套对象级可见性，再叠加筛选条件；普通员工即使传 `submitterId` 或 `departmentId` 也不能越权扩大范围。
- **D-19:** 详情接口 `GET /work-reports/:id` 返回记录基础字段、固定模板内容、状态、提交人/部门快照、提交时间和创建/更新时间；日期统一序列化为 ISO 字符串，前端后续按日期部分展示。
- **D-20:** 写入接口采用草稿优先契约：`POST /work-reports` 创建当前用户草稿，`PUT /work-reports/:id` 仅允许草稿提交人编辑，`POST /work-reports/:id/submit` 校验必填内容后把状态改为 `SUBMITTED` 并写入 `submittedAt`。
- **D-21:** 提交时至少要求“完成事项”和“下一周期计划”trim 后非空；问题风险、需要协助和备注可为空，用户可填写“无”，但后端不强制为必填。
- **D-22:** Phase 28 不提供汇总、未提交人员、提醒、导出或前端页面接口；如需为 Phase 30 复用过滤能力，可在 service 中保持列表 scope/filter helper 可组合。

### 验证与性能约束
- **D-23:** Prisma 模型需要为常用筛选和可见性字段建立索引：`submitterId`、`submitterDepartmentId`、`periodType`、`status`、`periodStart`、`createdAt`/`updatedAt`，并保留唯一约束覆盖重复周期。
- **D-24:** focused backend tests 优先覆盖 schema/route contract、权限种子、周期 helper、重复周期、草稿编辑/提交状态、对象级可见性和分页/筛选上限。
- **D-25:** 错误提示需稳定且可理解：周期类型无效、日期格式无效、重复周期、缺少权限、非草稿不可编辑、提交必填字段为空都应返回 `BizError` 或同等业务错误。
- **D-26:** `prisma generate`/migration gate 是 Phase 28 完成条件；后续 Phase 29-31 依赖枚举值、字段名和 API 路径稳定，不应随意改名。

### the agent's Discretion
- 记录编号格式、枚举命名大小写、具体错误 code、是否抽出 `work-report.period.ts`/`work-report.state.ts` 等 helper 文件由 planner/实现者按现有后端风格决定。
- 固定字段在数据库中用多列 `String`/`Text` 还是在 Prisma `String` 字段上由迁移默认映射，交由实现者在满足查询、导出和可维护性的前提下确定；不得把主记录内容整体塞进动态 JSONB 主字段。
- 周期 helper 内部如何处理时区细节由实现者决定，但 API、唯一约束和汇总口径必须保持后端唯一来源。
- 测试可采用 source contract + focused service tests 的轻量方式，不必为 Phase 28 搭建完整端到端 UI 流程。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 28 goal, dependency on Phase 27/19, success criteria and Phase 29-31 boundaries.
- `.planning/REQUIREMENTS.md` — `WRPT-01` through `WRPT-04`, `VIS-01` through `VIS-04`, `NFR-01` and `NFR-02`; also v1.5 out-of-scope list.
- `.planning/PROJECT.md` — v1.5 fixed work-report module decision, stack constraints, active scope and out-of-scope boundaries.
- `.planning/STATE.md` — current Phase 28 position and v1.5 readiness.

### Prior locked decisions and reusable patterns
- `.planning/phases/20-api/20-CONTEXT.md` — fixed business module backend pattern, permission seed pattern and `/api/v1/visits` route contract.
- `.planning/phases/24-api/24-CONTEXT.md` — fixed reimbursement model, permission, list filter, draft/submit and backend object-visibility decisions.
- `.planning/phases/26-reimbursement-review-signature/26-CONTEXT.md` — transaction-bound state change, service-level authorization and action safety patterns.
- `.planning/phases/27-reimbursement-export-validation/27-CONTEXT.md` — export permission boundary and future Phase 31 Excel safety precedent.
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-CONTEXT.md` — RBAC/export and append-only business event boundaries useful for later phases.
- `.planning/phases/21-crud/21-CONTEXT.md` — fixed-module list/filter/detail/menu conventions for downstream Phase 29 alignment.

### Backend source files
- `backend/prisma/schema.prisma` — current enum/model/relation/index conventions, `VisitRecord`, `ReimbursementApplication` and permission relations.
- `backend/prisma/seed.ts` — centralized permission arrays, `EMPLOYEE_PERMISSION_CODES`, ADMIN full-permission assignment and fixed-module permission test targets.
- `backend/src/index.ts` — `/api/v1` module registration pattern.
- `backend/src/middlewares/auth.ts` — `authGuard(requiredPerm)` and `currentUser` permissions/roles derivation.
- `backend/src/utils/errors.ts` — `BizError`, `notFound`, `forbidden` and `unauthorized` response pattern.
- `backend/src/modules/visit/visit.route.ts` — fixed-module list/detail/write route, query/body schema, filter normalization, stats helper and `{ rows, total, page, size }` serialization style.
- `backend/src/modules/reimbursement/reimbursement.route.ts` — closest fixed-module CRUD route contract, static-route-before-detail ordering, route guards and attachment/review route grouping style.
- `backend/src/modules/reimbursement/reimbursement.service.ts` — strongest service precedent for pagination, date boundaries, visibility filters, applicant snapshots, draft mutation, submit transaction and serialization.
- `backend/src/modules/reimbursement/reimbursement.state.ts` — compact explicit status transition helper style to adapt for `DRAFT -> SUBMITTED`.
- `backend/src/modules/approval/application-submission.service.ts` — applicant-owned draft/list/detail/submit helper patterns and date filter normalization.
- `backend/src/modules/visit/__tests__/visit.route.test.ts` — fixed-module route contract and query/body schema tests.
- `backend/src/modules/reimbursement/__tests__/reimbursement.route.test.ts` — route signature, guard, trusted-field and export ordering contract tests.
- `backend/src/modules/role/__tests__/reimbursement-permissions.seed.test.ts` — fixed-module permission seed test pattern to clone for `work-report` permissions.
- `backend/package.json` — Bun/Prisma scripts and dependency baseline; Phase 28 should not need new backend dependencies.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/schema.prisma`: already contains fixed-module `VisitRecord` and `ReimbursementApplication` models with explicit fields, relations, timestamps and indexes; `WorkReport` should follow this style and add relations to `User`/`Department` only where needed.
- `backend/prisma/seed.ts`: permission definitions and role grants are centralized; adding `WORK_REPORT_PERMISSION_CODES` plus `PERMISSIONS` entries keeps ADMIN inheritance automatic and EMPLOYEE grants explicit.
- `backend/src/middlewares/auth.ts`: exposes `currentUser.id`, `realName`, `roleCodes` and `permissions`, which are enough to build a `WorkReportActor` and enforce own/department/all scopes.
- `backend/src/modules/reimbursement/reimbursement.service.ts`: provides reusable patterns for `normalizePage`, `normalizeSize`, `parseDateBoundary`, actor snapshots, visibility `where` building, draft mutation guards and submit transactions.
- `backend/src/modules/reimbursement/reimbursement.route.ts`: shows Elysia route grouping, TypeBox schemas with `additionalProperties: false`, static route ordering and centralized list response serialization.
- `backend/src/modules/visit/visit.route.ts`: shows a compact fixed-module route implementation and filter/stat helper style if planner keeps Phase 28 smaller than reimbursement.

### Established Patterns
- Backend modules live under `backend/src/modules/{domain}/`, export an Elysia module with a plural route prefix, and are mounted in `backend/src/index.ts` under `/api/v1`.
- Lists return `{ rows, total, page, size }`, parse query strings defensively, omit blank filters and cap `size` to 100.
- Write body schemas use TypeBox `t.Object(..., { additionalProperties: false })` and route/service code must not spread trusted client body fields directly into Prisma writes.
- Business errors use `BizError`/`notFound` and are normalized globally by the app error handler.
- Object-level authorization is enforced in service helpers even when the route already uses `authGuard(requiredPerm)`.
- State changes with side effects or uniqueness-sensitive behavior should run in `prisma.$transaction`; database unique constraints remain the final race-condition guard.

### Integration Points
- Prisma: add `WorkReportPeriodType`, `WorkReportStatus`, `WorkReport` model, relations from `User`/`Department` if needed, indexes and unique constraint in `backend/prisma/schema.prisma`.
- Seed: add `WORK_REPORT_PERMISSION_CODES`, `PERMISSIONS` entries and EMPLOYEE grants in `backend/prisma/seed.ts`; add a focused role seed test under `backend/src/modules/role/__tests__/`.
- Backend module: add `backend/src/modules/work-report/work-report.service.ts`, `work-report.route.ts` and optional `work-report.state.ts`/period helper; register `workReportModule` in `backend/src/index.ts`.
- Tests: add focused tests under `backend/src/modules/work-report/__tests__/` for period calculation, duplicate constraints, route contract, permission/object scope and submit behavior.
- Later phases: Phase 29 consumes `/api/v1/work-reports` and exact enum/API names; Phase 30 should reuse scope/filter/period helpers for department summary; Phase 31 should reuse the same visibility filters for export.

</code_context>

<specifics>
## Specific Ideas

- `[auto]` No existing Phase 28 context or plans were found; no pending todos matched this phase.
- `[auto]` All assumptions from codebase analysis were Confident/Likely, so recommended defaults were accepted without interactive correction.
- 工作记录沿用 v1.3 到访和 v1.4 报销的固定业务模块路线：字段稳定、查询直接、权限清晰，不把通用动态表单或审批中心扩展成日报/周报/月报主表。
- 周期口径必须以后端 helper 和数据库唯一约束为准，这是后续提交率、未提交人员和 Excel 汇总能稳定复用的关键。

</specifics>

<deferred>
## Deferred Ideas

- 工作记录提醒推送、催办、截止时间和未提交自动通知 — v1.5 明确后置，Phase 28 不建提醒/调度表。
- 主管评论、退回修改、评分、点赞/互动 — 会扩展协作状态机，不进入 Phase 28。
- OKR/KPI/绩效考核、目标拆解和评分校准 — 属于绩效管理，超出轻量工作记录。
- 项目工时、任务管理、甘特/看板 — 当前只做报表式工作记录，不替代项目管理。
- AI 自动总结、关键词分类和风险分析 — 需要额外模型能力和成本，后续再评估。

</deferred>

---

*Phase: 28-api*
*Context gathered: 2026-05-03*
