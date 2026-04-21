# Phase 11: Designer Grid Editing - Research

**Researched:** 2026-04-21
**Domain:** Vue 3 WYSIWYG grid form builder — nested drag-drop + CSS Grid resize
**Confidence:** HIGH

## Summary

Phase 11 rewrites DesignerCanvas from a flat field list into a 12-column CSS Grid WYSIWYG editor. The core challenge is two-level nested drag-drop (row reorder + intra-row field reorder/cross-row move) combined with pointer-based resize handles that snap to grid columns.

The existing stack (vue-draggable-plus 0.6.1 + CSS Grid + Pinia) is sufficient. No new dependencies are needed. The key architectural insight is: use separate SortableJS instances for row-level drag (parent container) and field-level drag (each row container), sharing the same group name for cross-row field movement. Resize handles should be hand-rolled using pointer events + column-width calculation, not a library — the use case (horizontal-only, 1-12 integer snap) is too simple for gridstack.js or vue-draggable-resizable.

**Primary recommendation:** Rewrite DesignerCanvas as a two-layer architecture: (1) GridFormRenderer-based rendering layer with CSS Grid rows, (2) overlay interaction layer with drag handles, selection frames, resize handles, and drop zone indicators. Use `useDraggable` from vue-draggable-plus for both row-level and field-level drag, and a custom `useColResize` composable for pointer-based resize with column snapping.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Canvas = GridFormRenderer base + overlay interaction layer (drag handles, selection frames, delete buttons, resize handles)
- **D-02:** Dashed placeholder zones for remaining row space + empty rows
- **D-03:** Field cards show disabled control preview (FieldRenderer mode='designer') + drag handle + delete button
- **D-04:** Selected field: blue border + 4-corner resize handles for width
- **D-05:** Smart drop: remaining row space = insert inline; between rows = new row
- **D-06:** Row reorder via left drag handle, all fields follow
- **D-07:** Cross-row field drag: auto-insert target row, auto-delete empty source row
- **D-08:** colSpan overflow compression: cap to remaining space (min 1), reject if 0
- **D-09:** Dual-channel colSpan: PropertyEditor slider + canvas resize handle (1-col snap)
- **D-10:** Resize handle snaps to integer columns only
- **D-11:** Row management: left drag handle + hover delete button; auto-create row on drop
- **D-12:** Empty row auto-delete after last field removed/dragged out
- **D-13:** Delete field without confirmation dialog

### Claude's Discretion
None — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)
None.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DESIGN-01 | Designer canvas supports 12-col grid, fields draggable to row/col positions, adjustable colSpan (1-12) | Nested SortableJS architecture + useColResize composable + CSS Grid layout |
| DESIGN-04 | Designer real-time preview renders grid layout, WYSIWYG | GridFormRenderer reuse as canvas base layer + FieldRenderer mode='designer' |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vue-draggable-plus | 0.6.1 | Nested drag-drop (row reorder + field reorder/cross-row) | Already in project; wraps SortableJS; supports nested groups, clone mode, useDraggable composable |
| Vue 3 | ^3.5.12 | Reactive framework | Project standard |
| Quasar | ^2.17.0 | UI components (QSlider, QBtn, QIcon) | Project standard |
| Pinia | ^2.2.4 | State management (template store, selectedFieldId) | Project standard |
| CSS Grid | native | 12-column layout (`repeat(12, 1fr)`) | Already implemented in GridFormRenderer.vue |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SortableJS | 1.15.7 (transitive via vue-draggable-plus) | Underlying drag engine | Accessed through vue-draggable-plus API only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled useColResize | gridstack.js / grid-layout-plus | Overkill — gridstack uses absolute positioning (not CSS Grid), adds 50KB+ for a simple 1-12 integer snap. Our use case is horizontal-only resize with known column count. |
| Hand-rolled useColResize | vue-draggable-resizable | Designed for free-form 2D resize with pixel precision. Our case is 1D (width only) with integer column snap. Adding a library for this is unnecessary. |
| vue-draggable-plus nested | Separate SortableJS instances | vue-draggable-plus already wraps SortableJS and handles Vue reactivity. No benefit to going lower-level. |

