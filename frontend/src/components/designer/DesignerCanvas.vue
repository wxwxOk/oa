<template>
  <div class="grid-canvas" @click.self="store.selectField(null)" @keydown="onKeydown" tabindex="0">
    <VueDraggable
      v-model="itemsList"
      handle=".item-drag-handle"
      :group="{ name: 'items', pull: false, put: true }"
      :animation="150"
      ghost-class="item-ghost"
      class="canvas-items"
    >
      <template v-for="(item, idx) in schema.items" :key="itemKey(item, idx)">
        <!-- 行项目 -->
        <div v-if="item.type === 'row'" class="canvas-item-wrapper">
          <div class="item-drag-handle" aria-label="拖拽排序">
            <q-icon name="drag_indicator" size="16px" color="grey-5" />
          </div>
          <div class="item-content" style="flex:1">
            <DesignerRowEditor
              :rows="[item]"
              @update:rows="(newRows) => updateSingleRow(idx, newRows)"
              @select-field="store.selectField($event)"
            />
          </div>
        </div>

        <!-- 分组项目 -->
        <div v-else-if="item.type === 'group'" class="canvas-item-wrapper">
          <div class="item-drag-handle" aria-label="拖拽排序">
            <q-icon name="drag_indicator" size="16px" color="grey-5" />
          </div>
          <q-card flat bordered class="item-content group-card"
                  :class="{ 'is-selected': store.selectedFieldId === item.id }"
                  @click.stop="store.selectField(item.id)">
            <div class="group-header">{{ item.title }}</div>
            <div class="group-body">
              <DesignerRowEditor
                v-if="item.rows.length > 0"
                :rows="item.rows"
                @update:rows="(newRows) => updateGroupRows(idx, newRows)"
                @select-field="store.selectField($event)"
              />
              <VueDraggable
                v-else
                :model-value="getGroupEmptyList(idx)"
                @update:model-value="(val: SchemaField[]) => onGroupEmptyUpdate(idx, val)"
                :group="{ name: 'fields', pull: false, put: ['fields'] }"
                class="group-empty-state"
                @add="() => onGroupEmptyDrop(idx)"
              >
                <span>拖入字段到分组</span>
              </VueDraggable>
            </div>
          </q-card>
        </div>

        <!-- 动态表格项目 -->
        <div v-else-if="item.type === 'dynamic-table'" class="canvas-item-wrapper">
          <div class="item-drag-handle" aria-label="拖拽排序">
            <q-icon name="drag_indicator" size="16px" color="grey-5" />
          </div>
          <q-card flat bordered class="item-content table-card"
                  :class="{ 'is-selected': store.selectedFieldId === item.id }"
                  @click.stop="store.selectField(item.id)">
            <div class="table-header">{{ item.label }}</div>
            <div class="table-body">
              <div class="column-preview">
                <div v-for="col in item.columns" :key="col.key"
                     class="column-preview-cell"
                     :style="{ flex: col.width ?? 1 }">
                  {{ col.label }}
                </div>
              </div>
            </div>
          </q-card>
        </div>
      </template>
    </VueDraggable>

    <!-- 底部放置区 -->
    <div ref="bottomDropRef" class="canvas-drop-zone">
      <span>拖入字段、分组或动态表格添加到末尾</span>
    </div>

    <!-- 空状态 -->
    <div v-if="schema.items.length === 0" class="empty-state">
      <span>从左侧拖入字段开始设计表单</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDraggable, VueDraggable } from 'vue-draggable-plus';
import { useTemplateStore } from 'src/stores/template';
import type { SchemaV2, SchemaRow, SchemaField, SchemaItem } from 'src/types/schema';
import { createEmptySchema } from 'src/types/schema';
import { remainingCols, compressColSpan } from './composables/gridUtils';
import DesignerRowEditor from './DesignerRowEditor.vue';

const store = useTemplateStore();
const bottomDropRef = ref<HTMLElement | null>(null);

function ensureSchema(): SchemaV2 {
  if (!store.current) return createEmptySchema();
  if (!store.current.schema || !('version' in store.current.schema)) {
    store.current.schema = createEmptySchema();
  }
  return store.current.schema;
}

const schema = computed(() => ensureSchema());

// 项目级别拖拽排序 — 字段 drop 自动包裹为 row
const itemsList = computed({
  get: () => schema.value.items,
  set: (newItems: SchemaItem[]) => {
    const s = ensureSchema();
    s.items = newItems.map(item => {
      if (item.type !== 'row' && item.type !== 'group' && item.type !== 'dynamic-table') {
        const field = item as unknown as SchemaField;
        compressColSpan(field, [field]);
        return { type: 'row' as const, fields: [field] };
      }
      return item;
    });
  },
});

function itemKey(item: SchemaItem, idx: number): string {
  if (item.type === 'group' || item.type === 'dynamic-table') return item.id;
  return 'row-' + idx;
}

// 更新单行（从 DesignerRowEditor 回调）
function updateSingleRow(itemIdx: number, newRows: SchemaRow[]) {
  const s = ensureSchema();
  if (newRows.length > 0 && newRows[0].fields.length > 0) {
    s.items[itemIdx] = newRows[0];
  } else {
    s.items.splice(itemIdx, 1);
  }
}

