<template>
  <div class="dynamic-table-print">
    <div class="print-table-label">{{ label }}</div>
    <table class="print-table">
      <colgroup>
        <col
          v-for="col in columns"
          :key="col.key"
          :style="{ width: colWidth(col) }"
        />
      </colgroup>
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key" class="print-th">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIdx) in rows" :key="rowIdx">
          <td v-for="col in columns" :key="col.key" class="print-td">
            {{ formatCell(row[col.key], col.type) }}
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="print-td" style="text-align: center; color: var(--oa-text-tertiary)">
            —
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { formatCell, calcColWidth, type TableColumn } from './dynamicTableUtils';

const props = defineProps<{
  label: string;
  columns: TableColumn[];
  rows: Record<string, any>[];
}>();

function colWidth(col: TableColumn): string {
  return calcColWidth(col, props.columns);
}
</script>

<style scoped>
.print-table-label {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.print-th {
  border: 1px solid #000;
  padding: 8px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
}
.print-td {
  border: 1px solid #000;
  padding: 8px;
  font-size: 14px;
}
</style>