**No new packages to install.** All dependencies are already in package.json.

## Architecture Patterns

### Recommended Component Structure
```
frontend/src/components/designer/
  DesignerCanvas.vue          # REWRITE: two-layer grid editor (main orchestrator)
  composables/
    useRowDrag.ts             # Row-level SortableJS (reorder rows)
    useFieldDrag.ts           # Field-level SortableJS per row (reorder/cross-row)
    useColResize.ts           # Pointer-based resize handle with column snap
    useDropZone.ts            # Smart drop logic (remaining space vs new row)
  DesignerRow.vue             # Single grid row: fields + placeholder + row controls
  DesignerFieldCard.vue       # Field wrapper: drag handle + FieldRenderer + delete + resize handles
```

### Pattern 1: Two-Level Nested SortableJS Architecture
**What:** Separate SortableJS instances for row-level and field-level drag, connected via shared group name.
**When to use:** Any form builder with row containers holding draggable fields.

**Row-level drag (DesignerCanvas):**
- `useDraggable` on the rows container
- `group: { name: 'rows', pull: false, put: false }` — rows only reorder among themselves
- `handle: '.row-drag-handle'` — only the left grip triggers row drag
- `animation: 150`

**Field-level drag (each DesignerRow):**
- `useDraggable` on each row's field container
- `group: { name: 'fields', pull: true, put: true }` — fields can move across rows
- `handle: '.field-drag-handle'` — field grip triggers field drag
- `animation: 150`
- `emptyInsertThreshold: 20` — allows dropping into empty rows

**Palette-to-canvas (FieldPalette, already implemented):**
- `group: { name: 'fields', pull: 'clone', put: false }` — clone fields into any row
- `clone: cloneField` — generates new UUID + default colSpan

**Key insight:** The palette and all row field containers share group name `'fields'`. Row containers share group name `'rows'`. This separation prevents fields from being treated as rows and vice versa.

### Pattern 2: Smart Drop Zone Detection (D-05)
**What:** Determine whether a dropped field goes into an existing row's remaining space or creates a new row.
**Implementation:**

```typescript
// In DesignerCanvas — handle drops that land on the "between rows" zone
// or the "bottom empty zone" by creating a new row
function handleFieldAdd(rowIndex: number, field: SchemaField) {
  const schema = ensureSchema();
  const row = schema.items[rowIndex] as SchemaRow;
  const usedCols = row.fields.reduce((sum, f) => sum + f.colSpan, 0);
  const remaining = 12 - usedCols;

  if (remaining <= 0) {
    // Row full — reject (onMove should have prevented this)
    return;
  }

  // Compress colSpan if needed (D-08)
  if (field.colSpan > remaining) {
    field.colSpan = remaining;
  }

  row.fields.push(field);
}

function createNewRowWithField(insertIndex: number, field: SchemaField) {
  const schema = ensureSchema();
  const newRow: SchemaRow = { type: 'row', fields: [field] };
  schema.items.splice(insertIndex, 0, newRow);
}
```

### Pattern 3: Pointer-Based Column Resize (D-09, D-10)
**What:** Custom composable for drag-to-resize field width with 1-column snapping.
**Implementation approach:**

```typescript
// useColResize.ts
import { ref, type Ref } from 'vue';
import type { SchemaField } from 'src/types/schema';

interface UseColResizeOptions {
  field: Ref<SchemaField>;
  rowEl: Ref<HTMLElement | null>;
  maxColSpan: Ref<number>; // remaining + current colSpan
}

export function useColResize({ field, rowEl, maxColSpan }: UseColResizeOptions) {
  const isResizing = ref(false);

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isResizing.value = true;

    const startX = e.clientX;
    const startColSpan = field.value.colSpan;
    const colWidth = rowEl.value!.clientWidth / 12;

    function onPointerMove(ev: PointerEvent) {
      const deltaX = ev.clientX - startX;
      const deltaCols = Math.round(deltaX / colWidth);
      const newSpan = Math.max(1, Math.min(maxColSpan.value, startColSpan + deltaCols));
      field.value.colSpan = newSpan;
    }

    function onPointerUp() {
      isResizing.value = false;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  return { isResizing, onPointerDown };
}
```

