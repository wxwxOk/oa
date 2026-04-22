# Phase 11: 设计器栅格编辑 - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

将 DesignerCanvas 从扁平字段列表重写为 12 列栅格编辑器。用户可拖拽字段到指定行/列位置，调整跨列数，拖拽调整行顺序，画布所见即所得。

</domain>

<decisions>
## Implementation Decisions

### 画布布局呈现
- **D-01:** 复用 GridFormRenderer 作为画布底层渲染，叠加设计器交互层（拖拽手柄、选中框、删除按钮、resize 手柄）
- **D-02:** 行内剩余空间显示虚线占位区域，提示用户可拖入更多字段；空行也显示为虚线拖放区
- **D-03:** 字段卡片显示实际控件的 disabled 预览（输入框、单选框等），加上拖拽手柄和删除按钮，实现所见即所得
- **D-04:** 选中字段显示蓝色边框 + 四角 resize 手柄（用于调整宽度）

### 拖拽交互模型
- **D-05:** 从字段面板拖入时，智能判断放置位置——拖到已有行的虚线剩余区域则插入同行，拖到行之间则创建新行
- **D-06:** 行顺序通过每行左侧的拖拽手柄上下拖动调整，行内所有字段跟随移动
- **D-07:** 行内字段可自由拖拽跨行——拖出原行时自动插入目标行，原行若变空则自动删除
- **D-08:** 当拖入字段导致同行 colSpan 总和超过 12 时，自动将新字段 colSpan 压缩为剩余空间（最小 1 列），完全无剩余空间则拒绝

### 跨列调整方式
- **D-09:** 双通道调整——PropertyEditor slider 和画布 resize 手柄同步。拖拽 resize 手柄以 1 列为步长吸附，最小 1 列，最大不超过行内剩余空间 + 自身当前宽度
- **D-10:** resize 手柄拖拽时以列单位吸附，不允许非整数列位置

### 行管理操作
- **D-11:** 最简行管理——每行左侧显示拖拽手柄，悬停行时显示删除行按钮。添加行通过拖入字段或底部虚线区域自动创建
- **D-12:** 行内最后一个字段被删除或拖走后，空行自动从 schema 中移除
- **D-13:** 删除字段直接执行，不弹确认框

### Claude's Discretion
无 — 所有决策已明确。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有代码
- `frontend/src/components/designer/DesignerCanvas.vue` — 当前扁平列表画布（需重写为栅格编辑器）
- `frontend/src/components/designer/FieldPalette.vue` — 字段面板拖拽 clone 机制（vue-draggable-plus）
- `frontend/src/components/designer/PropertyEditor.vue` — 属性面板（已有 colSpan slider）
- `frontend/src/components/designer/fieldRegistry.ts` — 字段类型注册表（7 种字段类型元数据）
- `frontend/src/components/renderer/GridFormRenderer.vue` — 12 列 CSS Grid 渲染器（复用为画布底层）
- `frontend/src/components/renderer/FieldRenderer.vue` — 统一字段渲染器（mode prop: designer/fill/print）
- `frontend/src/components/renderer/GroupRenderer.vue` — 分组渲染器
- `frontend/src/types/schema.ts` — v2 schema 类型定义（SchemaV2/SchemaRow/SchemaField/SchemaItem）
- `frontend/src/stores/template.ts` — 模板 store（selectedFieldId/selectedField/selectField）

### 技术决策
- `.planning/REQUIREMENTS.md` — DESIGN-01, DESIGN-04 需求定义
- `.planning/ROADMAP.md` — Phase 11 成功标准
- `.planning/phases/10-schema/10-CONTEXT.md` — Phase 10 决策（schema 结构、渲染器架构）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GridFormRenderer.vue`: 已实现 12 列 CSS Grid 布局（`.grid-row { display: grid; grid-template-columns: repeat(12, 1fr) }`），可复用为设计器画布底层
- `FieldRenderer.vue`: 已支持 designer mode（disabled 预览），可直接在画布中使用
- `PropertyEditor.vue`: 已有 colSpan slider（QSlider 1-12），双通道调整只需同步画布 resize
- `vue-draggable-plus`: 已用于 FieldPalette → DesignerCanvas 的拖拽，需扩展为行级和行内拖拽

### Established Patterns
- SortableJS group 机制：FieldPalette 用 `pull: 'clone'`，DesignerCanvas 用 `put: true`
- Pinia store 管理选中状态：`selectedFieldId` + `selectField()`
- CSS 变量主题：`--oa-border`、`--oa-surface`、`--oa-hover`、`--q-primary`

### Integration Points
- DesignerCanvas 重写后需保持与 FieldPalette 的 SortableJS group 兼容
- PropertyEditor colSpan slider 变更需实时反映到画布
- 模板保存时 schema 结构不变（仍为 SchemaV2），只是设计器编辑能力增强

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

*Phase: 11-designer-grid*
*Context gathered: 2026-04-21*
