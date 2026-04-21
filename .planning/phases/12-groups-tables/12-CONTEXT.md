# Phase 12: 分组与动态行表格 - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

让用户在设计器中创建带标题的分组区块（`group`）和可增删行的动态表格（`dynamic-table`）。完成两种 item type 的设计器交互、填写页交互与提交数据结构。不涉及 PDF 保真（Phase 13）或响应式移动端卡片（Phase 14）。

</domain>

<decisions>
## Implementation Decisions

### 分组创建与结构编辑
- **D-01:** 字段面板新增第三组「结构」，含「分组」和「动态表格」两个结构项，拖入画布即可创建（与现有字段拖拽体验统一）
- **D-02:** 分组内行/字段编辑完全复用顶层行编辑逻辑（将 DesignerCanvas 的行编辑能力抽取为可复用组件或递归渲染，同样支持行拖拽排序、colSpan resize、拖入创建新行等）
- **D-03:** 字段可跨分组边界自由拖拽（vue-draggable-plus `group: 'fields'` 同名机制已支持）
- **D-04:** 分组在顶层 items[] 与行平等排列，左侧带拖拽手柄可上下排序（复用 Phase 11 行手柄 UX）

### 分组属性与标题编辑
- **D-05:** 分组选中后，右侧 PropertyEditor 显示标题输入框 + 删除按钮（与字段属性编辑模式统一）
- **D-06:** 拖入即创建空分组，标题默认为「分组标题」，用户选中后在属性面板修改
- **D-07:** 分组不支持折叠/样式自定义，仅保持现有 GroupRenderer 表格外观（标题栏 + 内容区），复杂度限定在 REQUIREMENTS 范围
- **D-08:** 删除分组直接执行，不弹确认框（与 Phase 11 D-13 字段删除 UX 保持一致）

### 动态表格列结构定义
- **D-09:** 列结构在 PropertyEditor 中以内嵌列表形式编辑，每行一列条目（label / type / width），支持增列/删列/列重排
- **D-10:** 列支持的字段类型精简为 `text / radio / checkbox / date / phone` 共 5 种（排除 textarea/signature，行内体验不佳）
- **D-11:** 列宽采用 Flex 比例（整数 1-6，类似 flex-grow），整体用 CSS `table-layout` 或 `flex` 布局；与 12 列栅格哲学一致，简单自适应
- **D-12:** 新建动态表格默认生成 2 列 text（label: 「列 1」「列 2」），让用户立即看到雏形；colSpan 默认 12（占满一行）

### 动态表格填写交互与数据格式
- **D-13:** 填写页每行右侧显示删除图标（悬停可见），表格底部固定显示「+ 添加行」按钮（常规表格组件规范）
- **D-14:** 填写页初始渲染 1 行空值（降低上手成本，无需设计器额外配置 minRows）
- **D-15:** 提交数据结构：`submission.data[tableId] = [{colKey1: val, colKey2: val}, ...]`——行为数组、列为键值对象，列调整顺序不影响历史数据解析
- **D-16:** Print 模式（提交详情 + Phase 13 PDF 导出）使用原生 HTML `<table>` + border 渲染，`table-layout: fixed` 保证列宽稳定，为 Phase 13 jspdf-autotable 天然对接

### 列键（colKey）约定
- 前端在列定义中保留 `key: string` 字段（目前 SchemaDynamicTable.columns 已定义），创建列时自动生成稳定 key（如 nanoid 或 `col-{idx}`），用户编辑仅改动 label/type/width；key 保证数据存取一致

### Claude's Discretion
- 字段面板「结构」组的图标选择（Material icon）
- 列条目拖拽排序交互的视觉样式
- 动态表格画布预览中是否渲染一行示例数据（仅 UI 细节）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有代码
- `frontend/src/types/schema.ts` — `SchemaGroup` / `SchemaDynamicTable` / `SchemaItem` 类型定义（已就位）
- `frontend/src/components/renderer/GridFormRenderer.vue` — 顶层渲染器，`dynamic-table` 当前为 stub（L29-31），需实现完整渲染
- `frontend/src/components/renderer/GroupRenderer.vue` — 分组渲染器，被动显示（designer/fill/print），Phase 12 需补充 designer 下的交互能力或由新组件叠加
- `frontend/src/components/renderer/FieldRenderer.vue` — 统一字段渲染器，动态表格列单元格复用（精简 5 种类型）
- `frontend/src/components/designer/DesignerCanvas.vue` — 顶层画布，当前仅处理 row，需扩展 group / dynamic-table 处理分支；行编辑逻辑需抽取用于分组内
- `frontend/src/components/designer/FieldPalette.vue` — 字段面板，需新增「结构」组
- `frontend/src/components/designer/fieldRegistry.ts` — 字段类型注册表，需追加结构类型或独立注册
- `frontend/src/components/designer/PropertyEditor.vue` — 属性面板，需按 selected item type 分派（field / group / dynamic-table）
- `frontend/src/components/designer/composables/gridUtils.ts` — `remainingCols` / `compressColSpan`（跨组拖拽仍需调用）
- `frontend/src/components/submission/SubmissionDetail.vue` — 提交详情，已使用 GridFormRenderer print 模式，动态表格渲染完成后自动复用
- `frontend/src/pages/PublicFillPage.vue` — 公开填写页，通过 GridFormRenderer fill 模式，动态表格填写 UI 内嵌其中
- `frontend/src/stores/template.ts` — `selectedFieldId` / `selectField` 机制，需扩展为支持 group / dynamic-table 选中状态
- `backend/src/modules/template/schema.validation.ts` — `SchemaGroup` / `SchemaDynamicTable` typebox 校验已就位（Phase 10），Phase 12 可能需补充列 type 枚举收紧（若排除 textarea/signature）

