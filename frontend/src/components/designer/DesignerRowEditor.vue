<template>
  <div class="row-editor">
    <div
      v-for="(row, rowIdx) in props.rows"
      :key="rowIdx"
      class="grid-canvas-row"
      :aria-label="`第 ${rowIdx + 1} 行, ${row.fields.length} 个字段`"
    >
      <!-- 行拖拽手柄 -->
      <div class="row-handle row-drag-handle" aria-label="拖拽排序">
        <q-icon name="drag_indicator" size="16px" color="grey-5" />
      </div>

      <!-- 字段栅格容器 -->
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
        class="row-fields-grid"
        @add="(evt: any) => onFieldAdd(rowIdx, evt)"
        @remove="() => onFieldRemove(rowIdx)"
      >
        <div
          v-for="field in row.fields"
          :key="field.id"
          class="grid-canvas-field"
          :class="{ 'is-selected': store.selectedFieldId === field.id }"
          :style="{ gridColumn: `span ${field.colSpan}` }"
          @click.stop="emit('select-field', field.id)"
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
        <div v-if="remainingCols(row.fields) > 0"
             class="row-remainder drop-placeholder"
             :style="{ gridColumn: `span ${remainingCols(row.fields)}` }">
        </div>
      </VueDraggable>

      <!-- 行删除按钮 -->
      <q-btn flat dense round icon="delete_outline" size="xs"
             class="row-delete-btn" @click="deleteRow(rowIdx)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useTemplateStore } from 'src/stores/template';
import type { SchemaRow, SchemaField } from 'src/types/schema';
import { remainingCols, compressColSpan } from './composables/gridUtils';
import FieldRenderer from 'src/components/renderer/FieldRenderer.vue';

const store = useTemplateStore();
const resizingFieldId = ref<string | null>(null);
const rowFieldsRefs: Record<number, HTMLElement | null> = {};

const props = defineProps<{
  rows: SchemaRow[]
}>();

const emit = defineEmits<{
  'update:rows': [rows: SchemaRow[]]
  'select-field': [fieldId: string]
}>();

function setRowFieldsRef(idx: number, el: any) {
  rowFieldsRefs[idx] = el?.$el ?? el;
}

function updateRowFields(rowIdx: number, newFields: SchemaField[]) {
  props.rows[rowIdx].fields = newFields;
  emit('update:rows', [...props.rows]);
}

function onFieldAdd(rowIdx: number, _evt: any) {
  const row = props.rows[rowIdx];
  if (!row) return;
  for (const field of row.fields) {
    compressColSpan(field, row.fields);
  }
}

function onFieldRemove(rowIdx: number) {
  const row = props.rows[rowIdx];
  if (row && row.fields.length === 0) {
    props.rows.splice(rowIdx, 1);
    emit('update:rows', [...props.rows]);
  }
}

function startResize(e: PointerEvent, field: SchemaField, rowIdx: number) {
  e.preventDefault();
  e.stopPropagation();
  const el = rowFieldsRefs[rowIdx];
  if (!el) return;
  const colWidth = el.clientWidth / 12;
  const startX = e.clientX;
  const startSpan = field.colSpan;
  const max = remainingCols(props.rows[rowIdx].fields) + field.colSpan;
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

function removeField(id: string) {
  for (let i = props.rows.length - 1; i >= 0; i--) {
    const row = props.rows[i];
    const idx = row.fields.findIndex(f => f.id === id);
    if (idx !== -1) {
      row.fields.splice(idx, 1);
      if (row.fields.length === 0) {
        props.rows.splice(i, 1);
      }
      emit('update:rows', [...props.rows]);
      if (store.selectedFieldId === id) store.selectField(null);
      break;
    }
  }
}

function deleteRow(rowIdx: number) {
  const row = props.rows[rowIdx];
  if (row && store.selectedFieldId && row.fields.some(f => f.id === store.selectedFieldId)) {
    store.selectField(null);
  }
  props.rows.splice(rowIdx, 1);
  emit('update:rows', [...props.rows]);
}
</script>

<style scoped>
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
  border-color: var(--oa-focus-ring);
}
.grid-canvas-field.is-selected {
  border: 2px solid var(--oa-focus-ring);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
}
.field-drag-handle {
  cursor: grab;
  opacity: 0.5;
  flex-shrink: 0;
}
.field-drag-handle:active { cursor: grabbing; }
.field-preview { flex: 1; min-width: 0; pointer-events: none; }
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
  border-radius: 2px;
  background: var(--oa-focus-ring);
  opacity: 0.5;
  transition: opacity 150ms;
}
.resize-handle-right:hover {
  opacity: 1;
}
</style>
