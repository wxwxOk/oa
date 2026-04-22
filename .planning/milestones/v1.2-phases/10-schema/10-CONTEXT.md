# Phase 10: Schema 与核心渲染器 - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

建立 v1.2 schema 类型体系（混合 items 数组：row / group / dynamic-table）和统一 GridFormRenderer 组件，使新模板可按 12 列栅格布局渲染。开发阶段不兼容旧数据，直接重构。

</domain>

<decisions>
## Implementation Decisions

### Schema 层级结构
- **D-01:** 采用混合 items 数组设计。schema 顶层为 `{ version: 2, items: SchemaItem[] }`，SchemaItem 可以是三种 type：`row`（含 fields 数组）、`group`（含 title + rows）、`dynamic-table`（含 columns 定义，Phase 12 实现）
- **D-02:** 字段定位方式为 field 级 colSpan（1-12），同一 row 内 fields 按顺序流式排列，colSpan 总和超 12 时自动换行
- **D-03:** 新建字段默认 colSpan: 12（占满一行），用户在设计器中手动调小
- **D-04:** 动态行表格作为 items 的第三种 type（`dynamic-table`），与 row/group 并列，携带 columns 定义和 colSpan

### 旧模板兼容
- **D-05:** 开发阶段不需要兼容旧数据，直接重构现有组件。不实现版本分发逻辑，不保留旧渲染路径

### 渲染器架构
- **D-06:** 单一 GridFormRenderer 组件 + mode prop（'designer' | 'fill' | 'print'），内部根据 mode 条件渲染不同交互行为
- **D-07:** 统一 FieldRenderer 组件 + mode prop，重构现有 FormFieldRenderer。designer 模式下 disabled + 拖拽手柄，fill 模式下可输入，print 模式下只显示值

### 后端校验
- **D-08:** 使用 Elysia 内置 typebox 定义 v2 schema 的 JSON 结构校验（items 数组结构、type 枚举、colSpan 范围 1-12、必填字段存在）
- **D-09:** 只做结构校验，不做业务约束校验（如同行 colSpan 总和不超 12）。业务约束由前端设计器保证

### Claude's Discretion
无 — 所有决策已明确。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有代码
- `frontend/src/stores/template.ts` — 现有 FormField 接口和 Template 类型定义（需重构）
- `frontend/src/components/public-fill/FormFieldRenderer.vue` — 现有字段渲染器（需重构为统一 FieldRenderer）
- `frontend/src/components/designer/DesignerCanvas.vue` — 现有设计器画布（需重构为 GridFormRenderer designer 模式）
- `frontend/src/components/designer/fieldRegistry.ts` — 字段类型注册表（7 种字段类型元数据）
- `backend/src/modules/template/template.route.ts` — 模板 CRUD 路由（需添加 v2 schema 校验）
- `backend/prisma/schema.prisma` — FormTemplate 模型（schema: Json, schemaVersion: Int）

### 技术决策
- `.planning/REQUIREMENTS.md` — SCHEMA-01/02/03 需求定义
- `.planning/ROADMAP.md` — Phase 10 成功标准

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fieldRegistry.ts`: 字段类型元数据（type/label/icon/group/defaultProps），可扩展为 v2 字段注册
- Quasar 组件库：QInput/QOptionGroup/QCard 等已在使用，栅格布局可用 Quasar 的 12 列 grid（col-*）或自定义 CSS Grid

### Established Patterns
- Pinia store 管理模板状态（useTemplateStore）
- Elysia + typebox 做请求体校验
- Prisma JSONB 存储 schema，schemaVersion 字段已存在

### Integration Points
- 模板保存 API（PUT /templates/:id）需接受 v2 schema 格式
- PublicFillPage.vue 需使用新 GridFormRenderer（fill 模式）
- 设计器页面需使用新 GridFormRenderer（designer 模式）

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

*Phase: 10-schema*
*Context gathered: 2026-04-21*
