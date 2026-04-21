# Phase 10: Schema 与核心渲染器 - Research

**Researched:** 2026-04-21
**Domain:** Vue 3 + Quasar grid layout, Elysia/TypeBox schema validation, component architecture
**Confidence:** HIGH

## Summary

Phase 10 将现有 flat `FormField[]` schema 重构为层级 `{ version: 2, items: SchemaItem[] }` 结构，并用单一 `GridFormRenderer` + `FieldRenderer` 组件替代现有分散的渲染逻辑。核心技术选型：CSS Grid 12 列布局（非 Quasar col 类）、Elysia `t.Recursive` + `t.Union` 做后端结构校验、mode prop 驱动三模式渲染。

现有代码影响面已完整扫描：`FormField` 接口被 8 个文件引用，`FormFieldRenderer` 被 2 个文件使用，`DesignerCanvas` 被 1 个页面引用。重构需同步更新所有消费方。

**Primary recommendation:** 使用原生 CSS Grid（`grid-template-columns: repeat(12, 1fr)` + `grid-column: span N`）实现栅格，TypeBox `t.Recursive` 定义嵌套 schema 校验，单组件 + mode prop 模式统一渲染。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: 混合 items 数组设计。schema 顶层 `{ version: 2, items: SchemaItem[] }`，SchemaItem 三种 type：row/group/dynamic-table
- D-02: field 级 colSpan（1-12），同一 row 内 fields 流式排列，超 12 自动换行
- D-03: 新建字段默认 colSpan: 12
- D-04: dynamic-table 作为 items 第三种 type，Phase 12 实现
- D-05: 开发阶段不兼容旧数据，直接重构，不实现版本分发
- D-06: 单一 GridFormRenderer + mode prop（designer/fill/print）
- D-07: 统一 FieldRenderer + mode prop，重构 FormFieldRenderer
- D-08: Elysia typebox 做 v2 schema JSON 结构校验
- D-09: 只做结构校验，不做业务约束校验

### Claude's Discretion
无 — 所有决策已明确。

### Deferred Ideas (OUT OF SCOPE)
无。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHEMA-01 | schema 从 flat FormField[] 升级为 Group/Row/Column 层级结构，支持 12 列栅格 | CSS Grid 12 列方案 + TypeScript 类型定义 + TypeBox 校验 schema |
| SCHEMA-02 | schema version:2 标识（D-05 覆盖：不实现版本分发，直接重构） | 后端 schemaVersion 字段已存在，保存时写入 version:2 即可 |
| SCHEMA-03 | 旧模板不迁移，新建用新 schema（D-05 覆盖：直接重构，不保留旧路径） | 直接替换所有组件，不需要版本分发逻辑 |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose |
|---------|---------|---------|
| Vue 3 | ^3.5.12 | Composition API, reactive schema state |
| Quasar | ^2.17.0 | UI components (QInput, QOptionGroup, QCard, QIcon) |
| Pinia | ^2.2.4 | Template store state management |
| Elysia | 1.4.28 (installed) | Backend framework with TypeBox integration |
| @sinclair/typebox | 0.34.49 (installed, via Elysia) | JSON schema validation |
| vue-draggable-plus | ^0.6.1 | Drag-drop in designer mode |
| Vitest | ^0.34.6 | Unit testing |
| @vue/test-utils | ^2.4.6 | Vue component testing |