**Column width calculation:** `rowEl.clientWidth / 12` gives pixel width per column. `Math.round(deltaX / colWidth)` snaps to nearest integer column.

### Pattern 4: Dual-Channel colSpan Sync (D-09)
**What:** PropertyEditor slider and canvas resize handle both modify `field.colSpan` without infinite loops.
**Why it works naturally:** Both channels write to the same Pinia store field (`store.selectedField.colSpan`). Vue reactivity handles the sync:
- PropertyEditor QSlider: `v-model="field.colSpan"` where `field = computed(() => store.selectedField)`
- Canvas resize handle: directly mutates `field.colSpan` via the same reactive reference
- No watchers needed — both read/write the same reactive property on the SchemaField object

**The only constraint:** The resize handle must clamp to `maxColSpan` (remaining + current), while the PropertyEditor slider currently allows 1-12 without row context. The slider's `:max` should be updated to reflect the actual maximum for the selected field's row.

### Pattern 5: Empty Row Auto-Cleanup (D-12)
**What:** Remove rows from schema when their last field is removed or dragged out.
**Implementation:**

```typescript
// In onRemove callback of field-level SortableJS (fires when field leaves a row)
function cleanupEmptyRows() {
  const schema = ensureSchema();
  for (let i = schema.items.length - 1; i >= 0; i--) {
    const item = schema.items[i];
    if (item.type === 'row' && item.fields.length === 0) {
      schema.items.splice(i, 1);
    }
  }
}
```

**Trigger points:** After `onRemove` (field dragged to another row), after `removeField()` (delete button clicked).

### Anti-Patterns to Avoid
- **Wrapping GridFormRenderer directly:** Don't try to make GridFormRenderer interactive. Instead, replicate its CSS Grid structure in DesignerCanvas and add interaction layers. GridFormRenderer is for fill/print modes.
- **Single SortableJS for both rows and fields:** This causes SortableJS to confuse row-level and field-level drag targets. Use separate group names.
- **Using `watch` for dual-channel sync:** Both the slider and resize handle should mutate the same reactive object directly. Adding watchers creates circular update risk.
- **Absolute positioning for resize:** CSS Grid already handles layout. Resize handles only need to change `colSpan` (an integer), not pixel positions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-drop between containers | Custom HTML5 DnD API wrapper | vue-draggable-plus `useDraggable` with group config | SortableJS handles ghost elements, animation, touch support, cross-container moves. HTML5 DnD API is notoriously buggy across browsers. |
| Clone from palette | Manual DOM cloning + event handling | vue-draggable-plus `pull: 'clone'` + `clone` function | Already implemented in FieldPalette.vue. SortableJS clone mode handles the DOM lifecycle correctly. |
| Field type preview rendering | Inline HTML per field type | FieldRenderer with `mode='designer'` | Already implemented — renders disabled Quasar controls for all 7 field types. |
| Schema type definitions | Ad-hoc object shapes | SchemaV2/SchemaRow/SchemaField from `types/schema.ts` | Already defined with TypeScript interfaces. |
| 12-column grid layout | Flexbox percentage widths | CSS Grid `repeat(12, 1fr)` + `grid-column: span N` | Already proven in GridFormRenderer.vue. CSS Grid handles column alignment, gap, and overflow correctly. |

**Key insight:** The resize handle is the only truly new primitive needed. Everything else (drag-drop, grid layout, field rendering, schema types, store) already exists and should be reused.

## Common Pitfalls

### Pitfall 1: SortableJS Empty Container Drop Failure
**What goes wrong:** Fields cannot be dropped into an empty row because SortableJS requires at least one child element to detect the drop zone.
**Why it happens:** SortableJS uses child element positions to calculate drop targets. An empty container has no children to reference.
**How to avoid:** Always render a placeholder element inside empty rows (the dashed "drop here" zone per D-02). Set `emptyInsertThreshold: 20` on field-level SortableJS. Ensure the placeholder has `min-height: 48px` so the drop zone is large enough.
**Warning signs:** Dragging a field over an empty row shows no insertion indicator.

