<template>
  <div class="grid-canvas" @click.self="store.selectField(null)" @keydown="onKeydown" tabindex="0">
    <div ref="rowsRef" class="canvas-rows">
      <div
        v-for="(row, rowIdx) in rows"
        :key="rowIdx"
        class="grid-canvas-row"
        :aria-label="`第 ${rowIdx + 1} 行, ${row.fields.length} 个字段`"
      >
        <!-- Row drag handle (D-06) -->
        <div class="row-handle row-drag-handle" aria-label="拖拽排序">
          <q-icon name="drag_indicator" size="16px" color="grey-5" />
        </div>

        <!-- Fields grid container -->
        <VueDraggable
          :ref="(el: any) => setRowFieldsRef(rowIdx, el)"
          :model-value="row.fields"
          @update:model-value="(val: SchemaField[]) => updateRowFields(rowIdx, val)"
          :group="{ name: 'fields', pull: true, put: true }"
          handle=".field-drag-handle"
          :animation="150"
          :empty-insert-threshold="20"
          :fallback-on-body="true"
          :swap-threshold="0.65"
          filter=".row-remainder"
          item-key="id"
          class="row-fields-grid"
          @add="(evt: any) => onFieldAdd(rowIdx, evt)"
          @remove="() => onFieldRemove(rowIdx)"
        >
          <template #item="{ element: field }">
            <div
              class="grid-canvas-field"
              :class="{ 'is-selected': store.selectedFieldId === field.id }"
              :style="{ gridColumn: `span ${field.colSpan}` }"
              @click.stop="store.selectField(field.id)"
            >
              <div class="field-drag-handle" aria-label="拖拽排序">
                <q-icon name="drag_indicator" size="14px" color="grey-5" />
              </div>
              <div class="field-preview">
                <FieldRenderer :field="field" mode="designer" />
              </div>
              <q-btn flat dense round icon="close" size="xs" class="field-delete-btn"
                     @click.stop="removeField(field.id)" />
              <div v-if="store.selectedFieldId === field.id"
                   class="resize-handle resize-handle-right"
                   @pointerdown="startResize($event, field, rowIdx)" />
            </div>
          </template>

          <template #footer>
            <div v-if="remainingCols(row.fields) > 0"
                 class="row-remainder drop-placeholder"
                 :style="{ gridColumn: `span ${remainingCols(row.fields)}` }">
            </div>
          </template>
        </VueDraggable>

        <!-- Row delete button (D-11) -->
        <q-btn flat dense round icon="delete_outline" size="xs"
               class="row-delete-btn" @click="deleteRow(rowIdx)" />
      </div>
    </div>

    <!-- Bottom drop zone (D-05) -->
    <div ref="bottomDropRef" class="canvas-drop-zone">
      <span>拖入字段创建新行</span>
    </div>

    <!-- Empty state -->
    <div v-if="rows.length === 0 && !hasNonRowItems" class="empty-state">
      <span>从左侧拖入字段开始设计表单</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDraggable, VueDraggable } from 'vue-draggable-plus';
import { useTemplateStore } from 'src/stores/template';
import type { SchemaV2, SchemaRow, SchemaField } from 'src/types/schema';
import { createEmptySchema } from 'src/types/schema';
import { remainingCols, compressColSpan } from './composables/gridUtils';
import FieldRenderer from 'src/components/renderer/FieldRenderer.vue';

const store = useTemplateStore();
const rowsRef = ref<HTMLElement | null>(null);
const bottomDropRef = ref<HTMLElement | null>(null);
const resizingFieldId = ref<string | null>(null);
const rowFieldsRefs: Record<number, HTMLElement | null> = {};

function setRowFieldsRef(idx: number, el: any) {
  rowFieldsRefs[idx] = el?.$el ?? el;
}