### No New Dependencies
本阶段不需要安装任何新包。CSS Grid 是浏览器原生能力，TypeBox 已随 Elysia 安装。

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── types/
│   └── schema.ts              # v2 schema TypeScript 类型定义（SchemaV2, SchemaItem, SchemaField, etc.）
├── components/
│   ├── renderer/
│   │   ├── GridFormRenderer.vue   # 顶层渲染器（mode prop）
│   │   ├── FieldRenderer.vue      # 统一字段渲染器（替代 FormFieldRenderer）
│   │   └── GroupRenderer.vue      # 分组渲染器
│   ├── designer/
│   │   ├── FieldPalette.vue       # 保留，修改 cloneField 输出 v2 格式
│   │   ├── DesignerCanvas.vue     # 重构为使用 GridFormRenderer designer 模式
│   │   ├── PropertyEditor.vue     # 扩展支持 colSpan 编辑
│   │   ├── fieldRegistry.ts       # 扩展 defaultProps 含 colSpan
│   │   └── fields/
│   │       └── SignatureField.vue # 保留不变
│   └── submission/
│       └── SubmissionDetail.vue   # 重构为使用 GridFormRenderer print 模式
├── stores/
│   └── template.ts                # 重构 Template.schema 类型为 SchemaV2
└── pages/
    ├── FormDesignerPage.vue       # 微调（DesignerCanvas 内部重构）
    └── PublicFillPage.vue         # 重构为使用 GridFormRenderer fill 模式

backend/src/modules/template/
└── schema.validation.ts           # v2 schema TypeBox 校验定义
└── template.route.ts              # PUT 路由引用新校验
```

### Pattern 1: v2 Schema TypeScript 类型定义

**Confidence: HIGH** (pure TypeScript, no external dependency)

```typescript
// frontend/src/types/schema.ts

export type FieldType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'phone' | 'signature';

export interface SchemaField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  colSpan: number; // 1-12, default 12
  placeholder?: string;
  options?: string[];
}

export interface SchemaRow {
  type: 'row';
  fields: SchemaField[];
}

export interface SchemaGroup {
  type: 'group';
  title: string;
  rows: SchemaRow[];
}

export interface SchemaDynamicTable {
  type: 'dynamic-table';
  label: string;
  colSpan: number;
  columns: Array<{ key: string; label: string; type: FieldType; width?: number }>;
}

export type SchemaItem = SchemaRow | SchemaGroup | SchemaDynamicTable;

export interface SchemaV2 {
  version: 2;
  items: SchemaItem[];
}
```

**Key design notes:**
- `SchemaField` 从现有 `FormField` 演化：去掉 `sort`（由 row 内位置隐含），新增 `colSpan`
- `SchemaRow` 是最小布局单元，一个 row 内的 fields 按 colSpan 流式排列
- `SchemaGroup` 包含 title + rows，实现分组标题功能
- `SchemaDynamicTable` 本阶段仅定义类型，渲染为 placeholder stub

### Pattern 2: CSS Grid 12 列栅格布局

**Confidence: HIGH** (CSS Grid spec, 所有现代浏览器支持)

**Why CSS Grid over Quasar col classes:**
- Quasar 的 `col-{n}` 基于 flexbox，需要 `.row` 包裹，不支持自动换行到下一行
- CSS Grid 的 `grid-column: span N` 配合 `grid-template-columns: repeat(12, 1fr)` 天然支持流式换行
- 当同一 row 内 fields 的 colSpan 总和超 12 时，CSS Grid auto-placement 自动将溢出项放到下一隐式行
- UI-SPEC 已明确选择 CSS Grid

```vue
<!-- GridFormRenderer.vue 核心布局 -->
<template>
  <div class="grid-form" :class="`mode-${mode}`">
    <template v-for="(item, idx) in schema.items" :key="idx">
      <!-- Row -->
      <div v-if="item.type === 'row'" class="grid-row">
        <FieldRenderer
          v-for="field in item.fields"
          :key="field.id"
          :field="field"
          :mode="mode"
          :style="{ gridColumn: `span ${field.colSpan}` }"
          :model-value="modelValue?.[field.id]"
          @update:model-value="emitField(field.id, $event)"
        />
      </div>

      <!-- Group -->
      <GroupRenderer
        v-else-if="item.type === 'group'"
        :group="item"
        :mode="mode"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
      />

      <!-- Dynamic Table placeholder (Phase 12) -->
      <div v-else-if="item.type === 'dynamic-table'" class="dynamic-table-stub">
        <span>{{ item.label }} (Phase 12)</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.grid-row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 8px 16px; /* row-gap 8px, column-gap 16px per UI-SPEC */
}
</style>
```

**Auto-wrap behavior verified:** CSS Grid auto-placement algorithm 会在 `grid-column: span N` 无法放入当前行剩余列时，自动创建隐式行并将该项放入。这正是 D-02 要求的"超 12 自动换行"行为。无需额外 JS 逻辑。

**Performance:** CSS Grid 布局计算由浏览器原生引擎处理，100+ 字段场景下性能远优于 JS 计算布局。每个 grid-row 独立形成 grid context，不会因为总字段数增加而导致单个 grid 计算复杂度上升。

### Pattern 3: Elysia TypeBox v2 Schema 校验

**Confidence: HIGH** (Elysia 1.4.28 + TypeBox 0.34.49, `t.Recursive` 和 `t.Union` 均已验证可用)

Elysia 的 `t` 对象完整暴露 TypeBox API，包括 `t.Recursive`、`t.Union`、`t.Literal`。

```typescript
// backend/src/modules/template/schema.validation.ts
import { t } from 'elysia';

