<template>
  <q-card flat bordered class="dynamic-table-fill q-mb-sm">
    <div class="table-label">{{ label }}</div>
    <div class="table-wrapper">
      <table class="fill-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="fill-th"
            >
              {{ col.label }}
            </th>
            <th class="fill-th-action"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIdx) in rows"
            :key="rowIdx"
            class="fill-row"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="fill-td"
            >
              <!-- 文本 -->
              <q-input
                v-if="col.type === 'text'"
                :model-value="row[col.key]"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                outlined
                dense
                hide-bottom-space
              />
              <!-- 手机号 -->
              <q-input
                v-else-if="col.type === 'phone'"
                :model-value="row[col.key]"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                outlined
                dense
                type="tel"
                mask="###########"
                hide-bottom-space
              />
              <!-- 日期 -->
              <q-input
                v-else-if="col.type === 'date'"
                :model-value="row[col.key]"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                outlined
                dense
                readonly
                placeholder="选择日期"
                hide-bottom-space
              >
                <template #append>
                  <q-icon name="calendar_today" class="cursor-pointer" size="xs">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date
                        :model-value="row[col.key]"
                        @update:model-value="updateCell(rowIdx, col.key, $event)"
                        mask="YYYY-MM-DD"
                      />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
              <!-- 单选 -->
              <q-select
                v-else-if="col.type === 'radio'"
                :model-value="row[col.key]"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                :options="col.options ?? []"
                outlined
                dense
                emit-value
                map-options
                hide-bottom-space
              />
              <!-- 多选 -->
              <q-select
                v-else-if="col.type === 'checkbox'"
                :model-value="row[col.key] ?? []"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                :options="col.options ?? []"
                outlined
                dense
                multiple
                emit-value
                map-options
                hide-bottom-space
              />
            </td>
            <td class="fill-td-action">
              <q-btn
                flat
                dense
                round
                icon="delete_outline"
                size="xs"
                color="negative"
                class="row-delete-icon"
                @click="removeRow(rowIdx)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <q-btn
      flat
      dense
      icon="add"
      label="添加行"
      color="primary"
      class="add-row-btn"
      @click="addRow"
    />
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { DynamicTableColumnType } from 'src/types/schema';

interface Column {
  key: string;
  label: string;
  type: DynamicTableColumnType;
  width?: number;
  options?: string[];
}

const props = defineProps<{
  label: string;
  columns: Column[];
  modelValue?: Record<string, any>[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>[]];
}>();

const rows = ref<Record<string, any>[]>([]);

function createEmptyRow(): Record<string, any> {
  const row: Record<string, any> = {};
  for (const col of props.columns) {
    row[col.key] = col.type === 'checkbox' ? [] : '';
  }
  return row;
}

onMounted(() => {
  if (props.modelValue && props.modelValue.length > 0) {
    rows.value = props.modelValue.map(r => ({ ...r }));
  } else {
    // D-14: 初始渲染 1 行空值
    rows.value = [createEmptyRow()];
  }
});

function addRow() {
  rows.value.push(createEmptyRow());
  emitUpdate();
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1);
  // 删除最后一行时自动创建空行
  if (rows.value.length === 0) {
    rows.value.push(createEmptyRow());
  }
  emitUpdate();
}

function updateCell(rowIdx: number, colKey: string, value: any) {
  rows.value[rowIdx][colKey] = value;
  emitUpdate();
}

function emitUpdate() {
  emit('update:modelValue', rows.value.map(r => ({ ...r })));
}
</script>

<style scoped>
.table-label {
  font-size: 16px;
  font-weight: 600;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--oa-border);
}
.table-wrapper {
  overflow-x: auto;
}
.fill-table {
  width: 100%;
  border-collapse: collapse;
}
.fill-th {
  font-size: 14px;
  font-weight: 600;
  padding: 8px;
  border-bottom: 2px solid var(--oa-border);
  background: var(--oa-bg);
  color: var(--oa-text-primary);
  text-align: left;
}
.fill-th-action {
  width: 40px;
  border-bottom: 2px solid var(--oa-border);
  background: var(--oa-bg);
}
.fill-row {
  transition: background 150ms;
}
.fill-row:hover {
  background: var(--oa-hover);
}
.fill-td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--oa-border);
  vertical-align: top;
}
.fill-td-action {
  width: 40px;
  border-bottom: 1px solid var(--oa-border);
  vertical-align: middle;
  text-align: center;
}
.row-delete-icon {
  opacity: 0;
  transition: opacity 150ms;
}
.fill-row:hover .row-delete-icon {
  opacity: 1;
}
.add-row-btn {
  width: 100%;
  padding: 8px;
  border-top: 1px solid var(--oa-border);
}
</style>
