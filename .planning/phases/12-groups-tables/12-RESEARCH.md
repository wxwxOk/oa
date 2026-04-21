# Phase 12: 分组与动态行表格 - Research

**Researched:** 2026-04-21
**Domain:** Vue 3 nested drag-and-drop containers, dynamic table editing, schema extension
**Confidence:** HIGH

## Summary

Phase 12 adds two structural item types (group, dynamic-table) to an existing Vue 3 + Quasar form designer. The codebase already has type definitions (`SchemaGroup`, `SchemaDynamicTable`), a working row-level drag-and-drop canvas (`DesignerCanvas.vue`), and a passive `GroupRenderer.vue`. The core challenge is: (1) extracting DesignerCanvas's row-editing logic into a reusable component so groups can host the same editing experience, (2) building a column-definition UI in PropertyEditor, and (3) implementing the fill-time add/remove row interaction for dynamic tables.

A critical schema gap was discovered: neither `SchemaGroup` nor `SchemaDynamicTable` currently have `id` fields, but both need them — groups for selection state, dynamic tables for data keying (`submission.data[tableId]`). This must be addressed first.

**Primary recommendation:** Extract row-editing into a reusable `DesignerRowEditor` component, add `id` fields to group/dynamic-table schema types, and build the dynamic table fill UI as a standalone `DynamicTableFill.vue` component using native HTML table (not QTable) per D-16.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 字段面板新增第三组「结构」，含「分组」和「动态表格」两个结构项，拖入画布即可创建
- **D-02:** 分组内行/字段编辑完全复用顶层行编辑逻辑（将 DesignerCanvas 的行编辑能力抽取为可复用组件或递归渲染）
- **D-03:** 字段可跨分组边界自由拖拽（vue-draggable-plus `group: 'fields'` 同名机制）
- **D-04:** 分组在顶层 items[] 与行平等排列，左侧带拖拽手柄可上下排序
- **D-05:** 分组选中后，右侧 PropertyEditor 显示标题输入框 + 删除按钮
- **D-06:** 拖入即创建空分组，标题默认为「分组标题」，用户选中后在属性面板修改
- **D-07:** 分组不支持折叠/样式自定义，仅保持现有 GroupRenderer 表格外观
- **D-08:** 删除分组直接执行，不弹确认框
- **D-09:** 列结构在 PropertyEditor 中以内嵌列表形式编辑
- **D-10:** 列支持的字段类型精简为 text / radio / checkbox / date / phone（5 种）
- **D-11:** 列宽采用 Flex 比例（整数 1-6）
- **D-12:** 新建动态表格默认生成 2 列 text（label: 「列 1」「列 2」），colSpan 默认 12
- **D-13:** 填写页每行右侧显示删除图标（悬停可见），表格底部固定显示「+ 添加行」按钮
- **D-14:** 填写页初始渲染 1 行空值
- **D-15:** 提交数据结构：submission.data[tableId] = [{colKey1: val, ...}, ...]
- **D-16:** Print 模式使用原生 HTML `<table>` + border 渲染，table-layout: fixed

### Claude's Discretion
- 字段面板「结构」组的图标选择（Material icon）
- 列条目拖拽排序交互的视觉样式
- 动态表格画布预览中是否渲染一行示例数据

### Deferred Ideas (OUT OF SCOPE)
- 嵌套分组（分组内再套分组）：v2 ADV-02
- 动态表格行上下拖拽排序
- minRows / maxRows 配置
- 动态表格列条件显隐
- 移动端动态表格卡片化布局（Phase 14）
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DESIGN-02 | 用户可创建分组区块，每组有可编辑标题栏，组内独立栅格布局 | Schema id gap fix + DesignerRowEditor extraction + FieldPalette structure group + PropertyEditor group branch |
| DESIGN-03 | 用户可添加动态行表格字段，定义列结构（列名/列类型/列宽） | Schema id gap fix + FieldPalette structure group + PropertyEditor column-list editor |
| RENDER-03 | 动态行表格在填写页支持增删行操作，每行按列结构渲染输入控件 | DynamicTableFill component + native HTML table + formData array binding |
</phase_requirements>