const FieldType = t.Union([
  t.Literal('text'),
  t.Literal('textarea'),
  t.Literal('radio'),
  t.Literal('checkbox'),
  t.Literal('date'),
  t.Literal('phone'),
  t.Literal('signature'),
]);

const SchemaField = t.Object({
  id: t.String(),
  type: FieldType,
  label: t.String(),
  required: t.Boolean(),
  colSpan: t.Integer({ minimum: 1, maximum: 12 }),
  placeholder: t.Optional(t.String()),
  options: t.Optional(t.Array(t.String())),
});

const SchemaRow = t.Object({
  type: t.Literal('row'),
  fields: t.Array(SchemaField, { minItems: 1 }),
});

const SchemaGroup = t.Object({
  type: t.Literal('group'),
  title: t.String(),
  rows: t.Array(SchemaRow),
});

const SchemaDynamicTable = t.Object({
  type: t.Literal('dynamic-table'),
  label: t.String(),
  colSpan: t.Integer({ minimum: 1, maximum: 12 }),
  columns: t.Array(t.Object({
    key: t.String(),
    label: t.String(),
    type: FieldType,
    width: t.Optional(t.Integer({ minimum: 1 })),
  })),
});

const SchemaItem = t.Union([SchemaRow, SchemaGroup, SchemaDynamicTable]);

export const SchemaV2Body = t.Object({
  version: t.Literal(2),
  items: t.Array(SchemaItem),
});
```

**Why NOT use `t.Recursive`:** 本 schema 结构不是真正的递归（group 包含 rows，但 row 不包含 group）。只有两层嵌套，用普通 `t.Object` 嵌套即可。`t.Recursive` 仅在无限深度自引用时需要（如树形评论）。

**Discriminated union 行为:** `t.Union([SchemaRow, SchemaGroup, SchemaDynamicTable])` 中每个分支都有 `type: t.Literal(...)` 字段。TypeBox 的 `anyOf` 校验器会逐一尝试匹配，`type` 字段的 literal 值确保只有一个分支能匹配成功。虽然不是 JSON Schema 原生 discriminator，但对于 3 个分支的 union 性能完全足够。

**D-09 compliance:** 只校验结构（type 枚举、colSpan 范围 1-12、必填字段存在），不校验业务约束（如同行 colSpan 总和）。

**Error messages:** Elysia 默认返回 TypeBox 校验错误，格式为 `{ path, message }`。对于 union 类型校验失败，错误信息可能不够直观（会列出所有分支的失败原因）。建议在 route 的 `error` handler 中统一包装为 "模板结构校验失败" 消息。

### Pattern 4: FieldRenderer Mode-Based 渲染

**Confidence: HIGH** (Vue 3 标准模式)

**推荐方案：单组件 + mode prop + v-if 分支**

```vue
<!-- FieldRenderer.vue 骨架 -->
<template>
  <div class="field-renderer" :class="`mode-${mode}`">
    <div class="field-label">
      {{ field.label }}
      <span v-if="field.required && mode !== 'print'" class="required-mark">*</span>
    </div>

    <!-- Print mode: plain text -->
    <template v-if="mode === 'print'">
      <div class="print-value">{{ formatValue(field, modelValue) }}</div>
    </template>

    <!-- Designer mode: disabled inputs -->
    <template v-else-if="mode === 'designer'">
      <q-input v-if="isTextLike" outlined dense disabled :placeholder="field.placeholder" />
      <q-option-group v-else-if="isOptionType" :type="field.type" disabled :options="mapOptions(field.options)" :model-value="field.type === 'checkbox' ? [] : null" />
      <div v-else-if="field.type === 'signature'" class="signature-placeholder">签名区域</div>
    </template>

    <!-- Fill mode: interactive inputs -->
    <template v-else>
      <!-- 复用现有 FormFieldRenderer 的逻辑，但不含 label 部分 -->
      <q-input v-if="field.type === 'text'" outlined :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :placeholder="field.placeholder" :rules="field.required ? [requiredRule] : []" />
      <!-- ... 其他字段类型 ... -->
    </template>
  </div>