function ensureSchema(): SchemaV2 {
  if (!store.current) return createEmptySchema();
  if (!store.current.schema || !('version' in store.current.schema)) {
    store.current.schema = createEmptySchema();
  }
  return store.current.schema;
}

const schema = computed(() => ensureSchema());

const rows = computed(() =>
  schema.value.items.filter((item): item is SchemaRow => item.type === 'row')
);

const hasNonRowItems = computed(() =>
  schema.value.items.some(item => item.type !== 'row')
);

// Row-level drag (D-06)
const rowList = computed({
  get: () => rows.value,
  set: (newRows: SchemaRow[]) => {
    const s = ensureSchema();
    // Rebuild items preserving non-row items at their relative positions
    const nonRows = s.items.filter(item => item.type !== 'row');
    // Simple approach: rows first, then non-rows (groups/tables come after)
    s.items = [...newRows, ...nonRows];
  },
});

useDraggable(rowsRef, rowList, {
  group: { name: 'rows', pull: false, put: false },
  handle: '.row-drag-handle',
  animation: 150,
  ghostClass: 'row-ghost',
});

// Field-level callbacks
function updateRowFields(rowIdx: number, newFields: SchemaField[]) {
  const s = ensureSchema();
  let rowCount = 0;
  for (let i = 0; i < s.items.length; i++) {
    if (s.items[i].type === 'row') {
      if (rowCount === rowIdx) {
        (s.items[i] as SchemaRow).fields = newFields;
        return;
      }
      rowCount++;
    }
  }
}

function onFieldAdd(rowIdx: number, _evt: any) {
  const row = rows.value[rowIdx];
  if (!row) return;
  // Compress colSpan for all fields that might overflow (D-08)
  for (const field of row.fields) {
    compressColSpan(field, row.fields);
  }
}

function onFieldRemove(rowIdx: number) {
  const row = rows.value[rowIdx];
  if (row && row.fields.length === 0) {
    deleteRowByRef(row);
  }
}

// Bottom drop zone (D-05)
const bottomDropList = ref<SchemaField[]>([]);
useDraggable(bottomDropRef, bottomDropList, {
  group: { name: 'fields', pull: false, put: true },
  animation: 150,
  onAdd: (evt: any) => {
    const field = bottomDropList.value.splice(0, bottomDropList.value.length)[0];
    if (!field) return;
    const s = ensureSchema();
    const newRow: SchemaRow = { type: 'row', fields: [field] };
    compressColSpan(field, newRow.fields);
    s.items.push(newRow);
  },
});