## Critical Finding: Schema ID Gap

**Confidence: HIGH** (verified by reading source code)

Both `SchemaGroup` and `SchemaDynamicTable` in `frontend/src/types/schema.ts` lack `id` fields:

```typescript
// CURRENT — missing id
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
```

**Why this blocks Phase 12:**
1. **Selection state** (D-05): `store.selectedFieldId` must identify groups and tables. Without `id`, no selection mechanism.
2. **Data keying** (D-15): `submission.data[tableId]` requires a stable identifier on each dynamic table.
3. **Item-level drag sorting** (D-04): SortableJS needs a unique key per item for stable v-for rendering.

**Required fix:**
```typescript
export interface SchemaGroup {
  type: 'group';
  id: string;        // ADD
  title: string;
  rows: SchemaRow[];
}

export interface SchemaDynamicTable {
  type: 'dynamic-table';
  id: string;        // ADD
  label: string;
  colSpan: number;
  columns: Array<{ key: string; label: string; type: FieldType; width?: number }>;
}
```

Backend `schema.validation.ts` must also add `id: t.String()` to both TypeBox schemas.

The Pinia store's `selectedFieldId` should be renamed/generalized to `selectedItemId` and the `selectedField` getter extended to find groups and dynamic tables too.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vue | 3.5.32 | Framework | Already in project |
| quasar | 2.19.3 | UI components | Already in project |
| pinia | 2.3.1 | State management | Already in project |
| vue-draggable-plus | 0.6.1 | Drag-and-drop (SortableJS wrapper) | Already in project, latest version |

### Supporting (no new dependencies)
No new packages needed. All functionality is achievable with the existing stack:
- `crypto.randomUUID()` for ID generation (already used in `FieldPalette.vue`)
- Native HTML `<table>` for dynamic table rendering (D-16, no QTable)
- Quasar `q-input`, `q-select`, `q-slider`, `q-btn` for PropertyEditor column editing

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native HTML table | QTable | D-16 explicitly requires native table for print/PDF compatibility |
| Manual column editor | Separate dialog | Inline list in PropertyEditor is simpler per D-09 |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Component Structure
```
frontend/src/components/
├── designer/
│   ├── DesignerCanvas.vue          # MODIFY: render groups/tables, delegate row editing
│   ├── DesignerRowEditor.vue       # NEW: extracted reusable row editing component
│   ├── FieldPalette.vue            # MODIFY: add "Structure" group
│   ├── PropertyEditor.vue          # MODIFY: type-based dispatch for group/table
│   ├── fieldRegistry.ts            # MODIFY: add structure item definitions
│   └── composables/
│       └── gridUtils.ts            # EXISTING: no changes needed
├── renderer/
│   ├── GridFormRenderer.vue        # MODIFY: replace dynamic-table stub
│   ├── GroupRenderer.vue           # EXISTING: no changes needed (fill/print already works)
│   ├── DynamicTableFill.vue        # NEW: fill-mode add/remove rows
│   ├── DynamicTablePrint.vue       # NEW: print-mode native HTML table
│   └── FieldRenderer.vue           # EXISTING: reused inside DynamicTableFill cells
```

### Pattern 1: Extracting DesignerRowEditor (D-02)

**What:** Extract the row-level editing logic from DesignerCanvas into a standalone component that both the top-level canvas and group containers can use.

**Current state:** DesignerCanvas.vue lines 16-55 contain the VueDraggable field grid, field selection, resize handles, and delete buttons — all tightly coupled to the canvas.

