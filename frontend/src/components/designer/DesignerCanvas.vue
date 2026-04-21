<template>
  <div class="designer-canvas" @click.self="store.selectField(null)">
    <div v-if="!hasFields" class="empty-state" @click.stop="store.selectField(null)">
      <span style="font-size: 14px; color: var(--oa-text-tertiary)">从左侧拖入字段开始设计表单</span>
    </div>

    <div ref="canvasRef" class="canvas-list" :class="{ 'canvas-empty': !hasFields }">
      <GridFormRenderer
        v-if="hasFields"
        :schema="schema"
        mode="designer"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDraggable } from 'vue-draggable-plus';
import { useTemplateStore } from 'src/stores/template';
import type { SchemaV2, SchemaRow, SchemaField } from 'src/types/schema';
import { createEmptySchema } from 'src/types/schema';
import GridFormRenderer from 'src/components/renderer/GridFormRenderer.vue';

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

// Flat proxy for useDraggable — maps SchemaV2.items rows for drag-drop
const flatFields = computed({
  get: () => {
    const result: SchemaField[] = [];
    for (const item of schema.value.items) {
      if (item.type === 'row') result.push(...item.fields);
    }
    return result;
  },
  set: () => { /* drag reorder handled in Phase 11 */ },
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
  onAdd: (evt: any) => {
    // The cloned SchemaField from FieldPalette
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
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  border: 2px dashed var(--oa-border);
  border-radius: 8px;
}
.canvas-list {
  min-height: 100px;
}
.canvas-empty {
  min-height: 0;
}
</style>