### Pitfall 2: CSS Grid `span N` Overflow Creates Implicit Columns
**What goes wrong:** If `grid-column: span 8` is applied to a field in a row where only 6 columns remain, CSS Grid creates implicit columns beyond the 12-column template, breaking the layout.
**Why it happens:** Per W3C spec, CSS Grid generates implicit tracks to satisfy placement rather than wrapping or clamping.
**How to avoid:** Always clamp `colSpan` in JavaScript before it reaches CSS. The `onMove` callback should reject drops that would exceed 12 columns. The resize handle must enforce `max = remaining + current`. The PropertyEditor slider `:max` must reflect the row context.
**Warning signs:** Fields visually extend beyond the grid boundary or the row becomes wider than expected.

### Pitfall 3: SortableJS Ghost Element Clipping in Nested Containers
**What goes wrong:** The drag ghost (visual feedback element) gets clipped by `overflow: hidden` on parent containers.
**Why it happens:** SortableJS appends the ghost to the sortable container by default. If any ancestor has `overflow: hidden/auto`, the ghost is clipped.
**How to avoid:** Set `fallbackOnBody: true` on field-level SortableJS instances. This appends the ghost to `<body>` instead. Note: this can cause slight positioning offsets — test and adjust with `fallbackOffset` if needed.
**Warning signs:** Ghost element disappears or is partially visible during drag.

### Pitfall 4: Vue Reactivity Loss with SortableJS DOM Manipulation
**What goes wrong:** SortableJS directly manipulates the DOM (moves elements between containers), which can desync from Vue's virtual DOM.
**Why it happens:** SortableJS operates on real DOM nodes, not Vue's reactive data. If the data model isn't updated to match, Vue's next render cycle will fight SortableJS's DOM changes.
**How to avoid:** Use vue-draggable-plus's `v-model` or `useDraggable` which handles the data-DOM sync. Never manually move DOM elements — let SortableJS + vue-draggable-plus handle it through the reactive data model. Use `onAdd`/`onRemove`/`onUpdate` callbacks to update the Pinia store, not direct DOM manipulation.
**Warning signs:** Fields appear duplicated, disappear, or snap back to original position after drag.

### Pitfall 5: Nested SortableJS Swap Threshold Conflicts
**What goes wrong:** Dragging a field near the boundary between two rows causes rapid flickering as SortableJS alternates between inserting in the current row and the adjacent row.
**Why it happens:** Default `swapThreshold: 1` means the entire element is a swap zone. In nested containers, the row container and field container swap zones overlap.
**How to avoid:** Set `swapThreshold: 0.65` on field-level SortableJS. This creates a dead zone at the edges of each field, reducing accidental swaps. For row-level drag, keep `swapThreshold: 1` since rows don't have nested children competing for the same space.
**Warning signs:** Fields flicker between rows during drag, or the insertion indicator jumps rapidly.

### Pitfall 6: Resize Handle Conflicts with Drag Handle
**What goes wrong:** Clicking/dragging a resize handle accidentally triggers the field drag instead.
**Why it happens:** The resize handle is inside the draggable field card. SortableJS's `handle` option restricts drag initiation to a specific selector, but pointer events on resize handles can still bubble.
**How to avoid:** Use `e.stopPropagation()` on resize handle `pointerdown`. Ensure the SortableJS `handle` selector (`.field-drag-handle`) does NOT match the resize handle elements. Place resize handles outside the drag handle's DOM subtree.
**Warning signs:** Attempting to resize a field starts dragging it instead.

### Pitfall 7: PropertyEditor Slider Max Not Reflecting Row Context
**What goes wrong:** User sets colSpan to 12 via slider, but the field is in a row with other fields, causing overflow.
**Why it happens:** Current PropertyEditor slider has static `:max="12"`. It doesn't know about sibling fields in the same row.
**How to avoid:** Compute `maxColSpan` for the selected field: `12 - (row total colSpan) + field.colSpan`. Pass this as `:max` to the QSlider. This requires the PropertyEditor to access the row context of the selected field.
**Warning signs:** Setting slider to max causes layout overflow or fields wrapping unexpectedly.

