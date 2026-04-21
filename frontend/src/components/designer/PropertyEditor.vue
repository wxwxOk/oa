<template>
  <div class="property-editor">
    <!-- 空状态 -->
    <div v-if="!selectedItem" class="flex flex-center" style="height: 100%">
      <span style="font-size: 14px; color: var(--oa-text-tertiary)">点击画布上的字段进行编辑</span>
    </div>

    <!-- 分组编辑分支 -->
    <template v-else-if="itemType === 'group' && selectedGroup">
      <div class="row items-center q-mb-md" style="gap: 8px">
        <q-icon name="folder_open" size="20px" style="color: var(--oa-text-secondary)" />
        <span style="font-size: 14px; font-weight: 600">分组</span>
      </div>
      <div class="column q-gutter-sm">
        <q-input v-model="selectedGroup.title" label="分组标题" outlined dense />
        <q-btn flat dense icon="delete_outline" color="negative" label="删除分组"
               @click="deleteSelectedItem" />
      </div>
    </template>

    <!-- 动态表格编辑分支 -->
    <template v-else-if="itemType === 'dynamic-table' && selectedTable">
      <div class="row items-center q-mb-md" style="gap: 8px">
        <q-icon name="table_chart" size="20px" style="color: var(--oa-text-secondary)" />
        <span style="font-size: 14px; font-weight: 600">动态表格</span>
      </div>
      <div class="column q-gutter-sm">
        <q-input v-model="selectedTable.label" label="表格标签" outlined dense />

        <div style="font-size: 14px; color: var(--oa-text-secondary)" class="q-mt-sm">列宽</div>
        <q-slider v-model="selectedTable.colSpan" :min="1" :max="12" :step="1"
                  label :label-value="selectedTable.colSpan + ' / 12'" color="primary" />

        <div style="font-size: 14px; color: var(--oa-text-secondary)" class="q-mt-sm">列结构</div>

        <VueDraggable v-model="selectedTable.columns" handle=".col-drag-handle"
                      :animation="150" class="column q-gutter-sm">
          <div v-for="(col, ci) in selectedTable.columns" :key="col.key"
               class="column-entry">
            <div class="row items-center no-wrap" style="gap: 4px">
              <div class="col-drag-handle">
                <q-icon name="drag_indicator" size="14px" color="grey-5" />
              </div>
              <q-input v-model="col.label" label="列名" outlined dense class="col" />
              <q-btn flat dense round icon="close" size="xs" color="negative"
                     :disable="selectedTable.columns.length <= 1"
                     @click="removeColumn(ci)" />
            </div>
            <q-select v-model="col.type" :options="COLUMN_TYPE_OPTIONS" label="类型"
                      outlined dense emit-value map-options
                      @update:model-value="(v: DynamicTableColumnType) => onColumnTypeChange(col, v)" />
            <div class="row items-center" style="gap: 8px">
              <span style="font-size: 13px; color: var(--oa-text-secondary)">宽度比例</span>
              <q-slider v-model="col.width" :min="1" :max="6" :step="1"
                        label :label-value="String(col.width ?? 1)" color="primary"
                        class="col" style="min-width: 80px" />
            </div>
            <q-input v-if="col.type === 'radio' || col.type === 'checkbox'"
                     :model-value="col.options?.join(', ') ?? ''"
                     @update:model-value="(v: string | number | null) => col.options = String(v ?? '').split(',').map(s => s.trim()).filter(Boolean)"
                     label="选项（逗号分隔）" outlined dense />
          </div>
        </VueDraggable>

        <q-btn flat dense size="sm" icon="add" label="添加列" @click="addColumn" />

        <q-btn flat dense icon="delete_outline" color="negative" label="删除表格"
               class="q-mt-md" @click="deleteSelectedItem" />
      </div>
    </template>

    <!-- 字段编辑分支（原有逻辑） -->
    <template v-else-if="field">
      <div class="row items-center q-mb-md" style="gap: 8px">
        <q-icon :name="fieldMeta?.icon" size="20px" style="color: var(--oa-text-secondary)" />
        <span style="font-size: 14px; font-weight: 600">{{ fieldMeta?.label }}</span>
      </div>

      <div class="column q-gutter-sm">
        <q-input
          v-model="field.label"
          label="字段标签"
          outlined
          dense
          :rules="[(v: string) => !!v || '请输入字段标签']"
          lazy-rules="ondemand"
        />

        <q-toggle v-model="field.required" label="必填" />

        <div style="font-size: 14px; color: var(--oa-text-secondary)" class="q-mt-sm">列宽</div>
        <q-slider
          v-model="field.colSpan"
          :min="1"
          :max="maxColSpan"
          :step="1"
          label
          :label-value="field.colSpan + ' / 12'"
          color="primary"
        />

        <q-input
          v-if="field.type !== 'signature'"
          v-model="field.placeholder"
          label="提示文字"
          outlined
          dense
        />

        <template v-if="field.type === 'radio' || field.type === 'checkbox'">
          <div style="font-size: 14px; color: var(--oa-text-secondary)" class="q-mt-sm">选项</div>
          <div v-for="(opt, idx) in field.options" :key="idx" class="row items-center no-wrap q-gutter-xs">
            <q-input
              :model-value="opt"
              outlined
              dense
              class="col"
              :rules="[(v: string) => !!v || '选项不能为空']"
              lazy-rules="ondemand"
              @update:model-value="(v: string | number | null) => updateOption(idx, String(v ?? ''))"
            />
            <q-btn flat dense icon="close" size="sm" color="negative" @click="removeOption(idx)" />
          </div>
          <q-btn flat dense size="sm" icon="add" label="添加选项" @click="addOption" />
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useTemplateStore } from 'src/stores/template';
import type { SchemaV2, SchemaGroup, SchemaDynamicTable, DynamicTableColumnType } from 'src/types/schema';
import { remainingCols } from './composables/gridUtils';
import { FIELD_TYPES } from './fieldRegistry';