### 技术决策
- `.planning/REQUIREMENTS.md` — DESIGN-02（分组 + 标题）、DESIGN-03（动态表格列结构）、RENDER-03（填写页表格增删行）需求定义
- `.planning/ROADMAP.md` — Phase 12 四条成功标准（分组创建、表格列定义、填写增删行、数据数组存储）
- `.planning/phases/10-schema/10-CONTEXT.md` — Phase 10 schema/渲染器/后端校验决策
- `.planning/phases/11-designer-grid/11-CONTEXT.md` — Phase 11 画布栅格编辑、拖拽交互、colSpan 调整决策（本阶段继承）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GroupRenderer.vue`：分组 UI 外观（标题栏 + grid-row 容器）已实现，可直接用于 fill/print，designer 模式需叠加交互层（拖拽手柄、删除按钮、属性选中）
- `GridFormRenderer.vue` 的 row 分支：已支持 `gridColumn: span {colSpan}`，分组内 rows 可复用同样的 CSS Grid
- `DesignerCanvas.vue` 的行编辑逻辑（VueDraggable 行字段、resize 手柄、colSpan 压缩）是 Phase 12 分组内编辑的模板，需要抽取
- `FieldRenderer.vue` 在 fill 模式已支持全部 7 种字段，动态表格列单元格可直接渲染（精简 5 种即可）
- Phase 10/11 已建立 Pinia store 的 `selectedFieldId`，需扩展为能区分选中 field / group / dynamic-table 的语义（建议改为 `selectedItemId` 或新增 `selectedType` 字段）

### Established Patterns
- SortableJS group 命名：FieldPalette 用 `pull: 'clone'`，DesignerCanvas 用 `put: true, group: 'fields'`——跨分组拖拽沿用同一 group
- Pinia store 管理选中状态 + 双向 reactive 更新 schema
- CSS 变量主题：`--oa-border` / `--oa-surface` / `--oa-hover` / `--q-primary`
- Elysia + typebox 后端校验，schema.validation.ts 已定义 SchemaDynamicTable.columns 结构

### Integration Points
- `PublicFillPage.vue` 的 GridFormRenderer 需支持 dynamic-table fill 模式（增删行 + 表格数据与 formData 合并）
- `SubmissionDetail.vue` 的 print 模式渲染需在 GridFormRenderer 内完成（已走 v2 路径）
- `backend/template.route.ts` 提交接收数据需容忍 `data[tableId] = Array`（JSONB 本身支持）
- Phase 13 PDF 导出将读取相同的 GridFormRenderer print HTML，动态表格原生 `<table>` 决策关键

</code_context>

<specifics>
## Specific Ideas

- 动态表格列调整顺序不应破坏已有数据：列用 stable `key` 标识，而非下标（D-15 的直接后果）
- 分组内外 UX 保持一致：拖拽手柄、resize 手柄、选中态视觉都复用（D-02 的延伸）
- 提交详情 print 模式与 Phase 13 PDF 天然兼容：原生 `<table>` 是关键（D-16）

</specifics>

<deferred>
## Deferred Ideas

- 嵌套分组（分组内再套分组）：REQUIREMENTS 明确 v2 ADV-02 处理
- 动态表格行上下拖拽排序：Phase 12 只做增删，排序留 v2 优化
- minRows / maxRows 配置：v2 可选增强，v1.2 默认 1 行无上限
- 动态表格列条件显隐（如 type=radio 才显示 options 编辑）：基础实现即可，列类型切换时重置 options 由实现阶段按需处理
- 移动端动态表格卡片化布局：Phase 14 处理（RENDER-02 + RENDER-03 移动端部分）
- 字段面板「结构」组的折叠/展开图标：留给 UI 细节阶段

</deferred>

---

*Phase: 12-groups-tables*
*Context gathered: 2026-04-21*