**Extraction target:** A `DesignerRowEditor` component that accepts:
```typescript
interface Props {
  rows: SchemaRow[]
  groupName?: string  // SortableJS group name, default 'fields'
}
interface Emits {
  'update:rows': [rows: SchemaRow[]]
  'select-field': [fieldId: string]
}
```

**Key insight:** The `group: { name: 'fields', pull: true, put: true }` config must be identical across all VueDraggable instances (top-level rows AND group-internal rows) to enable cross-boundary dragging per D-03. This is how SortableJS enables inter-container drag — all containers sharing the same group name form a single drag ecosystem.

### Pattern 2: Item-Level Drag Sorting (D-04)

**What:** Groups and dynamic tables participate in top-level item ordering alongside rows.

**Current state:** DesignerCanvas uses `useDraggable(rowsRef, rowList, ...)` which only handles `SchemaRow` items. The `rowList` computed setter rebuilds items as `[...newRows, ...nonRows]`, which loses group/table positions.

**Required change:** Replace the row-only drag with a full `items[]` drag. Use `VueDraggable` on the entire items list with a shared handle class. Each item type (row, group, dynamic-table) renders its own drag handle and content.

```typescript
// Top-level items drag
const itemsList = computed({
  get: () => schema.value.items,
  set: (newItems: SchemaItem[]) => {
    ensureSchema().items = newItems;
  },
});
```

### Pattern 3: Selection State Generalization

**What:** Extend the Pinia store to support selecting groups and dynamic tables, not just fields.

**Current:** `selectedFieldId: string | null` + `selectedField` getter that searches `flattenFields()`.

**Required:** Keep `selectedFieldId` name for backward compatibility but extend the getter:
```typescript
// In template store
getters: {
  selectedField(s): SchemaField | null { /* existing */ },
  selectedItem(s): SchemaItem | SchemaField | null {
    if (!s.current || !s.selectedFieldId) return null;
    // Check fields first
    const field = flattenFields(s.current.schema).find(f => f.id === s.selectedFieldId);
    if (field) return field;
    // Check groups and dynamic tables
    for (const item of s.current.schema.items) {
      if ((item.type === 'group' || item.type === 'dynamic-table') && item.id === s.selectedFieldId) {
        return item;
      }
    }
    return null;
  },
},
```

### Pattern 4: Dynamic Table Fill Data Binding

**What:** The fill page must initialize and manage array data for each dynamic table.

**Current:** `PublicFillPage.vue` initializes `formData` by iterating `flattenFields()` — this skips dynamic tables entirely.

**Required extension in PublicFillPage.vue:**
```typescript
// After flattenFields initialization, also init dynamic table data
for (const item of schema.value.items) {
  if (item.type === 'dynamic-table') {
    // D-14: start with 1 empty row
    const emptyRow: Record<string, any> = {};
    for (const col of item.columns) {
      emptyRow[col.key] = col.type === 'checkbox' ? [] : '';
    }
    formData[item.id] = [emptyRow];
  }
}
```

### Anti-Patterns to Avoid
- **Nested SortableJS group names:** Do NOT use different group names for group-internal fields vs top-level fields. D-03 requires cross-boundary dragging, which only works with identical `group.name`.
- **QTable for dynamic tables:** D-16 explicitly requires native HTML `<table>` for print/PDF compatibility. QTable adds pagination, virtual scroll, and other overhead that breaks print layout.
- **Recursive DesignerCanvas:** Do NOT make DesignerCanvas recursive. Extract the row-editing piece into a separate component instead. DesignerCanvas has too much top-level logic (bottom drop zone, empty state, keyboard shortcuts) that shouldn't be duplicated.
- **Mutating formData directly in child components:** Use `v-model` / `emit('update:modelValue')` pattern consistently. The dynamic table component should emit the entire array on each change.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop between containers | Custom drag events | vue-draggable-plus with `group: { name: 'fields' }` | SortableJS handles all edge cases: touch, scroll, animation, cross-container |
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Already used in project, browser-native, zero dependencies |
| Column type selector | Custom dropdown | Quasar `q-select` with options array | Consistent with existing UI patterns |
| Flex column width | Custom CSS calc | CSS `flex: N` on `<td>` / `<col>` | Native flex ratio is exactly what D-11 specifies |

