# Phase 21: 到访管理页面 + CRUD 筛选 - Context

**Gathered:** 2026-05-02 (auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

交付可日常使用的到访管理前端页面：新增 `/visits` 独立菜单入口，按权限分页查看到访记录，提供 PC 表格、移动卡片、常用筛选、新建、编辑、删除和详情查看。Phase 21 只消费 Phase 20 已完成的 `/api/v1/visits` 后端契约；Excel 文件解析/导入预览属于 Phase 22，统计面板和转化图表属于 Phase 23。

</domain>

<decisions>
## Implementation Decisions

### 页面入口与权限
- **D-01:** 新增 `/visits` 路由，`meta.perm = 'visit:list'`，页面标题使用“到访管理”。
- **D-02:** `MainLayout` 新增独立“到访管理”菜单项，不放入“审批管理”或“收集统计表”分组；菜单按 `visit:list` 显示。
- **D-03:** 新建、编辑、删除按钮分别使用 `v-perm` / `auth.hasPerm` 按 `visit:create`、`visit:update`、`visit:delete` 控制显隐；后端仍由 Phase 20 权限守卫兜底。
- **D-04:** Phase 21 不展示导入入口和统计入口，避免提前占用 Phase 22/23 交付范围；若页面布局预留操作区，也不得接入未完成能力。

### 列表与响应式展示
- **D-05:** 桌面端使用 Quasar `QTable` + server-side pagination，调用 `GET /visits`，延续现有 `rows/total/page/size` 列表契约。
- **D-06:** 桌面表格列聚焦可扫描字段：姓名、渠道商、咨询师、接待人、接待日期、接待状态、咨询后状态、状态类别、更新时间和操作；年龄、学历、性别等完整信息放入详情/编辑弹窗。
- **D-07:** 移动端使用卡片列表，不用横向表格；卡片优先展示姓名、接待/咨询状态 chip、渠道商、咨询师、接待人、接待日期和状态类别，并提供查看/编辑入口。
- **D-08:** `状态说明`、`解决方案` 等长文本在列表中只做摘要、ellipsis 或不展示；详情/编辑弹窗必须完整展示。
- **D-09:** 页面保留现有加载骨架、错误重试和 `EmptyState` 模式；空状态应说明“暂无到访记录”，有 `visit:create` 时可提供新建入口。

### 筛选交互
- **D-10:** 筛选项覆盖关键词、渠道商、咨询师、接待人、接待状态、咨询后状态、状态类别和接待日期区间，并直接映射 Phase 20 `visitListQuery` 参数。
- **D-11:** 筛选下拉选项来自 `GET /visits/filter-options` 的 distinct 结果，不新增前端硬编码字典或独立字典维护 UI。
- **D-12:** 桌面端筛选采用页面顶部横向筛选区；移动端采用底部 `q-dialog`/filter sheet，避免卡片列表顶部堆叠过多控件。
- **D-13:** 日期筛选只展示和提交 `YYYY-MM-DD`，不在前端显示时区时间；接待日期区间以 Phase 20 后端 `dateFrom/dateTo` 处理为准。
- **D-14:** 筛选支持“查询/应用”和“重置筛选”；CRUD 成功后刷新列表，必要时同步刷新筛选项。

### 新建、编辑、详情和删除
- **D-15:** 使用到访专用表单弹窗承载新建和编辑，移动端弹窗 maximized，桌面端固定宽度；不要做表格内联编辑。
- **D-16:** 表单覆盖样表 15 个业务字段，并按业务分组展示：学员基础信息、渠道/咨询接待、跟进状态、试听/解决方案。
- **D-17:** `name` 为必填；`age` 只允许整数或空；`receptionDate`、`trialDate` 使用日期选择器；空字符串提交前归一为空值或省略，交给后端二次校验。
- **D-18:** 详情查看可复用表单弹窗的只读模式或独立详情弹窗，但必须完整展示 15 个业务字段、创建人和创建/更新时间。
- **D-19:** 删除必须使用确认弹窗，文案包含姓名和接待日期/咨询师等辅助信息，避免误删；删除成功后刷新当前页列表。

### 前端数据层
- **D-20:** 新增 `frontend/src/types/visit.ts` 和 `frontend/src/stores/visit.ts`，保持现有 Pinia per feature 模式。
- **D-21:** `useVisitStore` 至少提供 `fetchList`、`fetchFilterOptions`、`fetchDetail`、`createVisit`、`updateVisit`、`deleteVisit`，并维护 `rows`、`total`、`page`、`size`、`filters`、`loading`、`detailLoading`、`actionLoading`。
- **D-22:** API 路径使用现有 axios `api` 相对路径：`/visits`、`/visits/filter-options`、`/visits/:id`；不要绕过 Phase 20 契约。

### the agent's Discretion
- 表格列具体宽度、chip 颜色、图标、空状态文案、表单分组标题和弹窗拆分方式可由规划/实现按现有 Quasar OA 风格决定。
- 若实现复杂度需要拆分，优先顺序为：类型/store/契约测试 -> 路由/菜单 -> 列表/筛选 -> 表单弹窗 -> 详情/删除和移动端打磨。
- 默认排序继续使用 Phase 20 后端 `createdAt desc`；除非实现阶段发现后端已提供排序参数，否则前端不自建复杂排序能力。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 21 goal, dependency on Phase 20, success criteria and Phase 22/23 boundaries.
- `.planning/REQUIREMENTS.md` — `VISIT-02` through `VISIT-04`, `QUERY-01` through `QUERY-04`, plus `PERM-01/PERM-02` frontend portions.
- `.planning/PROJECT.md` — v1.3 fixed-module decision, out-of-scope boundaries and stack constraints.
- `.planning/STATE.md` — current v1.3 position, Phase 20 completion and Phase 21 ready-to-plan state.
- `.planning/phases/20-api/20-CONTEXT.md` — locked backend API, field, permission, filter and date-handling contracts that Phase 21 must consume.

### v1.3 research
- `.planning/research/ARCHITECTURE.md` — recommended frontend module files, visit route, store and integration points.
- `.planning/research/FEATURES.md` — 15 fixed fields, table-stakes, follow-up maintenance and deferred anti-features.
- `.planning/research/PITFALLS.md` — long-text display, date-only handling, string statuses and permission pitfalls.
- `.planning/research/SUMMARY.md` — v1.3 summary, stack additions and roadmap split across Phases 20-23.

### Prior locked decisions and reusable patterns
- `.planning/phases/19-post-collection-processing-archive-export-stats/19-CONTEXT.md` — desktop table/mobile card, permission-gated operations and operations-console tone.
- `.planning/phases/18-approval-task-inbox-mobile-approval/18-CONTEXT.md` — mobile card list, filter sheet and safe action patterns.
- `.planning/milestones/v1.1-phases/09-data-view-print-stats/09-CONTEXT.md` — existing submission list/detail/table/stat page decisions.
- `.planning/milestones/v1.1-phases/09-data-view-print-stats/09-PATTERNS.md` — `QTable` + pagination + Pinia store + responsive list patterns.

### Source files to inspect before planning
- `backend/src/modules/visit/visit.route.ts` — Phase 20 API contract, query params, serializers, filter options and permission split.
- `frontend/src/router/routes.ts` — route metadata and `perm`/`permAny` integration.
- `frontend/src/layouts/MainLayout.vue` — menu configuration, `auth.hasPerm`, `auth.hasAnyPerm` and mobile/desktop menu rendering.
- `frontend/src/composables/useResponsive.ts` — desktop/mobile breakpoint helper used by list pages.
- `frontend/src/pages/ApprovalArchivePage.vue` — recent desktop filter, `QTable`, mobile card and operation-page pattern.
- `frontend/src/pages/ApprovalApplicationPage.vue` — lighter list page with mobile filter dialog and empty state pattern.
- `frontend/src/stores/approvalArchive.ts` — advanced Pinia list/filter/detail/action loading pattern.
- `frontend/src/stores/approvalApplication.ts` — compact Pinia list/detail/action pattern.
- `frontend/src/components/FilterSheet.vue` — reusable bottom sheet style reference for mobile filters.
- `frontend/src/components/EmptyState.vue` — empty state component to reuse.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/modules/visit/visit.route.ts`: already provides `/visits`, `/filter-options`, detail, create, update and delete endpoints with `visit:*` permissions.
- `frontend/src/router/routes.ts`: child routes under `MainLayout` use `meta.perm` for route guards; `/visits` should follow the same pattern.
- `frontend/src/layouts/MainLayout.vue`: `MenuConfig` supports single-entry menus with `perm`, and existing menu filtering can show the visit entry without new infrastructure.
- `frontend/src/pages/ApprovalArchivePage.vue`: strongest current example for dense desktop filters, `QTable`, mobile cards, loading/error/empty states and action buttons.
- `frontend/src/pages/ApprovalApplicationPage.vue`: simpler example for list page, mobile bottom filter dialog and create CTA.
- `frontend/src/stores/approvalArchive.ts` and `frontend/src/stores/approvalApplication.ts`: established API param building, pagination state and loading flag patterns.
- `frontend/src/composables/useResponsive.ts`: standard `isDesktop`/`isMobile` split at the project breakpoint.
- `frontend/src/components/EmptyState.vue`: reusable empty-state UI; no need to create a new empty component.

### Established Patterns
- 前端每个业务域使用独立 types + Pinia store + page/component 组合，API 调用集中在 store。
- 桌面列表使用 `QTable` + `@request` server-side pagination；移动端使用 `QCard` 列表和底部筛选弹窗。
- 页面访问由 route `meta.perm` 控制，按钮/操作由 `v-perm` 或 `auth.hasPerm` 控制，后端权限仍是最终校验。
- 日期筛选在前端以 `YYYY-MM-DD` 字符串传给后端，展示层避免暴露 ISO 时区细节。
- 长表单或长文本不塞进列表列，完整内容放在详情页/弹窗中。

### Integration Points
- 新增 `frontend/src/types/visit.ts` 定义 `VisitRow`、`VisitListFilters`、`VisitFilterOptions`、`VisitWritePayload` 等前端契约。
- 新增 `frontend/src/stores/visit.ts` 封装 `/visits` API，复用现有 axios `api`。
- 新增 `frontend/src/pages/VisitPage.vue` 承载列表、筛选、移动卡片、弹窗状态和权限按钮。
- 可新增 `frontend/src/components/visit/VisitFormDialog.vue` 或等价组件承载新建/编辑/详情，避免 `VisitPage.vue` 过长。
- 修改 `frontend/src/router/routes.ts` 增加 `/visits` 路由；修改 `frontend/src/layouts/MainLayout.vue` 增加到访菜单。
- 规划时应补充轻量前端契约测试，覆盖路由/菜单权限、store API 路径、页面包含 QTable/mobile card/filter/dialog 和 `v-perm` 操作。

</code_context>

<specifics>
## Specific Ideas

- `[auto]` Context exists check passed: Phase 21 had no existing context or plans; no pending todos matched this phase.
- `[auto]` Selected all gray areas and accepted recommended defaults for menu/permissions, responsive list, filters and CRUD dialogs.
- 页面应像内部台账工作台：快速筛选、快速查看、谨慎编辑删除，视觉延续现有 Quasar OA 工具风格，不做营销式页面。
- 长文本字段是业务判断依据，但不应破坏列表可扫描性；列表摘要、弹窗完整展示是固定约束。
- Phase 21 应保持边界克制：不提前安装 `xlsx`，不实现导入预览，不实现统计图表，不做 Excel 导出。

</specifics>

<deferred>
## Deferred Ideas

- Excel 文件读取、SheetJS 安装、第 2 行表头校验、导入预览、潜在重复提醒和确认入库 UI — Phase 22。
- 到访统计面板、图表、转化摘要和统计入口 — Phase 23。
- Excel 导出、自动去重合并、渠道商/状态字典管理、跟进提醒/待办、销售阶段工作流和公开渠道报名页 — 明确后置或 out of scope。

</deferred>

---

*Phase: 21-crud*
*Context gathered: 2026-05-02*
