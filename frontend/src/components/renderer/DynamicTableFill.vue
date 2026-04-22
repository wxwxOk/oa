<template>
  <!-- Mobile: card layout -->
  <template v-if="isMobile">
    <q-card flat bordered class="dynamic-table-fill q-mb-sm">
      <div class="table-label">{{ label }}</div>
      <div v-for="(row, rowIdx) in rows" :key="rowIdx" class="card-row">
        <q-expansion-item
          v-model="expandedStates[rowIdx]"
          expand-separator
          dense
        >
          <template #header>
            <q-item-section>第 {{ rowIdx + 1 }} 行</q-item-section>
            <q-item-section side>
              <q-btn
                flat dense round
                icon="delete_outline"
                size="xs"
                color="negative"
                :aria-label="`删除第 ${rowIdx + 1} 行`"
                @click.stop="removeRow(rowIdx)"
              />
            </q-item-section>
          </template>
          <q-card-section class="card-fields">
            <div v-for="col in columns" :key="col.key" class="card-field">
              <div class="card-field-label">{{ col.label }}</div>
              <!-- text -->
              <q-input v-if="col.type === 'text'"
                :model-value="row[col.key]"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                outlined dense hide-bottom-space />
              <!-- phone -->
              <q-input v-else-if="col.type === 'phone'"
                :model-value="row[col.key]"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                outlined dense type="tel" mask="###########"
                hide-bottom-space />
              <!-- date -->
              <q-input v-else-if="col.type === 'date'"
                :model-value="row[col.key]"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                outlined dense readonly placeholder="选择日期"
                hide-bottom-space>
                <template #append>
                  <q-icon name="calendar_today" class="cursor-pointer" size="xs">
                    <q-popup-proxy cover transition-show="scale"
                      transition-hide="scale">
                      <q-date :model-value="row[col.key]"
                        @update:model-value="updateCell(rowIdx, col.key, $event)"
                        mask="YYYY-MM-DD" />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
              <!-- radio -->
              <q-select v-else-if="col.type === 'radio'"
                :model-value="row[col.key]"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                :options="col.options ?? []"
                outlined dense emit-value map-options hide-bottom-space />
              <!-- checkbox -->
              <q-select v-else-if="col.type === 'checkbox'"
                :model-value="row[col.key] ?? []"
                @update:model-value="updateCell(rowIdx, col.key, $event)"
                :options="col.options ?? []"
                outlined dense multiple emit-value map-options
                hide-bottom-space />
            </div>
          </q-card-section>
        </q-expansion-item>
      </div>
      <q-btn flat dense icon="add" label="添加行" color="primary"
        class="add-row-btn" @click="addRow" />
    </q-card>
  </template>
  <!-- Desktop: table layout -->
  <template v-else>
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
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { createEmptyRow, type TableColumn } from './dynamicTableUtils';
import { useResponsive } from 'src/composables/useResponsive';

const props = defineProps<{
  label: string;
  columns: TableColumn[];
  modelValue?: Record<string, any>[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>[]];
}>();

const rows = ref<Record<string, any>[]>([]);

const { isMobile } = useResponsive();

const expandedStates = ref<boolean[]>([]);
watch(() => rows.value.length, (newLen) => {
  while (expandedStates.value.length < newLen) {
    expandedStates.value.push(true);
  }
  expandedStates.value.length = newLen;
}, { immediate: true });

onMounted(() => {
  if (props.modelValue && props.modelValue.length > 0) {
    rows.value = props.modelValue.map(r => ({ ...r }));
  } else {
    // D-14: 初始渲染 1 行空值
    rows.value = [createEmptyRow(props.columns)];
  }
});

function addRow() {
  rows.value.push(createEmptyRow(props.columns));
  emitUpdate();
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1);
  // 删除最后一行时自动创建空行
  if (rows.value.length === 0) {
    rows.value.push(createEmptyRow(props.columns));
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
.card-row {
  border-bottom: 1px solid var(--oa-border);
}
.card-row:last-of-type {
  border-bottom: none;
}
.card-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card-field-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--oa-text-secondary);
  margin-bottom: 4px;
}
@media (max-width: 1023px) {
  .card-fields :deep(.q-field__control) {
    min-height: 44px;
  }
}
</style>