**Key insight:** The entire phase uses existing libraries. No new dependencies needed.

## Common Pitfalls

### Pitfall 1: SortableJS Event Bubbling in Nested Containers
**What goes wrong:** When a group contains a VueDraggable for its rows, and the top-level canvas also has a VueDraggable for items, drag events can bubble incorrectly — dropping a field inside a group may also trigger the parent's `onAdd`.
**Why it happens:** SortableJS uses DOM event propagation. Nested sortable containers both receive the same drag events.
**How to avoid:** Use `filter` option to exclude group/table containers from the top-level item drag. The top-level drag should only handle item-level reordering (via `.item-drag-handle`), not field-level operations.
**Warning signs:** Fields duplicating when dropped, or items jumping to wrong positions.

### Pitfall 2: Empty Group Row Cleanup
**What goes wrong:** When the last field is dragged out of a group's row, the empty row persists, leaving visual artifacts.
**Why it happens:** The `onRemove` callback that cleans up empty rows in DesignerCanvas needs to also work inside groups.
**How to avoid:** The extracted DesignerRowEditor must include the same empty-row cleanup logic: when a row's fields array becomes empty after a remove event, splice that row from the parent's rows array.
**Warning signs:** Empty dashed-border rows accumulating inside groups.

### Pitfall 3: Dynamic Table Column Key Stability
**What goes wrong:** If column keys change (e.g., user renames a column), existing submission data becomes orphaned.
**Why it happens:** Column `key` is used as the property name in `submission.data[tableId][rowIdx]`.
**How to avoid:** Generate column keys as UUIDs (like field IDs) and never change them. The `label` is the user-facing name; the `key` is the stable data identifier. Column keys should be auto-generated on column creation and immutable.
**Warning signs:** Submitted data showing empty values for columns that were renamed.

### Pitfall 4: formData Reactivity with Array Mutations
**What goes wrong:** Vue 3's reactivity doesn't track array index assignments like `formData[tableId][0].colKey = 'value'` when the array was initialized with `reactive()`.
**Why it happens:** `reactive()` wraps the object but nested array element property changes may not trigger re-renders if the array structure changes.
**How to avoid:** Use `ref()` for the table rows array inside DynamicTableFill, or ensure all mutations go through proper reactive methods (splice, push). When emitting updates, always emit a new array reference: `emit('update:modelValue', [...rows])`.
**Warning signs:** Input values not reflecting in submitted data, or UI not updating after add/remove row.

### Pitfall 5: Print Mode Table Column Width
**What goes wrong:** Flex ratios on `<td>` elements don't work in print mode because tables use `table-layout` not flexbox.
**Why it happens:** HTML tables have their own layout algorithm that ignores flex properties.
**How to avoid:** Use `<colgroup>` with `<col>` elements and percentage widths derived from flex ratios: `width = (ratio / totalRatio) * 100%`. With `table-layout: fixed`, this gives predictable column widths.
**Warning signs:** Columns all rendering at equal width in print preview despite different flex ratios.

### Pitfall 6: DesignerCanvas Row Ordering After Extraction
**What goes wrong:** After extracting row editing, the top-level item drag (D-04) may conflict with the row-internal field drag because both use VueDraggable.
**Why it happens:** Two nested VueDraggable instances with overlapping DOM areas.
**How to avoid:** Use distinct `handle` selectors: `.item-drag-handle` for top-level item reordering, `.row-drag-handle` for row reordering within a group, `.field-drag-handle` for field reordering within a row. Each level has its own handle class.
**Warning signs:** Dragging a field accidentally moves the entire group, or vice versa.

## Code Examples

### FieldPalette Structure Group (D-01)

