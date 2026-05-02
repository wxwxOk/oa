# Phase 20: 到访数据模型 + 后端 API - Context

**Gathered:** 2026-05-02 (assumptions mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

建立到访固定业务模块的后端基础：新增 `VisitRecord` 数据模型、到访模块权限种子，以及 `/api/v1/visits` 后端 API，供 Phase 21 页面、Phase 22 Excel 导入和 Phase 23 统计面板复用。Phase 20 只交付数据层、权限和后端接口骨架/契约；前端管理页面、Excel 文件解析预览和统计图表分别属于 Phase 21-23。

</domain>

<decisions>
## Implementation Decisions

### VisitRecord 数据模型
- **D-01:** 到访信息采用固定 `VisitRecord` Prisma model，不复用自定义表单模板、公开 `Submission` 或 JSONB schema 作为主数据模型。
- **D-02:** `VisitRecord` 直接映射样表 15 列：姓名、年龄、学历、性别、渠道商、咨询师、接待状态、接待人、接待日期、咨询后状态、状态类别、状态说明、试听课后状态、解决方案、试听课时间，并补充 `creatorId`、`createdAt`、`updatedAt`。
- **D-03:** `name` 为必填字符串；`age` 为可空数字；`receptionDate`、`trialDate` 为可空日期；其余业务字段先按可空字符串存储。
- **D-04:** 接待状态、咨询后状态、状态类别、试听课后状态等字段不做 Prisma enum，也不新增字典表；筛选项从历史记录 distinct 提取。
- **D-05:** 不为「姓名 + 接待日期 + 咨询师」添加唯一约束。v1.3 只做潜在重复提醒，不自动跳过、合并或阻止重复记录入库。
- **D-06:** `VisitRecord` 应建立常用筛选索引，至少覆盖 `name`、`channelPartner`、`consultant`、`receptionist`、`receptionStatus`、`receptionDate`、`consultationStatus`、`statusCategory`、`creatorId`。

### API 与权限边界
- **D-07:** 新增 `backend/src/modules/visit/visit.route.ts`，导出 `visitModule = new Elysia({ prefix: '/visits' })`，并在 `backend/src/index.ts` 的 `/api/v1` group 内注册，最终路径为 `/api/v1/visits`。
- **D-08:** API 覆盖：`GET /` 列表、`GET /filter-options` 筛选项、`GET /stats` 统计、`GET /:id` 详情、`POST /` 新建、`PUT /:id` 编辑、`DELETE /:id` 删除、`POST /import` 批量导入标准化 rows。
- **D-09:** 后端端点必须按独立权限码鉴权：列表/详情/筛选项用 `visit:list`，新建用 `visit:create`，编辑用 `visit:update`，删除用 `visit:delete`，导入用 `visit:import`，统计用 `visit:stats`。
- **D-10:** 写入类接口使用 Elysia `t.Object` 做请求体验证，并显式提取允许写入字段，避免 body 透传把未预期字段写入数据库。
- **D-11:** 新建和导入记录的 `creatorId` 使用 `authGuard` 派生的 `currentUser.id`；Phase 20 不引入创建人私有数据范围，是否可访问由 `visit:*` 权限控制。

### 列表、筛选项与统计契约
- **D-12:** 列表接口返回 `{ rows, total, page, size }`，支持分页和多维筛选：关键词/姓名、渠道商、咨询师、接待人、接待状态、咨询后状态、状态类别、接待日期区间。
- **D-13:** 日期区间筛选以 `receptionDate` 为准；结束日期按当天结束时间处理，避免只查到 00:00 的记录。
- **D-14:** `GET /filter-options` 从 `VisitRecord` 中提取非空 distinct 值，至少返回渠道商、咨询师、接待人、接待状态、咨询后状态、状态类别；不新增渠道商或状态字典维护。
- **D-15:** `GET /stats` 使用 `visit:stats` 单独鉴权，支持接待日期区间，并返回 `total`、`intentCount`、`signedCount`、`byChannelPartner`、`byConsultant`、`byReceptionist`、`byReceptionStatus`、`byConsultationStatus`、`byStatusCategory`、`byTrialStatus`。意向/签约类等转化口径保持字符串规则的轻量实现，Phase 23 可在此契约上细化展示。

### 导入端点边界
- **D-16:** `POST /api/v1/visits/import` 只接收前端已解析、已标准化的 JSON rows，不接收 Excel 文件上传，也不新增后端文件存储或解析依赖。
- **D-17:** 后端导入仍需做第二轮字段校验和日期校验，批量创建有效 rows，并返回创建数量；不得自动合并、自动跳过或静默改写潜在重复记录。
- **D-18:** 前端在 Phase 22 负责第 1 行标题、第 2 行 15 列表头、第 3 行起数据解析、导入预览和潜在重复提醒；Phase 20 只保证后端 import API 能承接确认后的标准化数据。

### 权限种子
- **D-19:** `backend/prisma/seed.ts` 新增 `visit:list/create/update/delete/import/stats` 六个权限，`module` 统一为 `visit`。
- **D-20:** ADMIN 角色沿用现有 seed 流程自动获得所有到访权限；普通 EMPLOYEE 角色不默认获得到访模块权限，后续由管理员通过角色权限分配。

### the agent's Discretion
- 具体 DTO/type/schema 常量命名、serializer 拆分、是否抽出 `visit.service.ts`、默认排序字段和统计返回字段命名可由研究/规划阶段按现有后端风格决定。
- 导入接口的错误详情格式可由 planner 设计，但必须满足“校验失败有明确错误、成功返回创建数量、无自动去重合并”。
- 统计里的“意向/签约类”字符串归类可先保持保守、可解释，不要在 Phase 20 引入复杂业务规则或字典管理。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 20 goal, dependency, success criteria and Phase 21-23 boundaries.
- `.planning/REQUIREMENTS.md` — `VISIT-01`, `PERM-01`, `PERM-02`, plus QUERY/IMPORT/STAT requirements that Phase 20 API must enable.
- `.planning/PROJECT.md` — v1.3 fixed-module decision, Excel import boundary, status-as-string decision and out-of-scope list.
- `.planning/STATE.md` — current v1.3 position and watch-outs.

### v1.3 research
- `.planning/research/ARCHITECTURE.md` — recommended `VisitRecord` model, visit endpoints, permission set and integration points.
- `.planning/research/PITFALLS.md` — Excel row offset, date handling, string statuses, duplicate warning and permission pitfalls.
- `.planning/research/FEATURES.md` — sample sheet findings, 15 fields, table-stakes and deferred feature boundaries.
- `.planning/research/SUMMARY.md` — v1.3 research summary and recommended roadmap.

### Prior locked decisions and reusable patterns
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-CONTEXT.md` — recent backend permission, stats, archive/query and module integration patterns to preserve.
- `.planning/milestones/v1.1-phases/09-data-view-print-stats/09-PATTERNS.md` — existing list/detail/date-filter/stats backend route patterns.
- `.planning/milestones/v1.0-phases/03-crud/03-PATTERNS.md` — CRUD, authGuard, TypeBox validation and permission-code conventions.

### Source files to inspect before planning
- `backend/prisma/schema.prisma` — current model, relation, timestamp and index conventions.
- `backend/prisma/seed.ts` — centralized permission definitions and ADMIN/EMPLOYEE role assignment.
- `backend/src/index.ts` — `/api/v1` module registration.
- `backend/src/middlewares/auth.ts` — `authGuard` and `currentUser` derivation.
- `backend/src/modules/user/user.route.ts` — paginated CRUD, query schema and write validation pattern.
- `backend/src/modules/submission/submission.route.ts` — `{ rows, total, page, size }` list response, date filters and detail lookup pattern.
- `backend/src/modules/role/role.route.ts` — guarded route grouping and permission listing pattern.
- `backend/src/modules/form-stats/form-stats.route.ts` — lightweight Prisma aggregation style.
- `backend/src/modules/approval/archive-stats.service.ts` — multi-dimensional stats aggregation pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/schema.prisma`: existing `User`, `Role`, `Permission`, timestamps, relations and indexes provide the model style for `VisitRecord`; `User` should gain a `visitRecords` relation。
- `backend/prisma/seed.ts`: all permissions are upserted from a centralized `PERMISSIONS` array, then ADMIN receives `allPerms`; adding visit permissions here is enough for ADMIN inheritance。
- `backend/src/middlewares/auth.ts`: `authGuard(requiredPerm)` verifies permission codes and returns `currentUser.id`, `realName`, roles and permissions for creator attribution。
- `backend/src/modules/user/user.route.ts`: demonstrates paginated list, keyword filters, TypeBox query/body schema and explicit field validation for CRUD endpoints。
- `backend/src/modules/submission/submission.route.ts`: demonstrates `{ rows, total, page, size }`, date range filtering and detail not-found handling。
- `backend/src/modules/form-stats/form-stats.route.ts` and `backend/src/modules/approval/archive-stats.service.ts`: show current aggregation approaches that can inform visit stats。
- `backend/src/modules/role/role.route.ts`: shows guarded operation groups and permission-list API behavior。

### Established Patterns
- Backend feature modules live under `backend/src/modules/*`, export an Elysia module with a prefix, and are registered under `/api/v1` in `backend/src/index.ts`。
- Permission codes are string literals shared by backend `authGuard`, seed data and future frontend `v-perm`/route metadata; ADMIN bypasses checks through role code。
- Write routes use `t.Object` validation and `BizError`/`notFound` for business failures。
- Date-only UI filters commonly use `dateTo + 'T23:59:59.999Z'` style end boundaries; Phase 20 should keep date handling predictable for reception/trial dates。
- Existing lightweight stats are service or route-level Prisma queries, not a separate BI/reporting layer。

### Integration Points
- Prisma migration: add `VisitRecord` and `User.visitRecords` in `backend/prisma/schema.prisma`。
- Permission seed: add six visit permissions in `backend/prisma/seed.ts`。
- Backend module: add `backend/src/modules/visit/visit.route.ts` and register `visitModule` in `backend/src/index.ts`。
- Later frontend phases will consume `/api/v1/visits`, `/filter-options`, `/stats` and `/import`; avoid changing these route names after Phase 20。

</code_context>

<specifics>
## Specific Ideas

- `[auto]` All assumptions were Confident/Likely, so recommended defaults were accepted without interactive corrections.
- v1.3 is a fixed business ledger for “学员到访跟踪表”; backend contracts should stay practical and query-friendly rather than abstracting into the dynamic form system.
- 接待日期和试听课时间都按“日期”语义处理；展示层不应暴露时区时间。
- 权限粒度必须从第一版就区分 list/create/update/delete/import/stats，避免后续前端隐藏按钮但后端过度授权。

</specifics>

<deferred>
## Deferred Ideas

- 到访管理前端页面、PC 表格、移动卡片、新建/编辑/详情弹窗和筛选 UI — Phase 21。
- Excel 文件读取、SheetJS 安装、第 2 行表头校验、导入预览和潜在重复提醒 UI — Phase 22。
- 统计面板、图表、转化摘要展示和更细的业务归类口径 — Phase 23。
- Excel 导出、自动去重合并、渠道商/状态字典管理、跟进提醒/待办、销售阶段工作流和公开渠道报名页 — 明确后置或 out of scope。

</deferred>

---

*Phase: 20-api*
*Context gathered: 2026-05-02*
