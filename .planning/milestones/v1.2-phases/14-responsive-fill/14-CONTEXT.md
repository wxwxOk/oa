# Phase 14: 响应式填写页 - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

PC 端填写页还原设计稿 12 列栅格布局（多列字段并排显示，与设计器预览一致），移动端自动降级为单列全宽触控友好布局，动态行表格在移动端以卡片布局展示。不涉及设计器改动、PDF 输出改动或新字段类型。

</domain>

<decisions>
## Implementation Decisions

### PC 端容器宽度
- **D-01:** PublicFillPage 容器 maxWidth 从 640px 加宽到 960px，使多列栅格布局有足够空间展示
- **D-02:** 填写页栅格布局与设计器预览完全一致——复用相同的 CSS Grid `repeat(12, 1fr)` + field-level `colSpan`

### 移动端单列降级
- **D-03:** 移动端（< 1024px，沿用 useResponsive 的 isMobile 断点）所有字段强制单列全宽，完全忽略设计器设置的 colSpan
- **D-04:** 分组区块在移动端保留标题栏，组内字段同样单列全宽，不做折叠

### 动态表格移动端卡片布局
- **D-05:** 移动端动态表格从 HTML table 切换为竖向字段卡片——每行数据一张卡片，卡片内字段竖向排列（列名: 输入控件）
- **D-06:** 卡片默认全部展开，用户可点击卡片标题折叠/展开
- **D-07:** 卡片标题显示序号（"第 1 行"、"第 2 行"），简单明确
- **D-08:** 每张卡片右上角显示删除按钮，底部保留"+ 添加行"按钮

### 移动端触控优化
- **D-09:** 移动端字段间距加大到 12px，输入框最小高度 44px（iOS HIG 触控标准）
- **D-10:** 提交按钮在移动端底部固定（sticky），避免长表单需要滚动到底部才能提交

### Claude's Discretion
- 卡片折叠/展开的动画过渡效果
- 移动端字段间距的精确值（12px ± 2px）
- 固定提交按钮的阴影和视觉样式
- PC 端 960px 容器的内边距细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有代码
- `frontend/src/pages/PublicFillPage.vue` — 公开填写页入口，当前 maxWidth 640px 需改为 960px，wrapperStyle 需响应式调整
- `frontend/src/components/renderer/GridFormRenderer.vue` — 统一渲染器，fill 模式的 `.grid-row` CSS Grid 需移动端降级为单列
- `frontend/src/components/renderer/GroupRenderer.vue` — 分组渲染器，fill 模式的 `.grid-row` 同样需移动端单列降级
- `frontend/src/components/renderer/DynamicTableFill.vue` — 动态表格填写组件，移动端需切换为卡片布局
- `frontend/src/composables/useResponsive.ts` — `isMobile` / `isDesktop` 响应式断点（1024px），已在 PublicFillPage 使用

### 技术决策与需求
- `.planning/REQUIREMENTS.md` — RENDER-01（PC 栅格还原）、RENDER-02（移动端单列降级）需求定义
- `.planning/ROADMAP.md` — Phase 14 三条 Success Criteria
- `.planning/phases/10-schema/10-CONTEXT.md` — Phase 10 GridFormRenderer + mode prop 架构决策
- `.planning/phases/12-groups-tables/12-CONTEXT.md` — Phase 12 D-05/D-13/D-14 动态表格填写交互决策

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useResponsive()`: 已有 isMobile/isDesktop computed，可直接在 GridFormRenderer 和 DynamicTableFill 中使用
- `GridFormRenderer.vue` fill 模式: 已有 CSS Grid `repeat(12, 1fr)` + `gridColumn: span ${colSpan}`，PC 端栅格还原只需加宽容器
- `DynamicTableFill.vue`: 已有完整的增删行逻辑和数据管理，移动端只需替换渲染模板
- Quasar `QExpansionItem`: 可用于卡片折叠/展开交互

### Established Patterns
- CSS 媒体查询断点: `@media (max-width: 599px)` / `(min-width: 1024px)` 已在 PublicFillPage 使用
- `useResponsive()` 的 JS 断点与 CSS 断点对齐（1024px）
- Pinia store 不涉及——本阶段纯前端渲染层改动

### Integration Points
- `PublicFillPage.vue` 是唯一入口，通过 `GridFormRenderer mode="fill"` 渲染表单
- `GridFormRenderer` 内部渲染 `GroupRenderer` 和 `DynamicTableFill`，响应式逻辑需要向下传递或各组件独立检测
- SubmissionDetail 的 print 模式不受影响（PDF 固定 A4 布局）

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-responsive-fill*
*Context gathered: 2026-04-22*