## Code Examples

### Example 1: DesignerRow Component Structure
```vue
<!-- DesignerRow.vue — single grid row with field containers + placeholder -->
<template>
  <div class="designer-row" :class="{ 'is-empty': fields.length === 0 }">
    <!-- Row drag handle (D-06) -->
    <div class="row-drag-handle">
      <q-icon name="drag_indicator" size="16px" color="grey-5" />
    </div>

    <!-- Fields container (SortableJS target) -->
    <div ref="fieldsRef" class="row-fields grid-row">
      <DesignerFieldCard
        v-for="field in fields"
        :key="field.id"
        :field="field"
        :style="{ gridColumn: `span ${field.colSpan}` }"
        @select="$emit('select-field', field.id)"
        @delete="$emit('delete-field', field.id)"
      />

      <!-- Remaining space placeholder (D-02) -->
      <div
        v-if="remainingCols > 0"
        class="drop-placeholder"
        :style="{ gridColumn: `span ${remainingCols}` }"
      >
        <span>拖入字段</span>
      </div>
    </div>

    <!-- Row delete button (D-11, hover only) -->
    <q-btn
      flat dense round icon="delete_outline" size="xs"
      class="row-delete-btn"
      @click="$emit('delete-row')"
    />
  </div>
</template>
```

### Example 2: Field-Level SortableJS Setup
```typescript
// Inside DesignerRow.vue <script setup>
import { ref, computed } from 'vue';
import { useDraggable } from 'vue-draggable-plus';
import type { SchemaField } from 'src/types/schema';

const props = defineProps<{
  fields: SchemaField[];
  rowIndex: number;
}>();

const emit = defineEmits<{
  'update:fields': [fields: SchemaField[]];
  'select-field': [id: string];
  'delete-field': [id: string];
  'delete-row': [];
  'cleanup-empty': [];
}>();

const fieldsRef = ref<HTMLElement | null>(null);

const fieldList = computed({
  get: () => props.fields,
  set: (val) => emit('update:fields', val),
});

const remainingCols = computed(() => {
  return 12 - props.fields.reduce((sum, f) => sum + f.colSpan, 0);
});

useDraggable(fieldsRef, fieldList, {
  group: { name: 'fields', pull: true, put: true },
  handle: '.field-drag-handle',
  animation: 150,
  emptyInsertThreshold: 20,
  fallbackOnBody: true,
  swapThreshold: 0.65,
  onAdd: (evt: any) => {
    // Compress colSpan if overflow (D-08)
    const field = evt.data as SchemaField;
    if (field && field.colSpan > remainingCols.value + field.colSpan) {
      // After add, remaining already accounts for the new field
      // Clamp to available space
      const available = 12 - props.fields
        .filter(f => f.id !== field.id)
        .reduce((sum, f) => sum + f.colSpan, 0);
      field.colSpan = Math.max(1, Math.min(field.colSpan, available));
    }
  },
  onRemove: () => {
    // Trigger empty row cleanup (D-12)
    if (props.fields.length === 0) {
      emit('cleanup-empty');
    }
  },
  onMove: (evt: any) => {
    // Reject if target row has no remaining space (D-08)
    const targetRow = evt.to;
    // Calculate remaining cols in target row
    // Return false to reject the move
    return true; // detailed implementation in useDropZone
  },
});
```

### Example 3: DesignerFieldCard with Resize Handles
```vue
<!-- DesignerFieldCard.vue -->
<template>
  <div
    class="designer-field-card"
    :class="{ 'is-selected': isSelected, 'is-resizing': isResizing }"
    @click.stop="$emit('select')"
  >
    <!-- Drag handle (D-03) -->
    <div class="field-drag-handle">
      <q-icon name="drag_indicator" size="14px" color="grey-5" />
    </div>

    <!-- Field preview (D-03) -->
    <div class="field-preview">
      <FieldRenderer :field="field" mode="designer" />
    </div>

    <!-- Delete button (D-13) -->
    <q-btn
      flat dense round icon="close" size="xs"
      class="field-delete-btn"
      @click.stop="$emit('delete')"
    />

    <!-- Resize handles (D-04, only when selected) -->
    <template v-if="isSelected">
      <div class="resize-handle resize-handle-right" @pointerdown="onPointerDown" />
    </template>
  </div>
</template>
```