</template>
```

**Why single component over separate components:**
- 7 种字段类型 x 3 种模式 = 21 种组合。拆成 3 个组件（DesignerField/FillField/PrintField）会导致字段类型 switch 逻辑重复 3 次
- mode prop 方案中，designer 和 fill 的模板结构高度相似（仅 disabled 差异），print 是独立分支
- 单组件便于 fieldRegistry 统一管理

**Print mode 渲染规则（from UI-SPEC）:**
| Field Type | Print Output |
|------------|-------------|
| text/textarea/phone/date | Plain text value, "—" if empty |
| radio | Selected option text |
| checkbox | Selected options joined by "、" |
| signature | `<img>` tag, max-height 80px |

### Pattern 5: Schema 迁移策略

**Confidence: HIGH** (基于完整代码扫描)

**现有 FormField 接口消费方完整清单：**

| File | Usage | Migration Action |
|------|-------|-----------------|
| `stores/template.ts` | `FormField` 接口定义 + `Template.schema: FormField[]` | 替换为 `SchemaV2` 类型 |
| `components/designer/DesignerCanvas.vue` | `import FormField`, `fields: FormField[]` | 重构为 GridFormRenderer designer 模式 |
| `components/designer/fieldRegistry.ts` | `FormField['type']`, `Partial<FormField>` | 改为引用新 `FieldType`/`SchemaField` |
| `components/designer/FieldPalette.vue` | `cloneField()` 返回 FormField 格式 | 修改返回 SchemaField 格式（含 colSpan: 12） |
| `components/designer/PropertyEditor.vue` | `store.selectedField` (FormField) | 适配新 SchemaField 类型 |
| `components/public-fill/FormFieldRenderer.vue` | `field: FormField` prop | 被 FieldRenderer 替代，此文件可删除 |
| `pages/PublicFillPage.vue` | `FormField[]` schema 解析 + FormFieldRenderer | 重构为 GridFormRenderer fill 模式 |
| `components/submission/SubmissionDetail.vue` | `parseSchema()` 解析 flat array | 重构为 GridFormRenderer print 模式 |

**推荐重构顺序：**
1. 先创建 `types/schema.ts`（新类型定义）和 `renderer/` 组件（新渲染器）
2. 再修改 `stores/template.ts`（Template.schema 类型改为 SchemaV2）
3. 然后逐个更新消费方页面（PublicFillPage, DesignerCanvas, SubmissionDetail）
4. 最后删除 `FormFieldRenderer.vue`，清理旧 `FormField` 导出

**fieldRegistry.ts 复用策略：** 现有 `FIELD_TYPES` 数组的 `defaultProps` 可直接映射为新 `SchemaField` 的默认值。需要扩展 `defaultProps` 增加 `colSpan: 12`。`FieldTypeDef.type` 改为引用新 `FieldType` 类型。

### Pattern 6: Template Store 重构

**Confidence: HIGH**

```typescript
// stores/template.ts 关键变更
import type { SchemaV2, SchemaField, SchemaItem } from 'src/types/schema';