```typescript
// In fieldRegistry.ts - add structure items
export const structureItems = [
  {
    type: 'group' as const,
    label: '分组',
    icon: 'folder_open',  // Material icon
    create: () => ({
      type: 'group' as const,
      id: crypto.randomUUID(),
      title: '分组标题',
      rows: [],
    }),
  },
  {
    type: 'dynamic-table' as const,
    label: '动态表格',
    icon: 'table_chart',  // Material icon
    create: () => ({
      type: 'dynamic-table' as const,
      id: crypto.randomUUID(),
      label: '动态表格',
      colSpan: 12,
      columns: [
        { key: crypto.randomUUID(), label: '列 1', type: 'text' as const },
        { key: crypto.randomUUID(), label: '列 2', type: 'text' as const },
      ],
    }),
  },
];
```

### FieldPalette Clone Handler for Structure Items

```typescript
// In FieldPalette.vue - the structure group uses pull: 'clone' like field groups
// but the clone function must create a fresh item (new id) each time
const structureClone = (original: any) => {
  return structureItems.find(s => s.type === original.type)?.create() ?? original;
};
```

### PropertyEditor Type Dispatch (D-05, D-09)

```typescript
// In PropertyEditor.vue - detect selected item type
const selectedItem = computed(() => store.selectedItem);
const itemType = computed(() => {
  const item = selectedItem.value;
  if (!item) return null;
  if ('type' in item && item.type === 'group') return 'group';
  if ('type' in item && item.type === 'dynamic-table') return 'dynamic-table';
  return 'field';  // existing SchemaField
});
```

### DynamicTableFill Row Management (D-13, D-14)

```typescript
// DynamicTableFill.vue - core row management
const rows = ref<Record<string, any>[]>([]);

function createEmptyRow(): Record<string, any> {
  const row: Record<string, any> = {};
  for (const col of props.columns) {
    row[col.key] = col.type === 'checkbox' ? [] : '';
  }
  return row;
}

// D-14: init with 1 empty row
onMounted(() => {
  if (props.modelValue?.length) {
    rows.value = [...props.modelValue];
  } else {
    rows.value = [createEmptyRow()];
  }
});

function addRow() {
  rows.value.push(createEmptyRow());
  emit('update:modelValue', [...rows.value]);
}

function removeRow(index: number) {
  rows.value.splice(index, 1);
  if (rows.value.length === 0) rows.value.push(createEmptyRow());
  emit('update:modelValue', [...rows.value]);
}
```

### DynamicTablePrint Native Table (D-16)

```html
<!-- DynamicTablePrint.vue -->
<table style="width: 100%; border-collapse: collapse; table-layout: fixed">
  <colgroup>
    <col v-for="col in columns" :key="col.key"
         :style="{ width: colWidth(col) }" />
  </colgroup>
  <thead>
    <tr>
      <th v-for="col in columns" :key="col.key"
          style="border: 1px solid #000; padding: 6px 8px; text-align: left">
        {{ col.label }}
      </th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="(row, ri) in rows" :key="ri">
      <td v-for="col in columns" :key="col.key"
          style="border: 1px solid #000; padding: 6px 8px">
        {{ formatCellValue(row[col.key], col.type) }}
      </td>
    </tr>
  </tbody>
</table>
```

```typescript
// Column width from flex ratio
function colWidth(col: Column): string {
  const total = columns.reduce((sum, c) => sum + (c.width ?? 1), 0);
  return ((col.width ?? 1) / total * 100).toFixed(1) + '%';
}
```

### Cross-Boundary Drag Configuration (D-03)