// Resize (D-09, D-10)
function startResize(e: PointerEvent, field: SchemaField, rowIdx: number) {
  e.preventDefault();
  e.stopPropagation();
  const el = rowFieldsRefs[rowIdx];
  if (!el) return;
  const colWidth = el.clientWidth / 12;
  const startX = e.clientX;
  const startSpan = field.colSpan;
  const max = remainingCols(rows.value[rowIdx].fields) + field.colSpan;
  resizingFieldId.value = field.id;

  function onMove(ev: PointerEvent) {
    const delta = Math.round((ev.clientX - startX) / colWidth);
    field.colSpan = Math.max(1, Math.min(max, startSpan + delta));
  }
  function onUp() {
    resizingFieldId.value = null;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

// Field removal (D-13)
function removeField(id: string) {
  if (!store.current) return;
  const s = ensureSchema();
  for (let i = s.items.length - 1; i >= 0; i--) {
    const item = s.items[i];
    if (item.type === 'row') {
      const idx = item.fields.findIndex(f => f.id === id);
      if (idx !== -1) {
        item.fields.splice(idx, 1);
        if (item.fields.length === 0) s.items.splice(i, 1);
        break;
      }
    } else if (item.type === 'group') {
      for (let r = item.rows.length - 1; r >= 0; r--) {
        const ridx = item.rows[r].fields.findIndex(f => f.id === id);
        if (ridx !== -1) {
          item.rows[r].fields.splice(ridx, 1);
          if (item.rows[r].fields.length === 0) item.rows.splice(r, 1);
          if (item.rows.length === 0) s.items.splice(i, 1);
          break;
        }
      }
    }
  }
  if (store.selectedFieldId === id) store.selectField(null);
}

// Row deletion (D-11)
function deleteRow(rowIdx: number) {
  const s = ensureSchema();
  let rowCount = 0;
  for (let i = 0; i < s.items.length; i++) {
    if (s.items[i].type === 'row') {
      if (rowCount === rowIdx) {
        const row = s.items[i] as SchemaRow;
        if (store.selectedFieldId && row.fields.some(f => f.id === store.selectedFieldId)) {
          store.selectField(null);
        }
        s.items.splice(i, 1);
        return;
      }
      rowCount++;
    }
  }
}

function deleteRowByRef(row: SchemaRow) {
  const s = ensureSchema();
  const idx = s.items.indexOf(row);
  if (idx !== -1) {
    if (store.selectedFieldId && row.fields.some(f => f.id === store.selectedFieldId)) {
      store.selectField(null);
    }
    s.items.splice(idx, 1);
  }
}

// Keyboard support
function onKeydown(e: KeyboardEvent) {
  if (!store.selectedFieldId) return;
  const field = store.selectedField;
  if (!field) return;

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const row = rows.value.find(r => r.fields.some(f => f.id === field.id));
    if (row) {
      const max = remainingCols(row.fields) + field.colSpan;
      field.colSpan = Math.min(max, field.colSpan + 1);
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    field.colSpan = Math.max(1, field.colSpan - 1);
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    removeField(field.id);
  }
}

defineExpose({ removeField });
</script>

<style scoped>
.grid-canvas {
  flex: 1;
  min-width: 400px;
  height: 100%;
  background: var(--oa-bg);
  overflow-y: auto;
  padding: 16px;
  outline: none;
}
.grid-canvas-row {
  display: flex;
  align-items: stretch;
  margin-bottom: 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: border-color 150ms;
  position: relative;
}
.grid-canvas-row:hover {
  border-color: var(--oa-border);
}
.grid-canvas-row:hover .row-delete-btn {
  opacity: 1;
}
.row-handle {
  display: flex;
  align-items: center;
  padding: 0 4px;
  cursor: grab;
  opacity: 0.5;
}
.row-handle:hover { opacity: 1; }
.row-fields-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 8px 16px;
}
.grid-canvas-field {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--oa-border);
  border-radius: 6px;
  background: var(--oa-surface);
  cursor: pointer;
  transition: border-color 150ms, box-shadow 150ms;
}
.grid-canvas-field:hover {
  border-color: var(--q-primary);
}
.grid-canvas-field.is-selected {
  border: 2px solid var(--q-primary);
  box-shadow: 0 0 0 2px rgba(var(--q-primary-rgb, 25, 118, 210), 0.15);
}
.field-drag-handle {
  cursor: grab;
  opacity: 0.5;
  flex-shrink: 0;
}
.field-drag-handle:active { cursor: grabbing; }
.field-preview { flex: 1; min-width: 0; }
.field-delete-btn { flex-shrink: 0; }
.row-remainder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border: 2px dashed var(--oa-border);
  border-radius: 6px;
  color: var(--oa-text-tertiary);
  font-size: 13px;
}
.row-delete-btn {
  opacity: 0;
  transition: opacity 150ms;
  flex-shrink: 0;
  align-self: center;
}
.resize-handle-right {
  position: absolute;
  right: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 10;
}
.canvas-drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  border: 2px dashed var(--oa-border);
  border-radius: 6px;
  color: var(--oa-text-tertiary);
  font-size: 13px;
  margin-top: 8px;
  transition: border-color 150ms, background 150ms;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--oa-text-tertiary);
  font-size: 14px;
}
.row-ghost { opacity: 0.4; }
</style>