export interface Template {
  id: number;
  name: string;
  description: string | null;
  schema: SchemaV2;           // 从 FormField[] 改为 SchemaV2
  schemaVersion: number;
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE';
  requireIdentity: boolean;
  creatorId: number;
  creator: { id: number; realName: string };
  createdAt: string;
  updatedAt: string;
}
```

**Store actions 变更：**
- `update()` 的 payload.schema 类型从 `FormField[]` 改为 `SchemaV2`
- `selectedField` getter 需要遍历 `schema.items` 中所有 row 的 fields 来查找
- 新增 helper：`findFieldById(id: string): SchemaField | null` — 递归搜索 items -> rows -> fields

### Anti-Patterns to Avoid

- **Deep reactive proxy on schema:** 不要对整个 `schema: SchemaV2` 使用 `reactive()`。Pinia store 的 `state` 已经是 reactive 的，但深层嵌套（items[].rows[].fields[]）的 proxy 开销可能在大型表单中可感知。如果遇到性能问题，考虑 `shallowRef` + `triggerRef` 手动触发更新。
- **在 FieldRenderer 中 watch deep schema:** 避免 `watch(() => props.field, ..., { deep: true })`。field 是 reactive proxy 的一部分，deep watch 会在任何同级字段变化时触发。用 computed 派生需要的值。
- **在 TypeBox schema 中校验业务逻辑:** D-09 明确只做结构校验。不要在 TypeBox 中添加 `colSpan 总和 <= 12` 之类的自定义校验。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 12 列栅格布局 | JS 计算列位置 | CSS Grid `repeat(12, 1fr)` + `span N` | 浏览器原生，自动换行，零 JS |
| JSON schema 校验 | 手写 if/else 校验 | Elysia `t.*` TypeBox | 类型安全，自动错误消息 |
| 拖拽排序 | 手写 drag events | vue-draggable-plus（已安装） | 成熟库，已在 v1.1 使用 |
| 字段类型注册 | 硬编码 switch | fieldRegistry.ts 数据驱动 | 已有模式，扩展性好 |

## Common Pitfalls

### Pitfall 1: CSS Grid span 超出列数
**What goes wrong:** `grid-column: span 13` 或更大值会导致 grid 创建额外的隐式列
**Why it happens:** CSS Grid 允许 span 值超过 grid-template-columns 定义的列数
**How to avoid:** TypeBox 校验 `colSpan: t.Integer({ minimum: 1, maximum: 12 })`；前端 PropertyEditor 用 QSlider/QInput 限制 1-12 范围
**Warning signs:** 字段宽度异常，超出容器

### Pitfall 2: Vue reactivity 与深嵌套 schema
**What goes wrong:** 修改 `schema.items[0].fields[2].label` 不触发视图更新
**Why it happens:** 如果 schema 是通过 `JSON.parse()` 从 API 返回后直接赋值，Pinia 的 reactive proxy 会自动深层代理。但如果中间有 `structuredClone` 或 `Object.freeze`，proxy 链会断裂
**How to avoid:** 确保 API 返回的 schema 直接赋值给 store state（Pinia 自动 reactive wrap）。不要 freeze 或 clone schema 对象
**Warning signs:** 编辑字段属性后画布不更新

### Pitfall 3: TypeBox Union 校验错误信息不直观
**What goes wrong:** `t.Union([SchemaRow, SchemaGroup, SchemaDynamicTable])` 校验失败时，错误消息列出所有 3 个分支的失败原因
**Why it happens:** TypeBox 的 `anyOf` 校验器逐一尝试每个分支，收集所有失败信息
**How to avoid:** 在 Elysia route 的 error handler 中，对 schema 校验失败统一返回 "模板结构校验失败，请检查字段配置后重试"（UI-SPEC copywriting contract）
**Warning signs:** 前端收到冗长的校验错误数组

### Pitfall 4: FieldPalette clone 格式不匹配
**What goes wrong:** FieldPalette 的 `cloneField()` 仍然输出旧 `FormField` 格式（含 sort，无 colSpan），导致拖入画布后 schema 结构不合法
**Why it happens:** 忘记同步更新 FieldPalette 的 clone 逻辑
**How to avoid:** cloneField 必须返回 `SchemaField` 格式：`{ id, type, label, required: false, colSpan: 12, ...defaultProps }`
**Warning signs:** 保存时后端校验失败

### Pitfall 5: SubmissionDetail 旧数据兼容
**What goes wrong:** 已有的 v1 提交数据的 schema 仍然是 flat `FormField[]` 格式，用 v2 渲染器解析会失败
**Why it happens:** D-05 说"不兼容旧数据"指的是模板设计器不兼容，但已有提交的 `template.schema` 快照仍是 v1 格式
**How to avoid:** SubmissionDetail 需要检测 schema 格式（有 `version: 2` 则用 GridFormRenderer，否则 fallback 到简单表格渲染）。或者按 D-05 精神，直接让旧提交数据用现有的 table 渲染逻辑（不改 SubmissionDetail 的旧数据路径）
**Warning signs:** 查看旧提交时页面白屏

### Pitfall 6: Backend schema body 类型变更
**What goes wrong:** PUT /templates/:id 的 body.schema 从 `t.Array(t.Object({...}))` 改为 `SchemaV2Body` 后，前端发送旧格式请求会被拒绝
**Why it happens:** 前后端 schema 格式必须同步更新
**How to avoid:** 前端 store.update() 发送 `{ schema: schemaV2Object }` 而非 `{ schema: fieldsArray }`。后端 PUT route 的 body validation 替换为新 SchemaV2Body
**Warning signs:** 保存模板时 422 错误

## Code Examples

### Example 1: GridFormRenderer 完整骨架

```vue
<script setup lang="ts">
import type { SchemaV2 } from 'src/types/schema';
import FieldRenderer from './FieldRenderer.vue';
import GroupRenderer from './GroupRenderer.vue';