// 更新分组内的行
function updateGroupRows(itemIdx: number, newRows: SchemaRow[]) {
  const s = ensureSchema();
  const group = s.items[itemIdx];
  if (group.type === 'group') {
    group.rows = newRows;
  }
}

// 分组空状态放置区 — 使用 VueDraggable 组件
const groupEmptyLists: Record<number, SchemaField[]> = {};

function getGroupEmptyList(idx: number): SchemaField[] {
  if (!groupEmptyLists[idx]) groupEmptyLists[idx] = [];
  return groupEmptyLists[idx];
}

function onGroupEmptyUpdate(idx: number, val: SchemaField[]) {
  groupEmptyLists[idx] = val;
}

function onGroupEmptyDrop(idx: number) {
  const list = groupEmptyLists[idx];
  if (!list || list.length === 0) return;
  const field = list.splice(0, list.length)[0];
  if (!field) return;
  const s = ensureSchema();
  const group = s.items[idx];
  if (group.type === 'group') {
    const newRow: SchemaRow = { type: 'row', fields: [field] };
    compressColSpan(field, newRow.fields);
    group.rows.push(newRow);
  }
}

// 底部放置区（同时接受字段和结构项，与顶层 VueDraggable 行为对齐）
const bottomDropList = ref<Array<SchemaField | SchemaItem>>([]);
useDraggable(bottomDropRef, bottomDropList, {
  group: { name: 'canvas-bottom', pull: false, put: ['fields', 'items'] },
  animation: 150,
  onAdd: () => {
    const dropped = bottomDropList.value.splice(0, bottomDropList.value.length)[0];
    if (!dropped) return;
    const s = ensureSchema();
    const t = (dropped as { type?: string }).type;
    if (t === 'row' || t === 'group' || t === 'dynamic-table') {
      s.items.push(dropped as SchemaItem);
    } else {
      const field = dropped as SchemaField;
      const newRow: SchemaRow = { type: 'row', fields: [field] };
      compressColSpan(field, newRow.fields);
      s.items.push(newRow);
    }
  },
});

// 字段删除（支持搜索分组内部）
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
      let found = false;
      for (let r = item.rows.length - 1; r >= 0; r--) {
        const ridx = item.rows[r].fields.findIndex(f => f.id === id);
        if (ridx !== -1) {
          item.rows[r].fields.splice(ridx, 1);
          if (item.rows[r].fields.length === 0) item.rows.splice(r, 1);
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }
  if (store.selectedFieldId === id) store.selectField(null);
}

// 获取所有行（包括分组内的行）
function getAllRows(): SchemaRow[] {
  const s = ensureSchema();
  const rows: SchemaRow[] = [];
  for (const item of s.items) {
    if (item.type === 'row') rows.push(item);
    else if (item.type === 'group') rows.push(...item.rows);
  }
  return rows;
}

// 键盘支持（扩展支持分组/动态表格删除）
function onKeydown(e: KeyboardEvent) {
  if (!store.selectedFieldId) return;

  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    const s = ensureSchema();
    // 检查是否选中了分组或动态表格
    const itemIdx = s.items.findIndex(
      item => (item.type === 'group' || item.type === 'dynamic-table') && item.id === store.selectedFieldId
    );
    if (itemIdx !== -1) {
      s.items.splice(itemIdx, 1);
      store.selectField(null);
      return;
    }
    removeField(store.selectedFieldId);
    return;
  }

  // 箭头键调整 colSpan（仅对字段有效）
  const field = store.selectedField;
  if (!field) return;
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const row = getAllRows().find(r => r.fields.some(f => f.id === field.id));
    if (row) {
      const max = remainingCols(row.fields) + field.colSpan;
      field.colSpan = Math.min(max, field.colSpan + 1);
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    field.colSpan = Math.max(1, field.colSpan - 1);
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
.canvas-items {
  min-height: 0;
}
.canvas-item-wrapper {
  display: flex;
  align-items: stretch;
  margin-bottom: 8px;
}
.item-drag-handle {
  display: flex;
  align-items: center;
  padding: 0 4px;
  cursor: grab;
  opacity: 0.5;
}
.item-drag-handle:hover { opacity: 1; }
.item-content { flex: 1; min-width: 0; }
.group-card, .table-card {
  transition: border-color 150ms, box-shadow 150ms;
}
.group-card.is-selected, .table-card.is-selected {
  border: 2px solid var(--oa-focus-ring);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
}
.group-header, .table-header {
  font-size: 16px;
  font-weight: 600;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--oa-border);
}
.group-body, .table-body { padding: 16px; }
.group-empty-state {
  min-height: 64px;
  border: 2px dashed var(--oa-border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oa-text-tertiary);
  font-size: 13px;
}
.column-preview {
  display: flex;
  border-bottom: 1px solid var(--oa-border);
}
.column-preview-cell {
  font-size: 14px;
  font-weight: 600;
  color: var(--oa-text-secondary);
  padding: 8px;
}
.item-ghost { opacity: 0.4; }
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
</style>
