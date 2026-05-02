# Phase 23: 统计面板 + 转化汇总 - Context

**Gathered:** 2026-05-02 (auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

为到访管理模块交付管理者可用的统计面板：基于 Phase 20 已有 `/api/v1/visits/stats` 端点和 Phase 21/22 已完成的 `/visits` 页面，按接待日期区间汇总渠道、咨询师、接待人和状态维度，展示到访数量、意向数量、签约类数量、转化率、图表和摘要卡片，并补齐 `visit:stats` 前端入口权限控制。Phase 23 只做系统内统计查看；Excel 导出、字典维护、自动去重合并、跟进提醒/待办、销售阶段工作流和公开报名页仍不在本阶段范围内。

</domain>

<decisions>
## Implementation Decisions

### 统计入口与权限
- **D-01:** 统计入口放在现有 `frontend/src/pages/VisitPage.vue` 头部工具区，新增「统计」按钮或等价图标按钮，不新增独立顶层菜单、不移动 `/visits` 路由。
- **D-02:** 统计入口仅按 `visit:stats` 显示，使用 `v-perm="'visit:stats'"` / `auth.hasPerm('visit:stats')` 控制；后端 `/visits/stats` 继续由 `authGuard('visit:stats')` 兜底。
- **D-03:** 统计入口不复用 `visit:list`、`visit:import` 或 CRUD 权限；没有 `visit:stats` 的用户可继续使用到访列表能力，但看不到统计按钮和统计面板。
- **D-04:** Phase 23 不新增「导出 Excel」按钮，不在统计面板中提供下载、模板、报表保存或定时推送能力。

### 面板承载与响应式布局
- **D-05:** 新增到访专用统计组件（建议 `frontend/src/components/visit/VisitStatsPanel.vue` 或等价拆分），由 `VisitPage.vue` 打开；桌面端可使用宽弹窗或页内可展开面板，移动端使用 maximized dialog，避免在列表页顶部永久堆叠大图表。
- **D-06:** 面板结构采用「日期筛选 + 摘要卡片 + 图表区 + 明细表」：先展示关键结果，再展示渠道/人员/状态维度，延续现有 Quasar 工具型页面风格。
- **D-07:** 图表区域使用响应式 grid：桌面端两列，移动端单列；图表容器固定高度，加载时使用 `q-skeleton`，无数据时显示明确空状态。
- **D-08:** 面板内提供刷新按钮；统计加载失败时保留面板和日期筛选，使用 `q-banner` 或 Notify 提示“统计数据加载失败”。

### 日期筛选行为
- **D-09:** 统计只支持接待日期区间筛选，参数沿用后端 `dateFrom` / `dateTo`；不额外增加渠道商、咨询师、接待人或状态筛选，避免超出 Phase 23 成功标准。
- **D-10:** 统计面板默认展示全部接待日期数据；如果打开统计面板时到访列表已有 `dateFrom` / `dateTo`，可将当前列表日期范围作为初始值。
- **D-11:** 日期控件继续使用 `YYYY-MM-DD` 字符串，避免前端展示 ISO 时区时间；清空日期后查询全量统计。
- **D-12:** 面板内的日期范围独立于列表筛选：应用统计日期不自动改写到访列表筛选，避免用户为了看统计误改列表查询状态。

### 转化指标口径
- **D-13:** 摘要卡片至少展示：到访总数、意向数量、签约类数量、意向率、签约转化率；百分比 denominator 均使用到访总数，`total = 0` 时显示 `0%`。
- **D-14:** 意向/签约类口径继承 Phase 20 后端轻量字符串规则：综合 `consultationStatus`、`statusCategory`、`trialStatus` 判断；状态仍按自由文本存储，不引入 enum、字典表或人工映射维护 UI。
- **D-15:** 口径说明在统计面板中以 tooltip、caption 或说明文本呈现，明确“意向/签约类按状态文本关键词估算”，避免管理者误以为是强流程状态。
- **D-16:** Phase 23 可以把 `buildVisitStats` 拆成可测试 helper/service，但不新增复杂 BI 层、销售漏斗配置器或可编辑统计规则。

### 统计接口返回形态
- **D-17:** 后端 `GET /api/v1/visits/stats` 应从 Phase 20 的基础 `{ name, count }` 聚合升级为可直接驱动前端的统计 DTO；渠道商、咨询师、接待人维度行应包含 `name`、`total`、`intentCount`、`signedCount`、`intentRate`、`signedRate`，并可保留 `count = total` 兼容基础计数。
- **D-18:** 状态分布覆盖 `receptionStatus`、`consultationStatus`、`statusCategory`、`trialStatus`；状态分布行至少包含 `name` 和 `count`，不要求为每个状态再计算意向/签约。
- **D-19:** 分组中的空值使用“未填写”桶展示，而不是静默丢弃；这样各维度 totals 更容易解释，也能暴露导入或录入的数据质量问题。
- **D-20:** 分组结果按 `total` / `count` 降序排序；图表只展示 Top 10 以保持可读性，明细表可展示全部分组。

### 图表与明细展示
- **D-21:** 复用现有 `chart.js` + `vue-chartjs` 依赖和 `ArchiveStatsPanel.vue` / `FormStatsPanel.vue` 的注册方式；不新增图表依赖。
- **D-22:** 图表优先使用柱状图：渠道商、咨询师、接待人展示到访/意向/签约三组数据；状态分布展示计数柱状图或简表，保持实现简单、可测试。
- **D-23:** 每个图表旁或下方配套明细表，列出维度名称、到访数、意向数、签约类数和转化率；长维度名称允许换行，空数据表显示“暂无统计数据”。
- **D-24:** 图表必须提供 `role="img"` 和中文 `aria-label`，延续现有统计组件的可访问性约定。

### 前端数据层与测试
- **D-25:** 扩展 `frontend/src/types/visit.ts`，新增 `VisitStats`、`VisitStatsDimensionRow`、`VisitStatsDistributionRow` 等类型，以及转化率格式化 helper（如需要）。
- **D-26:** 扩展 `frontend/src/stores/visit.ts`，新增 `stats`、`statsLoading` 和 `fetchStats(filters)` action，统一调用 `/visits/stats`，并复用现有忽略空筛选条件的参数构建风格。
- **D-27:** `VisitPage.vue` 只负责入口、面板打开状态和把日期初值传给统计组件；图表数据组装、空状态判断和表格行格式化放在统计组件或纯 helper 中，避免 `VisitPage.vue` 继续膨胀。
- **D-28:** 补充聚焦测试：后端统计测试覆盖 `visit:stats` 权限、日期区间、空值桶、意向/签约口径、渠道/人员/状态聚合；前端 store 测试覆盖 `/visits/stats` 路径和参数；页面/组件测试覆盖 `visit:stats` 按钮、无导出按钮、摘要卡片、图表容器和空/错误/加载状态。

### the agent's Discretion
- 统计面板是宽弹窗还是页内可展开面板、按钮图标、卡片颜色、图表配色和具体 CSS gap 可由 planner/implementer 按现有 Quasar OA 风格决定。
- 状态分布图使用单一柱状图、多个小图表或图表 + 表格组合可由实现阶段按可读性决定，但必须覆盖咨询后状态、状态类别和试听课后状态。
- 若计划需要拆分，优先顺序为：后端 stats DTO/helper/tests -> 前端类型/store/tests -> 统计组件 -> VisitPage 入口和权限 -> 视觉/响应式打磨。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 23 goal, dependencies, success criteria and v1.3 milestone boundary.
- `.planning/REQUIREMENTS.md` — `STAT-01` through `STAT-04`, plus remaining `PERM-02` stats frontend control.
- `.planning/PROJECT.md` — v1.3 fixed-module decision, status-as-string decision, no Excel export and out-of-scope boundaries.
- `.planning/STATE.md` — current Phase 23 position and watch-out to preserve the Phase 20 stats API contract.

### Prior locked decisions
- `.planning/phases/20-api/20-CONTEXT.md` — existing `/api/v1/visits/stats` route, `visit:stats` permission, date filter and initial stats helper/contract.
- `.planning/phases/21-crud/21-CONTEXT.md` — existing `/visits` page, responsive layout, visit store/type patterns and Phase 23 stats deferral.
- `.planning/phases/22-excel/22-CONTEXT.md` — import completion, `xlsx` already installed, no export/auto-merge, and Phase 23 stats boundary.
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-CONTEXT.md` — recent archive stats UI, permission-gated operations and operations-console tone.

### v1.3 research
- `.planning/research/ARCHITECTURE.md` — v1.3 visit module architecture, stats endpoint and frontend integration recommendations.
- `.planning/research/FEATURES.md` — visit statistics table stakes, dimensions and deferred feature boundaries.
- `.planning/research/PITFALLS.md` — string status interpretation, date-only handling, permission pitfalls and anti-scope items.
- `.planning/research/SUMMARY.md` — v1.3 summary, roadmap split and recommended implementation order.

### Source files to inspect before planning
- `backend/src/modules/visit/visit.route.ts` — current `buildVisitStats`, `isIntentVisit`, `isSignedVisit`, `/stats` route and date filtering.
- `backend/src/modules/visit/__tests__/visit-import.test.ts` — visit backend test style and existing import contracts; add or create sibling stats contracts.
- `frontend/src/pages/VisitPage.vue` — existing page header, import/create buttons, filters, responsive list and dialog state to extend with stats entry.
- `frontend/src/stores/visit.ts` — existing visit Pinia store and API parameter pattern to extend with `fetchStats`.
- `frontend/src/types/visit.ts` — existing visit DTOs, filter keys and normalization helpers to extend with stats DTOs.
- `frontend/src/pages/__tests__/VisitPage.test.ts` — current page source-contract tests, including explicit Phase 22 prohibition of `/visits/stats` before Phase 23; update for stats entry.
- `frontend/src/stores/__tests__/visit.test.ts` — visit store contract tests to extend for `/visits/stats`.
- `frontend/src/types/__tests__/visit.test.ts` — visit type/helper tests that can host stats formatting helper checks.
- `frontend/src/components/approval/ArchiveStatsPanel.vue` — current Quasar + vue-chartjs stats grid, loading/error/empty and table pattern.
- `frontend/src/components/submission/FormStatsPanel.vue` — existing date range controls and chart registration pattern.
- `frontend/src/stores/approvalArchive.ts` — store-level `stats` / `statsLoading` / `fetchStats` pattern.
- `frontend/package.json` — confirms `chart.js`, `vue-chartjs` and `xlsx` are already installed; no new chart dependency needed.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/modules/visit/visit.route.ts`: already contains `/stats`, `buildDateFilter`, `buildVisitStats`, `isIntentVisit` and `isSignedVisit`; Phase 23 should refine rather than replace this route.
- `frontend/src/pages/VisitPage.vue`: already owns the `/visits` toolbar, permissions, filters and dialogs; stats should attach here as the remaining Phase 23 action.
- `frontend/src/stores/visit.ts`: current store centralizes visit API calls and loading states; adding `fetchStats` keeps Phase 21's data-layer decision intact.
- `frontend/src/types/visit.ts`: existing filter/date types and `VisitWritePayload` can be extended with stats DTOs without adding a new domain module.
- `frontend/src/components/approval/ArchiveStatsPanel.vue`: strongest current example for stats cards/grid, chart box, loading skeleton, error banner, empty state and stats table.
- `frontend/src/components/submission/FormStatsPanel.vue`: example for date range controls and `ChartJS.register` usage.
- `frontend/package.json`: chart dependencies already exist; Phase 23 should not add another chart library.

### Established Patterns
- Feature API calls live in Pinia stores; pages/components do not call axios directly unless the feature predates the store pattern.
- Permission-gated buttons use `v-perm` / `auth.hasPerm`, with backend guards as final authority.
- Date-only UI values use `YYYY-MM-DD`, and range filters pass `dateFrom` / `dateTo` to the backend.
- Existing stats UI pairs charts with tables, uses skeletons during loading and keeps mobile as a single-column layout.
- v1.3 status fields remain free-text strings; statistics should explain keyword-based categories instead of introducing dictionaries or workflows.

### Integration Points
- Backend: update `buildVisitStats` and `/visits/stats` response DTO in `backend/src/modules/visit/visit.route.ts`, with focused backend stats tests.
- Frontend types/store: add stats DTOs and `fetchStats` in `frontend/src/types/visit.ts` and `frontend/src/stores/visit.ts`.
- Frontend component: add visit stats panel/dialog under `frontend/src/components/visit/` and wire it into `VisitPage.vue` behind `visit:stats`.
- Tests: update visit page/store/type tests and add backend stats tests so Phase 23 can close `STAT-01` through `STAT-04` and remaining `PERM-02`.

</code_context>

<specifics>
## Specific Ideas

- `[auto]` No existing Phase 23 context or plans were found; no pending todos matched this phase.
- `[auto]` Selected all gray areas and accepted recommended defaults for stats entry, date filtering, conversion口径, backend DTO shape, chart/table layout and test coverage.
- 统计面板应像管理台的“快速体检”：先看总量和转化率，再下钻渠道、人员和状态分布。
- 转化口径必须保守、可解释：状态文本继续自由输入，统计只是按关键词估算“意向/签约类”，不要把它包装成强制销售流程。
- Phase 23 是 v1.3 收尾阶段，应优先补齐 stats 权限入口和统计可读性，不顺手加入导出、字典、跟进提醒或销售漏斗配置。

</specifics>

<deferred>
## Deferred Ideas

- Excel 导出、统计报表下载、定时报表推送和导入模板下载 — v1.3 out of scope，后续如需要单独规划。
- 渠道商/状态字典管理、可配置转化规则和销售阶段工作流 — 需要业务规则设计，不能塞进 Phase 23。
- 跟进提醒/待办、公开渠道报名页、自动去重合并和历史库批量查重 — 已在需求中明确后置或 out of scope。

</deferred>

---

*Phase: 23-stats*
*Context gathered: 2026-05-02*