const props = defineProps<{
  schema: SchemaV2;
  mode: 'designer' | 'fill' | 'print';
  modelValue?: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
}>();

function emitField(fieldId: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [fieldId]: value });
}
</script>
```

### Example 2: Backend route 集成

```typescript
// template.route.ts PUT handler 变更
import { SchemaV2Body } from './schema.validation';

// body validation 中 schema 字段改为：
body: t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  description: t.Optional(t.String()),
  schema: t.Optional(SchemaV2Body),
  requireIdentity: t.Optional(t.Boolean()),
}),
```

### Example 3: GroupRenderer 骨架

```vue
<template>
  <q-card flat bordered class="group-renderer q-mb-sm">
    <div class="group-header">{{ group.title }}</div>
    <div class="group-body">
      <div v-for="(row, idx) in group.rows" :key="idx" class="grid-row">
        <FieldRenderer
          v-for="field in row.fields"
          :key="field.id"
          :field="field"
          :mode="mode"
          :style="{ gridColumn: `span ${field.colSpan}` }"
          :model-value="modelValue?.[field.id]"
          @update:model-value="emitField(field.id, $event)"
        />
      </div>
    </div>
  </q-card>
</template>

<style scoped>
.group-header {
  font-size: 16px;
  font-weight: 600;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--oa-border);
}
.group-body { padding: 16px; }
.grid-row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 8px 16px;
}
</style>
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 0.34.6 + @vue/test-utils 2.4.6 |
| Config file | `frontend/vitest.config.ts` (exists) |
| Environment | happy-dom |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHEMA-01 | v2 schema 类型定义正确 | unit | `cd frontend && npx vitest run src/types/__tests__/schema.test.ts` | Wave 0 |
| SCHEMA-01 | TypeBox 校验合法/非法 payload | unit | `cd backend && bun test src/modules/template/__tests__/schema.validation.test.ts` | Wave 0 |
| SCHEMA-01 | GridFormRenderer 按 colSpan 渲染 | component | `cd frontend && npx vitest run src/components/renderer/__tests__/GridFormRenderer.test.ts` | Wave 0 |
| SCHEMA-02 | 保存时 schema 含 version:2 | unit | `cd backend && bun test src/modules/template/__tests__/schema.validation.test.ts` | Wave 0 |
| SCHEMA-03 | SubmissionDetail 旧数据 fallback | component | `cd frontend && npx vitest run src/components/submission/__tests__/SubmissionDetail.test.ts` | Wave 0 |
| D-06 | GridFormRenderer 三模式渲染 | component | `cd frontend && npx vitest run src/components/renderer/__tests__/GridFormRenderer.test.ts` | Wave 0 |
| D-07 | FieldRenderer 7 种字段 x 3 模式 | component | `cd frontend && npx vitest run src/components/renderer/__tests__/FieldRenderer.test.ts` | Wave 0 |

