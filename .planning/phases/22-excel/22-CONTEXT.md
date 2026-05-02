# Phase 22: Excel 导入解析 + 预览入库 - Context

**Gathered:** 2026-05-02 (auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

支持导入当前《渠道往来测试表.xlsx》中的「学员到访跟踪表」格式：前端安装并使用 `xlsx` 解析首个 sheet，严格识别第 1 行标题、第 2 行 15 列表头和第 3 行起的数据，导入前展示有效行、无效行、错误原因和潜在重复提醒；用户确认后只向 Phase 20 已完成的 `/api/v1/visits/import` 提交有效标准化 rows。Phase 22 只交付 Excel 解析、预览、确认入库和导入权限入口；到访 CRUD 已由 Phase 21 完成，统计面板属于 Phase 23，Excel 导出、后端文件上传/存储、自动去重合并和字典管理仍不在本阶段范围内。

</domain>

<decisions>
## Implementation Decisions

### 导入入口与权限
- **D-01:** 在现有 `VisitPage.vue` 页面头部新增「导入 Excel」操作，不新增独立路由或新菜单；入口仅在 `auth.hasPerm('visit:import')` / `v-perm="'visit:import'"` 通过时显示。
- **D-02:** 导入入口打开 `frontend/src/components/visit/VisitImportDialog.vue`；桌面端使用普通弹窗，移动端沿用现有到访弹窗模式使用 maximized 以保证预览可读。
- **D-03:** Phase 22 不展示统计入口、不实现 Excel 导出、不把导入按钮绑定到 `visit:create`；导入权限独立使用 `visit:import`，后端 `/visits/import` 仍由 Phase 20 的 `authGuard('visit:import')` 兜底。

### Excel 解析与表头校验
- **D-04:** 前端新增依赖 `xlsx`，使用 FileReader `readAsArrayBuffer` 读取 `.xlsx` 文件，再用 `XLSX.read` 解析首个 sheet；不引入后端文件上传、multipart、临时文件或后端 Excel 解析依赖。
- **D-05:** 解析采用二维数组模式 `XLSX.utils.sheet_to_json(sheet, { header: 1 })`，固定忽略第 1 行合并标题「学员到访跟踪表」，严格使用第 2 行作为表头，第 3 行起作为数据。
- **D-06:** 第 2 行表头必须按顺序精确匹配 15 列：姓名、年龄、学历、性别、渠道商、咨询师、接待状态、接待人、接待日期、咨询后状态、状态类别、状态说明、试听课后状态、解决方案、试听课时间。表头不匹配时阻止导入，并在预览中显示期望表头和实际表头差异。
- **D-07:** 空白数据行整行跳过；错误行提示使用 Excel 原始行号（例如第 3 行），避免用户回到表格排查时错位。

### 字段标准化与行级校验
- **D-08:** 预览阶段输出标准化 `VisitWritePayload` rows：字符串字段 trim，空字符串归一为 `null`，`name` 必填，`age` 允许空或整数，`receptionDate` / `trialDate` 标准化为 `YYYY-MM-DD`。
- **D-09:** 日期标准化必须兼容 Excel 日期序列号、Date 对象和常见日期字符串；展示和提交都只使用 `YYYY-MM-DD`，不得在前端显示 ISO 时区时间。
- **D-10:** 状态字段继续按自由文本处理，不做枚举映射、字典维护、自动纠错或状态值重命名。
- **D-11:** 行级错误只包括会导致后端拒绝或业务不可用的问题：姓名为空、年龄非整数、接待日期/试听课时间无法解析、表头结构错误。其他可空业务字段缺失不视为错误。

### 导入预览与确认入库
- **D-12:** 预览弹窗展示文件名、表头校验状态、有效行数量、无效行数量、潜在重复数量和后端导入状态；有效行、无效行和重复提醒可用 tabs/table/card 等现有 Quasar 组件呈现。
- **D-13:** 无效行必须显示具体错误原因并不提交给后端；只要存在有效行且表头正确，用户可以确认导入有效标准化 rows。
- **D-14:** 确认导入调用 `POST /api/v1/visits/import`，payload 只包含 `{ rows: VisitWritePayload[] }`，不得提交文件对象、原始单元格矩阵、预览错误、重复提醒元数据或客户端可信字段。
- **D-15:** 导入成功后显示后端返回的 `createdCount` / `total`，刷新到访列表和筛选项；导入失败保留弹窗和预览结果，使用现有 Notify/Error 模式展示后端错误，便于用户修正后重试。

### 潜在重复提醒
- **D-16:** 重复提醒按「姓名 + 接待日期 + 咨询师」生成 key，优先识别同一 Excel 文件内有效行之间的潜在重复；缺少姓名或接待日期的行已按校验规则处理，缺少咨询师时不做高置信重复提醒。
- **D-17:** 重复提醒不改变行的有效性，不自动跳过、不合并、不覆盖、不调用 `skipDuplicates`，确认导入时仍由用户决定是否提交这些有效 rows。
- **D-18:** Phase 22 不新增数据库唯一约束，不新增自动去重合并接口；如后续需要与历史库记录做批量查重，应作为独立增强或后续阶段处理。

### 前端数据层与测试
- **D-19:** 扩展 `frontend/src/types/visit.ts`，新增导入表头常量、导入预览类型、行级错误类型和 `VisitImportPayload` / `VisitImportResponse` 等契约，复用现有 `VisitWritePayload` 字段定义。
- **D-20:** 扩展 `frontend/src/stores/visit.ts`，新增 `importVisits(rows)` action，统一调用 `/visits/import` 并维护导入 loading；继续保持 API 调用集中在 Pinia store 的现有模式。
- **D-21:** 将 Excel 解析、表头校验、日期标准化、行级校验和重复检测放入可测试的纯函数模块（例如 `frontend/src/components/visit/visitImport.ts` 或等价位置），避免把复杂解析逻辑塞满 `VisitImportDialog.vue`。
- **D-22:** 补充聚焦测试：解析工具覆盖表头偏移、15 列严格匹配、空行跳过、日期序列号/字符串、无效行错误和重复提醒；store 测试覆盖 `/visits/import` 路径与 payload；页面/组件测试覆盖 `visit:import` 按钮入口和成功后刷新列表。

### the agent's Discretion
- 导入预览的具体布局（tabs、分组表格、摘要卡片）、按钮文案、图标、颜色和移动端表格密度可由规划/实现按现有 Quasar OA 风格决定。
- `VisitImportDialog.vue` 与解析 helper 的具体文件拆分、错误文案细节和测试文件命名可由 planner 按可维护性决定，但必须保持解析逻辑可单元测试。
- 若计划需要拆分，优先顺序为：依赖与解析工具/类型测试 -> store 导入 action -> 导入弹窗 -> VisitPage 权限入口与刷新联动 -> 组件/页面打磨。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 22 goal, dependency on Phase 20/21, import success criteria and Phase 23 boundary.
- `.planning/REQUIREMENTS.md` — `IMPORT-01` through `IMPORT-04`, plus `PERM-02` import button/backend permission requirement.
- `.planning/PROJECT.md` — v1.3 fixed-module decision, frontend-parse/backend-validate import boundary, no auto merge and out-of-scope list.
- `.planning/STATE.md` — current v1.3 position, Phase 21 completion and Phase 22 watch-outs.

### v1.3 research
- `.planning/research/ARCHITECTURE.md` — `VisitImportDialog.vue`, import data flow and `/api/v1/visits/import` integration points.
- `.planning/research/STACK.md` — `xlsx` frontend dependency, FileReader + `XLSX.read` + `sheet_to_json({ header: 1 })` approach and dependency command.
- `.planning/research/FEATURES.md` — sample sheet findings, exact 15 fields, preview errors and duplicate-warning table stakes.
- `.planning/research/PITFALLS.md` — header-row offset, Excel date handling, free-text statuses, warning-only duplicate policy and permission pitfalls.
- `.planning/research/SUMMARY.md` — v1.3 summary, stack additions and recommended Phase 22 scope.

### Prior locked decisions
- `.planning/phases/20-api/20-CONTEXT.md` — locked `/api/v1/visits/import` JSON rows contract, backend validation, no backend Excel parsing and no auto merge/skip.
- `.planning/phases/21-crud/21-CONTEXT.md` — existing `/visits` page, permission model, Visit store/type patterns and Phase 22 deferrals.

### Source files to inspect before planning
- `frontend/package.json` — current frontend dependencies; `xlsx` is not installed yet.
- `frontend/src/pages/VisitPage.vue` — existing page header, refresh/create actions, list refresh flow and dialog integration point for import.
- `frontend/src/components/visit/VisitFormDialog.vue` — current visit dialog style, mobile maximized pattern and 15-field form grouping reference.
- `frontend/src/stores/visit.ts` — existing Pinia store and API action pattern to extend with `importVisits`.
- `frontend/src/types/visit.ts` — existing visit field keys, `VisitWritePayload` and normalization helper to reuse for import types.
- `frontend/src/pages/__tests__/VisitPage.test.ts` — page contract tests to extend for import entry and permission gating.
- `frontend/src/stores/__tests__/visit.test.ts` — store API contract tests to extend for import action.
- `frontend/src/types/__tests__/visit.test.ts` — type/normalization tests that can host import payload helper checks if appropriate.
- `backend/src/modules/visit/visit.route.ts` — Phase 20 backend import endpoint, `visitImportBody`, `validateVisitImportRows` and `createdCount` response.
- `backend/src/modules/visit/__tests__/visit-import.test.ts` — backend contract pinning JSON rows, current user attribution, no xlsx/upload/upsert/skipDuplicates.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/pages/VisitPage.vue`: already owns the `/visits` toolbar, refresh flow, responsive layout and `VisitFormDialog` state; import should attach here rather than creating a separate page.
- `frontend/src/components/visit/VisitFormDialog.vue`: provides the established desktop/mobile dialog style for visit workflows.
- `frontend/src/stores/visit.ts`: centralizes visit API calls and loading state; adding `importVisits` here keeps Phase 21's data-layer decision intact.
- `frontend/src/types/visit.ts`: already defines the 15 writable fields and `VisitWritePayload`; import should map Excel rows into this contract.
- `backend/src/modules/visit/visit.route.ts`: `/visits/import` already accepts normalized JSON rows, revalidates fields, derives `creatorId` and returns `createdCount`/`total`.
- `backend/src/modules/visit/__tests__/visit-import.test.ts`: explicitly guards against backend xlsx parsing, upload handling, upsert and `skipDuplicates`.

### Established Patterns
- Feature API calls live in Pinia stores; components call store actions and use Quasar `Notify`/`Dialog` for user feedback.
- Route/page access and operation buttons use independent permission codes; import must use `visit:import`, not piggyback on create/update permissions.
- Date-only values are displayed and submitted as `YYYY-MM-DD` to avoid timezone drift.
- Complex UI logic should be backed by small pure helpers and focused tests rather than relying only on full component tests.

### Integration Points
- Install `xlsx` in `frontend/package.json` / lockfile through the frontend package manager.
- Add import parsing helpers and tests under the frontend visit area.
- Extend visit types and store with import contracts and `POST /visits/import` action.
- Add `VisitImportDialog.vue` and mount it from `VisitPage.vue` behind `visit:import` permission.
- On successful import, call existing list/filter refresh methods so the imported records appear in the current management page.

</code_context>

<specifics>
## Specific Ideas

- `[auto]` No existing Phase 22 context or plans were found; no pending todos matched this phase.
- `[auto]` Selected all gray areas and accepted recommended defaults for import entrance, SheetJS parsing, strict header validation, preview behavior, duplicate-warning policy and store/test integration.
- The import flow should feel like a safe internal ledger migration tool: parse locally, show exactly what will be created, let the user confirm, then create only validated rows.
- Header offset and date normalization are the highest-risk details; downstream agents should plan explicit tests before UI polish.
- Duplicate warnings are informational only. The product decision remains “提醒，不自动合并/跳过/阻止”。

</specifics>

<deferred>
## Deferred Ideas

- Excel 导出、导入模板下载、后端文件上传/存储、后台异步导入任务、自动去重合并、数据库唯一约束和历史库批量查重接口 — out of scope for Phase 22.
- 到访统计入口、统计面板、图表和转化摘要展示 — Phase 23.
- 渠道商/状态字典管理、跟进提醒/待办、销售阶段工作流和公开渠道报名页 — 明确后置或 out of scope.

</deferred>

---

*Phase: 22-excel*
*Context gathered: 2026-05-02*