### Example 4: Row-Level Drag Setup
```typescript
// Inside DesignerCanvas.vue — row reorder
const rowsRef = ref<HTMLElement | null>(null);

const rowList = computed({
  get: () => {
    const s = ensureSchema();
    return s.items.filter(item => item.type === 'row') as SchemaRow[];
  },
  set: (newRows: SchemaRow[]) => {
    const s = ensureSchema();
    // Replace all row items while preserving groups/tables
    const nonRows = s.items.filter(item => item.type !== 'row');
    s.items = [...newRows, ...nonRows]; // simplified — actual impl preserves order
  },
});

useDraggable(rowsRef, rowList, {
  group: { name: 'rows', pull: false, put: false },
  handle: '.row-drag-handle',
  animation: 150,
  ghostClass: 'row-ghost',
});
```

### Example 5: CSS Grid Row Styles (reuse from GridFormRenderer)
```css
/* Shared grid row styles */
.grid-row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 8px 16px;
}

/* Designer-specific overlay styles */
.designer-row {
  display: flex;
  align-items: stretch;
  margin-bottom: 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: border-color 150ms;
}
.designer-row:hover {
  border-color: var(--oa-border);
}
.designer-row .row-fields {
  flex: 1;
}

/* Drop placeholder (D-02) */
.drop-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border: 2px dashed var(--oa-border);
  border-radius: 6px;
  color: var(--oa-text-tertiary);
  font-size: 13px;
}

/* Selected field (D-04) */
.designer-field-card.is-selected {
  border-color: var(--q-primary);
  box-shadow: 0 0 0 2px rgba(var(--q-primary-rgb, 25, 118, 210), 0.15);
}

/* Resize handle */
.resize-handle-right {
  position: absolute;
  right: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 10;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gridstack.js (absolute positioning) | CSS Grid native + pointer events for resize | 2023+ | CSS Grid is now the standard for grid-based form builders. gridstack.js is still used for dashboard widgets but is overkill for row-based form layouts. |
| Vue.Draggable (vue2) | vue-draggable-plus (vue2/3 universal) | 2023 | vue-draggable-plus is the maintained successor. Vue.Draggable is effectively unmaintained for Vue 3. |
| grid-layout-plus (x/y/w/h coordinates) | Row-based schema (SchemaRow with fields) | Project decision | Our schema uses row-based hierarchy, not coordinate-based. This simplifies the drag model to 1D within rows. |

**Deprecated/outdated:**
- `vuedraggable` (SortableJS/Vue.Draggable): Unmaintained for Vue 3. Use `vue-draggable-plus` instead.
- `grid-layout-plus` for this project: Was considered in STATE.md but the row-based schema makes it unnecessary. grid-layout-plus uses x/y/w/h coordinates which don't map to our SchemaRow model.

## Open Questions

1. **Placeholder element and SortableJS interaction**
   - What we know: The dashed placeholder (remaining space indicator) must be rendered inside the SortableJS container. SortableJS will try to sort it as a regular item.
   - What's unclear: Whether the placeholder should be a real SortableJS item (with `filter` option to prevent dragging) or rendered outside the sortable container.
   - Recommendation: Use SortableJS `filter: '.drop-placeholder'` option to exclude the placeholder from sorting. This keeps it inside the container for visual purposes but prevents SortableJS from treating it as a draggable item.

2. **Row-level drag with mixed schema items**
   - What we know: `schema.items` can contain `SchemaRow`, `SchemaGroup`, and `SchemaDynamicTable`. Phase 11 only handles rows.
   - What's unclear: How row-level drag interacts with groups/tables that may be added in Phase 12.
   - Recommendation: For Phase 11, only make `SchemaRow` items draggable. Use `filter` or `onMove` to prevent dragging groups/tables. Phase 12 will extend this.

3. **Resize handle visual feedback during drag**
   - What we know: D-04 specifies 4-corner resize handles. Only horizontal resize is needed (colSpan).
   - What's unclear: Whether to show all 4 corners (visual consistency) but only make left/right functional, or only show left/right handles.
   - Recommendation: Show right-side handle only (or right + left). 4-corner handles imply 2D resize which is misleading. A single right-edge handle is the clearest affordance for width adjustment.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 0.34.6 + happy-dom |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DESIGN-01a | Field drop creates row with correct colSpan | unit | `cd frontend && npx vitest run src/components/designer/__tests__/DesignerCanvas.test.ts -x` | Wave 0 |
| DESIGN-01b | colSpan overflow compression clamps to remaining space | unit | `cd frontend && npx vitest run src/components/designer/__tests__/colSpanLogic.test.ts -x` | Wave 0 |
| DESIGN-01c | Cross-row field drag updates source and target rows | unit | `cd frontend && npx vitest run src/components/designer/__tests__/DesignerCanvas.test.ts -x` | Wave 0 |
| DESIGN-01d | Empty row auto-deleted after last field removed | unit | `cd frontend && npx vitest run src/components/designer/__tests__/DesignerCanvas.test.ts -x` | Wave 0 |
| DESIGN-01e | Resize handle changes colSpan with column snap | unit | `cd frontend && npx vitest run src/components/designer/__tests__/useColResize.test.ts -x` | Wave 0 |
| DESIGN-04 | Canvas renders same grid layout as GridFormRenderer | manual-only | Visual comparison | N/A — WYSIWYG is visual |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/components/designer/__tests__/DesignerCanvas.test.ts` — covers DESIGN-01a/c/d
- [ ] `frontend/src/components/designer/__tests__/colSpanLogic.test.ts` — covers DESIGN-01b (pure function tests for overflow compression)
- [ ] `frontend/src/components/designer/__tests__/useColResize.test.ts` — covers DESIGN-01e (composable unit test)
- [ ] `frontend/src/components/designer/__tests__/` directory — needs creation