const store = useTemplateStore();

// 类型分发
const selectedItem = computed(() => store.selectedItem);
const itemType = computed<'field' | 'group' | 'dynamic-table' | null>(() => {
  const item = selectedItem.value;
  if (!item) return null;
  if ('type' in item && item.type === 'group') return 'group';
  if ('type' in item && item.type === 'dynamic-table') return 'dynamic-table';
  return 'field';
});

// 字段分支（保持向后兼容）
const field = computed(() => store.selectedField);
const fieldMeta = computed(() =>
  field.value ? FIELD_TYPES.find(ft => ft.type === field.value!.type) : null,
);

// 分组和动态表格的类型化访问器
const selectedGroup = computed(() =>
  itemType.value === 'group' ? selectedItem.value as SchemaGroup : null,
);
const selectedTable = computed(() =>
  itemType.value === 'dynamic-table' ? selectedItem.value as SchemaDynamicTable : null,
);

// 列类型选项
const COLUMN_TYPE_OPTIONS: Array<{ label: string; value: DynamicTableColumnType }> = [
  { label: '文本', value: 'text' },
  { label: '单选', value: 'radio' },
  { label: '多选', value: 'checkbox' },
  { label: '日期', value: 'date' },
  { label: '手机号', value: 'phone' },
];

// 字段列宽计算
const maxColSpan = computed(() => {
  if (!field.value || !store.current?.schema) return 12;
  const schema = store.current.schema as SchemaV2;
  for (const item of schema.items) {
    if (item.type === 'row') {
      const idx = item.fields.findIndex(f => f.id === field.value!.id);
      if (idx !== -1) return remainingCols(item.fields.filter(f => f.id !== field.value!.id));
    } else if (item.type === 'group') {
      for (const row of item.rows) {
        const idx = row.fields.findIndex(f => f.id === field.value!.id);
        if (idx !== -1) return remainingCols(row.fields.filter(f => f.id !== field.value!.id));
      }
    }
  }
  return 12;
});

// 删除分组/动态表格
function deleteSelectedItem() {
  if (!store.current || !store.selectedFieldId) return;
  const schema = store.current.schema as SchemaV2;
  const idx = schema.items.findIndex(item =>
    (item.type === 'group' || item.type === 'dynamic-table') && 'id' in item && item.id === store.selectedFieldId,
  );
  if (idx !== -1) {
    schema.items.splice(idx, 1);
    store.selectField(null);
  }
}

// 列管理
function addColumn() {
  const table = selectedTable.value;
  if (!table) return;
  const n = table.columns.length + 1;
  table.columns.push({
    key: crypto.randomUUID(),
    label: `列 ${n}`,
    type: 'text' as DynamicTableColumnType,
  });
}

function removeColumn(idx: number) {
  const table = selectedTable.value;
  if (!table || table.columns.length <= 1) return;
  table.columns.splice(idx, 1);
}

function onColumnTypeChange(col: { type: DynamicTableColumnType; options?: string[] }, newType: DynamicTableColumnType) {
  col.type = newType;
  if (newType !== 'radio' && newType !== 'checkbox') {
    delete col.options;
  } else if (!col.options) {
    col.options = ['选项1', '选项2'];
  }
}

// 字段选项管理（原有逻辑）
function updateOption(idx: number, val: string) {
  if (field.value?.options) field.value.options[idx] = val;
}

function removeOption(idx: number) {
  if (field.value?.options && field.value.options.length > 1) {
    field.value.options.splice(idx, 1);
  }
}

function addOption() {
  if (field.value?.options) {
    field.value.options.push(`选项${field.value.options.length + 1}`);
  }
}
</script>

<style scoped>
.property-editor {
  width: 280px;
  min-width: 280px;
  height: 100%;
  background: var(--oa-surface);
  border-left: 1px solid var(--oa-border);
  overflow-y: auto;
  padding: 16px;
}

.column-entry {
  border: 1px solid var(--oa-border);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.col-drag-handle {
  cursor: grab;
  padding: 2px;
  flex-shrink: 0;
}

.col-drag-handle:active {
  cursor: grabbing;
}
</style>
