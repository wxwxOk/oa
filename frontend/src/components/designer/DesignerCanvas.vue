<template>
  <div class="designer-canvas" @click.self="store.selectField(null)">
    <div ref="canvasRef" class="canvas-list">
      <div v-if="!hasFields" class="empty-state">
        <span style="font-size: 14px; color: var(--oa-text-tertiary)">从左侧拖入字段开始设计表单</span>
      </div>
      <div
        v-for="field in flatFields"
        :key="field.id"
        class="canvas-field-item"
        :class="{ 'is-selected': store.selectedFieldId === field.id }"
        @click.stop="store.selectField(field.id)"
      >
        <div class="field-drag-handle">
          <q-icon name="drag_indicator" size="16px" color="grey-5" />
        </div>
        <div class="field-content">
          <span class="field-label">{{ field.label }}</span>
          <span class="field-type-badge">{{ field.type }}</span>
        </div>
        <q-btn flat dense round icon="close" size="xs" @click.stop="removeField(field.id)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDraggable } from 'vue-draggable-plus';
import { useTemplateStore } from 'src/stores/template';
import type { SchemaV2, SchemaRow, SchemaField } from 'src/types/schema';
import { createEmptySchema } from 'src/types/schema';

const store = useTemplateStore();
const canvasRef = ref<HTMLElement | null>(null);

function ensureSchema(): SchemaV2 {
  if (!store.current) return createEmptySchema();
  if (!store.current.schema || !('version' in store.current.schema)) {
    store.current.schema = createEmptySchema();
  }
  return store.current.schema;
}

const schema = computed(() => ensureSchema());

const hasFields = computed(() => schema.value.items.length > 0);

const flatFields = computed({
  get: () => {
    const result: SchemaField[] = [];
    for (const item of schema.value.items) {
      if (item.type === 'row') result.push(...item.fields);
      else if (item.type === 'group') {
        for (const row of item.rows) result.push(...row.fields);
      }
    }
    return result;
  },
  set: (newList: SchemaField[]) => {
    const s = ensureSchema();
    s.items = newList.map(f => ({ type: 'row', fields: [f] }) as SchemaRow);
  },
});

function addFieldAsRow(field: SchemaField) {
  const s = ensureSchema();
  const row: SchemaRow = { type: 'row', fields: [field] };
  s.items.push(row);
}

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

useDraggable(canvasRef, flatFields, {
  group: { name: 'designer', pull: false, put: true },
  animation: 150,
  handle: '.field-drag-handle',
  onAdd: (evt: any) => {
    const cloned = evt.item?.__draggable_context?.element;
    if (cloned && cloned.id && cloned.type) {
      addFieldAsRow(cloned as SchemaField);
    }
  },
});

defineExpose({ removeField });
</script>

<style scoped>
.designer-canvas {
  flex: 1;
  min-width: 400px;
  height: 100%;
  background: var(--oa-bg);
  overflow-y: auto;
  padding: 16px;
}
.canvas-list {
  min-height: 200px;
  border: 2px dashed transparent;
  border-radius: 8px;
  transition: border-color 150ms;
}
.canvas-list:empty,
.canvas-list:has(.empty-state) {
  border-color: var(--oa-border);
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  pointer-events: none;
}
.canvas-field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border: 1px solid var(--oa-border);
  border-radius: 6px;
  background: var(--oa-surface);
  cursor: pointer;
  transition: border-color 150ms, box-shadow 150ms;
}
.canvas-field-item:hover {
  border-color: var(--q-primary);
}
.canvas-field-item.is-selected {
  border-color: var(--q-primary);
  box-shadow: 0 0 0 2px rgba(var(--q-primary-rgb, 25, 118, 210), 0.15);
}
.field-drag-handle {
  cursor: grab;
  opacity: 0.5;
}
.field-drag-handle:active {
  cursor: grabbing;
}
.field-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-label {
  font-size: 14px;
}
.field-type-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--oa-hover);
  color: var(--oa-text-secondary);
}
</style>