## Sources

### Primary (HIGH confidence)
- [vue-draggable-plus API docs](https://vue-draggable-plus.pages.dev/en/api) — group config, events, options
- [vue-draggable-plus nesting demo](https://vue-draggable-plus.pages.dev/en/demo/nested/) — nested container pattern
- [vue-draggable-plus clone demo](https://vue-draggable-plus.pages.dev/en/demo/clone) — clone mode configuration
- [SortableJS Swap Thresholds Wiki](https://github.com/SortableJS/Sortable/wiki/Swap-Thresholds-and-Direction) — swapThreshold, invertSwap behavior
- Existing codebase: GridFormRenderer.vue, FieldPalette.vue, DesignerCanvas.vue, PropertyEditor.vue, schema.ts, template.ts

### Secondary (MEDIUM confidence)
- [SortableJS Issue #1653](https://github.com/SortableJS/Sortable/issues/1653) — empty container drop behavior, verified with emptyInsertThreshold docs
- [SortableJS Issue #2415](https://github.com/SortableJS/Sortable/issues/2415) — nested tree insertion problems
- [SortableJS Issue #1707](https://github.com/SortableJS/Sortable/issues/1707) — forceFallback + animation + nested lists
- [W3C CSS Grid Level 1 Spec](https://www.w3.org/TR/css3-grid-layout) — implicit track generation when span exceeds explicit grid

### Tertiary (LOW confidence)
- General web search patterns for WYSIWYG form builder architecture — used for pattern validation, not specific claims

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, versions verified against npm registry
- Architecture: HIGH — two-level nested SortableJS is a well-documented pattern; CSS Grid resize with pointer events is straightforward
- Pitfalls: HIGH — all pitfalls sourced from SortableJS GitHub issues and official documentation
- Code examples: MEDIUM — examples are synthesized from API docs + existing codebase patterns, not copy-pasted from production code

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable — no fast-moving dependencies)
