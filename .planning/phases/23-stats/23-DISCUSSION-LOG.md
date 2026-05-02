# Phase 23: 统计面板 + 转化汇总 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 23-统计面板 + 转化汇总
**Areas discussed:** 统计入口与权限, 日期筛选行为, 转化指标口径, 统计接口返回形态, 图表与明细展示, 前端数据层与测试

---

## 统计入口与权限

| Option | Description | Selected |
|--------|-------------|----------|
| Existing VisitPage action | 在 `/visits` 页面头部新增 `visit:stats` gated「统计」按钮，打开统计面板；复用现有到访菜单和页面上下文。 | ✓ |
| Separate route | 新增 `/visits/stats` 子路由或独立页面，需要额外路由、导航和返回流。 | |
| Menu group entry | 新增独立顶层菜单或放入“收集统计表”，会扩大导航范围并弱化固定到访模块边界。 | |

**User's choice:** `[auto]` Selected `Existing VisitPage action` as the recommended default.
**Notes:** Phase 21 已锁定 `/visits` 独立菜单，Phase 23 只补齐 stats 按钮入口；不得新增导出按钮或复用 import/CRUD 权限。

---

## 日期筛选行为

| Option | Description | Selected |
|--------|-------------|----------|
| Stats-only reception date range | 统计面板只提供 `dateFrom` / `dateTo` 接待日期范围，默认全量，可继承列表日期初值但不回写列表筛选。 | ✓ |
| Mirror full list filters | 统计面板复用列表的渠道、人员、状态等所有筛选，会超出 Phase 23 成功标准并增加后端契约。 | |
| Fixed month/week presets only | 只提供本周/本月快捷筛选，实现简单但不满足任意日期区间分析。 | |

**User's choice:** `[auto]` Selected `Stats-only reception date range` as the recommended default.
**Notes:** Requirements 只要求按接待日期区间过滤；Phase 23 不新增渠道/人员/状态筛选器。

---

## 转化指标口径

| Option | Description | Selected |
|--------|-------------|----------|
| Inherit backend keyword rules | 沿用 Phase 20 `isIntentVisit` / `isSignedVisit` 的自由文本关键词估算，并在 UI 明示口径说明。 | ✓ |
| Add dictionary-managed statuses | 新增状态字典或人工映射维护 UI，可更准确但已明确后置且超出固定台账 MVP。 | |
| Frontend-only classification | 前端按状态文本再分类，容易与后端统计和测试口径漂移。 | |

**User's choice:** `[auto]` Selected `Inherit backend keyword rules` as the recommended default.
**Notes:** 状态字段继续自由文本存储；统计只是管理概览，不包装成强制销售流程或可配置漏斗。

---

## 统计接口返回形态

| Option | Description | Selected |
|--------|-------------|----------|
| Enriched stats DTO | 后端返回 total/intent/signed/rate 的维度 rows，并保留 count=total 兼容基础计数。 | ✓ |
| Keep simple counts only | 只返回 `{ name, count }`，无法满足渠道/人员维度的意向数、签约类数和转化概览。 | |
| Frontend derives from raw records | 前端拉全量记录后聚合，绕过 `/visits/stats` 统计权限和后端分页边界。 | |

**User's choice:** `[auto]` Selected `Enriched stats DTO` as the recommended default.
**Notes:** 分组空值应进入“未填写”桶，分组结果按 total/count 降序；图表 Top 10，明细表可展示全部。

---

## 图表与明细展示

| Option | Description | Selected |
|--------|-------------|----------|
| Bar charts plus tables | 复用 `chart.js` + `vue-chartjs` 柱状图模式，渠道/人员展示到访/意向/签约，状态展示计数，并配套明细表。 | ✓ |
| Doughnut/funnel heavy dashboard | 更像 BI 大屏，但需要更多图表注册、布局和解释成本。 | |
| Tables only | 实现最简单，但不满足 Phase 23 图表交付预期。 | |

**User's choice:** `[auto]` Selected `Bar charts plus tables` as the recommended default.
**Notes:** 图表容器固定高度，移动端单列，提供 `role="img"` 和中文 `aria-label`；加载、错误、空状态沿用现有统计组件模式。

---

## 前端数据层与测试

| Option | Description | Selected |
|--------|-------------|----------|
| Extend visit types/store and add VisitStatsPanel | 在 `visit.ts` / `useVisitStore` 中新增 stats DTO/action，`VisitPage.vue` 只负责入口和面板状态，统计逻辑放组件/helper。 | ✓ |
| Put all stats logic in VisitPage | 文件已较长，继续膨胀会降低可维护性。 | |
| New global stats store | 到访统计是 visit domain 内部能力，新增全局 store 会过度抽象。 | |

**User's choice:** `[auto]` Selected `Extend visit types/store and add VisitStatsPanel` as the recommended default.
**Notes:** 测试覆盖后端 stats 权限/日期/空值/口径/聚合，前端 store `/visits/stats` 路径，页面 `visit:stats` 按钮和无导出按钮。

---

## the agent's Discretion

- 统计面板使用宽弹窗还是页内可展开面板。
- 统计按钮图标、卡片颜色、图表配色、grid gap 和移动端细节。
- 状态分布采用单图、多图还是图表 + 表格组合，只要覆盖咨询后状态、状态类别、试听课后状态。
- 实施计划拆分顺序可由 planner 按依赖决定，推荐后端 DTO/helper/tests 优先。

## Deferred Ideas

- Excel 导出、统计报表下载、定时报表推送和导入模板下载。
- 渠道商/状态字典管理、可配置转化规则和销售阶段工作流。
- 跟进提醒/待办、公开渠道报名页、自动去重合并和历史库批量查重。