```typescript
// ALL VueDraggable instances for field-level drag must use identical group config:
const FIELD_GROUP = { name: 'fields', pull: true, put: true };

// FieldPalette (source, clone mode):
const PALETTE_GROUP = { name: 'fields', pull: 'clone', put: false };

// DesignerRowEditor (both top-level and inside groups):
// Uses FIELD_GROUP - this is what enables cross-boundary dragging
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vue.draggable.next | vue-draggable-plus | 2023 | vue-draggable-plus is actively maintained, supports Vue 3 Composition API natively |
| QTable for all tables | Native HTML table for print | Ongoing | QTable is great for interactive data grids but breaks print layout |
| Monolithic canvas component | Extracted reusable row editor | This phase | Enables group containers without code duplication |

**Deprecated/outdated:**
- `vuedraggable` (Vue 2 version): Do not use. Project already uses `vue-draggable-plus`.
- `vue.draggable.next`: Unmaintained since 2022. `vue-draggable-plus` is the successor.

## Open Questions

1. **Column options for radio/checkbox types**
   - What we know: D-10 includes radio and checkbox as column types. These types need options (choices).
   - What is unclear: How should options be defined per column? Inline in the column editor? A sub-list within each column entry?
   - Recommendation: Add an `options?: string[]` field to the column definition. In PropertyEditor, show a comma-separated text input for options when column type is radio or checkbox. Keep it simple.

2. **Dynamic table validation on fill page**
   - What we know: Regular fields use QForm validation + custom `validateFields()`.
   - What is unclear: Should dynamic table cells have required validation? The CONTEXT.md does not specify.
   - Recommendation: No cell-level validation for v1. The table itself is optional (user can leave it empty). If the user adds rows, cells can be blank. This avoids complexity.

3. **Group deletion with fields inside**
   - What we know: D-08 says delete without confirmation.
   - What is unclear: What happens to fields inside the group? Are they deleted too, or moved to top level?
   - Recommendation: Delete the group AND all its contents. This is the simplest behavior and matches user expectation (the group is a container; deleting the container deletes contents).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (via @quasar/app-vite) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DESIGN-02 | Group creation with id, title, empty rows | unit | `cd frontend && npx vitest run src/types/__tests__/schema.test.ts -x` | Partial (schema tests exist, need group id tests) |
| DESIGN-03 | Dynamic table creation with columns, default values | unit | `cd frontend && npx vitest run src/types/__tests__/schema.test.ts -x` | Partial (type tests exist, need creation tests) |
| RENDER-03 | Dynamic table add/remove rows, data format | unit | `cd frontend && npx vitest run src/components/renderer/__tests__/DynamicTableFill.test.ts -x` | No |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before verify-work

### Wave 0 Gaps
- [ ] `frontend/src/types/__tests__/schema.test.ts` - extend with group/table id generation tests
- [ ] `frontend/src/components/renderer/__tests__/DynamicTableFill.test.ts` - covers RENDER-03 row add/remove/data format

## Sources

### Primary (HIGH confidence)
- Project source code - `frontend/src/types/schema.ts`, `DesignerCanvas.vue`, `FieldPalette.vue`, `PropertyEditor.vue`, `template.ts` store, `schema.validation.ts`
- SortableJS group options - https://github.com/SortableJS/Sortable (group.name, pull, put configuration)
- vue-draggable-plus nesting demo - https://vue-draggable-plus.pages.dev/en/demo/nested

### Secondary (MEDIUM confidence)
- SortableJS nested container pitfalls - https://github.com/SortableJS/Sortable/issues/2415 (drop zone detection between nested nodes)
- SortableJS event bubbling - https://github.com/SortableJS/Sortable/issues/2316 (preventing group-inside-group)
- Quasar QTable inline editing patterns - https://github.com/quasarframework/quasar/issues/17051

### Tertiary (LOW confidence)
- None - all findings verified against source code or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in use, no new dependencies
- Architecture: HIGH - patterns derived from reading existing codebase, extraction approach is straightforward
- Pitfalls: HIGH - SortableJS nested container issues are well-documented in GitHub issues
- Schema gap: HIGH - verified by reading source code directly

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable - no fast-moving dependencies)