### Backend Test Infrastructure
| Property | Value |
|----------|-------|
| Runtime | Bun |
| Test runner | `bun test` (built-in) |
| Config | None needed (Bun test works out of box) |
| Quick run | `cd backend && bun test src/modules/template/__tests__/` |

**Note:** Backend 目前没有测试文件。需要创建 `backend/src/modules/template/__tests__/` 目录。Bun 内置 test runner 兼容 Jest API（`describe`, `it`, `expect`）。

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run && cd ../backend && bun test`
- **Phase gate:** Full suite green

### Wave 0 Gaps
- [ ] `frontend/src/types/__tests__/schema.test.ts` — schema 类型 + helper 函数测试
- [ ] `frontend/src/components/renderer/__tests__/GridFormRenderer.test.ts` — 三模式渲染测试
- [ ] `frontend/src/components/renderer/__tests__/FieldRenderer.test.ts` — 7 字段类型 x 3 模式
- [ ] `backend/src/modules/template/__tests__/schema.validation.test.ts` — TypeBox 校验测试
- [ ] `frontend/src/components/submission/__tests__/SubmissionDetail.test.ts` — 旧数据 fallback

## Risks & Mitigations

### Risk 1: SubmissionDetail 旧数据渲染 (MEDIUM)
**Risk:** 已有 v1 提交数据的 `template.schema` 快照是 flat `FormField[]`，v2 渲染器无法解析
**Mitigation:** SubmissionDetail 保留现有 table 渲染作为 fallback。检测 `schema.version === 2` 时用 GridFormRenderer print 模式，否则用现有 table 逻辑。这不违反 D-05（D-05 说的是设计器不兼容旧模板，不是查看旧提交数据）
**Impact if unmitigated:** 查看旧提交时白屏

### Risk 2: Designer 模式拖拽集成 (MEDIUM)
**Risk:** 现有 DesignerCanvas 使用 vue-draggable-plus 直接操作 `FormField[]` 数组。重构为 v2 schema 后，拖拽需要操作 `items[rowIndex].fields` 嵌套结构
**Mitigation:** Phase 10 的 designer 模式先实现基础渲染（显示 schema 内容），拖拽交互的完整重写放在 Phase 11（设计器栅格编辑）。Phase 10 的 designer 模式只需要：显示字段 + 选中字段 + 属性编辑
**Impact if unmitigated:** Phase 10 scope 膨胀

### Risk 3: Store selectedField getter 复杂化 (LOW)
**Risk:** 从 flat array `schema.find(f => f.id === id)` 变为需要遍历 `items -> rows -> fields` 的嵌套搜索
**Mitigation:** 在 `types/schema.ts` 中提供 `flattenFields(schema: SchemaV2): SchemaField[]` helper，store getter 调用此 helper
**Impact if unmitigated:** 代码重复，多处手写嵌套遍历

### Risk 4: PublicFillPage formData 初始化 (LOW)
**Risk:** 现有 PublicFillPage 用 `schema.forEach(f => formData[f.id] = ...)` 初始化表单数据。v2 schema 需要遍历嵌套结构
**Mitigation:** 使用 `flattenFields()` helper 获取所有字段，然后初始化 formData
**Impact if unmitigated:** 填写页字段无初始值，checkbox 报错

## Open Questions

1. **DesignerCanvas Phase 10 scope boundary**
   - Phase 10 的 designer 模式需要支持到什么程度？
   - 建议：Phase 10 只做渲染 + 选中 + 属性编辑（含 colSpan），拖拽重排放 Phase 11
   - Planner 需要明确这个边界

2. **旧提交数据的 schema 快照格式**
   - 现有 Submission 表的 `template.schema` 是查询时 join 的实时数据，不是提交时的快照
   - 如果模板 schema 被更新为 v2 格式，旧提交查看时 join 到的是新 schema，但 `data` 字段的 key 仍然是旧 field id
   - 现有 `versionMismatch` 逻辑已处理此情况（fallback 到 raw data 展示）
   - 建议：保留现有 SubmissionDetail 的 fallback 逻辑即可

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). Phase 10 is purely code/config changes using already-installed packages.

## Sources

### Primary (HIGH confidence)
- Elysia TypeBox docs: https://elysiajs.com/patterns/typebox — Elysia `t` API, Union/Literal/Recursive usage
- CSS Grid W3C spec: https://www.w3.org/TR/css3-grid-layout — auto-placement, implicit rows, span behavior
- MDN grid-auto-rows: https://developer.mozilla.org/en-US/docs/Web/CSS/grid-auto-rows — implicit row sizing
- TypeBox GitHub #633: https://github.com/sinclairzx81/typebox/issues/633 — discriminated union patterns
- TypeBox GitHub #71: https://github.com/sinclairzx81/typebox/issues/71 — Type.Recursive syntax
- Vue 3 Reactivity Advanced: https://vuejs.org/api/reactivity-core — shallowRef/shallowReactive

### Secondary (MEDIUM confidence)
- CSS-Tricks auto-fill vs auto-fit: https://css-tricks.com/auto-sizing-columns-css-grid-auto-fill-vs-auto-fit
- Grid Layout Pitfalls: https://blog.pixelfreestudio.com/grid-layout-pitfalls-avoiding-implicit-grid-gotchas/

### Codebase (HIGH confidence)
- `frontend/src/stores/template.ts` — FormField interface, Template type, store actions
- `frontend/src/components/public-fill/FormFieldRenderer.vue` — existing field renderer (149 lines)
- `frontend/src/components/designer/DesignerCanvas.vue` — existing canvas (147 lines)
- `frontend/src/components/designer/fieldRegistry.ts` — 7 field types metadata
- `frontend/src/components/designer/FieldPalette.vue` — cloneField() logic
- `frontend/src/components/designer/PropertyEditor.vue` — field property editing
- `frontend/src/components/submission/SubmissionDetail.vue` — submission detail with schema parsing
- `frontend/src/pages/PublicFillPage.vue` — public fill page with FormFieldRenderer
- `frontend/src/pages/FormDesignerPage.vue` — designer page layout
- `backend/src/modules/template/template.route.ts` — PUT route with current schema validation
- `backend/prisma/schema.prisma` — FormTemplate model (schema: Json, schemaVersion: Int)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions verified from node_modules
- Architecture: HIGH — CSS Grid behavior verified against W3C spec, TypeBox API verified against Elysia docs
- Pitfalls: HIGH — based on direct codebase analysis and known Vue 3 reactivity patterns
- TypeBox recursive: HIGH — verified that this schema does NOT need Type.Recursive (only 2-level nesting)

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable stack, no fast-moving dependencies)

## RESEARCH COMPLETE
