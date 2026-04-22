<template>
  <div class="grid-form" :class="'mode-' + mode">
    <!-- Print mode: HTML table rendering -->
    <template v-if="mode === 'print'">
      <template v-for="(seg, sIdx) in printSegments" :key="'ps-' + sIdx">
        <table v-if="seg.kind === 'rows'" class="print-grid-table">
          <colgroup>
            <col v-for="i in 12" :key="i" style="width: 8.333%" />
          </colgroup>
          <tbody>
            <tr v-for="(row, rIdx) in seg.rows" :key="rIdx" data-break="row">
              <td
                v-for="field in row.fields"
                :key="field.id"
                :colspan="field.colSpan"
                class="print-cell"
              >
                <FieldRenderer :field="field" mode="print" :model-value="modelValue?.[field.id]" />
              </td>
              <td v-if="rowRemainder(row) > 0" :colspan="rowRemainder(row)" class="print-cell empty-cell" />
            </tr>
          </tbody>
        </table>

        <GroupRenderer
          v-else-if="seg.kind === 'group'"
          :group="seg.item"
          mode="print"
          :model-value="modelValue"
        />

        <div v-else-if="seg.kind === 'dynamic-table'" class="dynamic-table-print-wrapper" data-break="table">
          <DynamicTablePrint
            :label="seg.item.label"
            :columns="seg.item.columns"
            :rows="modelValue?.[seg.item.id] ?? []"
          />
        </div>
      </template>
    </template>

    <!-- Non-print modes -->
    <template v-else>
      <template v-for="(item, idx) in schema.items" :key="idx">
        <!-- Row -->
        <div v-if="item.type === 'row'" class="grid-row">
          <FieldRenderer
            v-for="field in item.fields"
            :key="field.id"
            :ref="(el: any) => { if (el) fieldRefMap[field.id] = el }"
            :field="field"
            :mode="mode"
            :style="{ gridColumn: `span ${field.colSpan}` }"
            :model-value="modelValue?.[field.id]"
            @update:model-value="emitField(field.id, $event)"
          />
        </div>

        <!-- Group -->
        <GroupRenderer
          v-else-if="item.type === 'group'"
          :ref="(el: any) => { if (el) groupRefs.push(el) }"
          :group="item"
          :mode="mode"
          :model-value="modelValue"
          @update:model-value="$emit('update:modelValue', $event)"
        />

        <!-- 动态表格 -->
        <template v-else-if="item.type === 'dynamic-table'">
          <div v-if="mode === 'designer'" class="dynamic-table-stub"
               :style="{ gridColumn: `span ${item.colSpan}` }">
            {{ item.label }} — 动态表格
          </div>
          <DynamicTableFill
            v-else-if="mode === 'fill'"
            :label="item.label"
            :columns="item.columns"
            :model-value="modelValue?.[item.id]"
            @update:model-value="emitField(item.id, $event)"
          />
        </template>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';
import { flattenFields, type SchemaV2, type SchemaRow, type SchemaGroup, type SchemaDynamicTable } from 'src/types/schema';
import FieldRenderer from './FieldRenderer.vue';
import GroupRenderer from './GroupRenderer.vue';
import DynamicTableFill from './DynamicTableFill.vue';
import DynamicTablePrint from './DynamicTablePrint.vue';

const props = defineProps<{
  schema: SchemaV2;
  mode: 'designer' | 'fill' | 'print';
  modelValue?: Record<string, any>;
}>();

// Print mode: segment schema items for table rendering
type PrintSegment =
  | { kind: 'rows'; rows: SchemaRow[] }
  | { kind: 'group'; item: SchemaGroup }
  | { kind: 'dynamic-table'; item: SchemaDynamicTable };

const printSegments = computed<PrintSegment[]>(() => {
  const segments: PrintSegment[] = [];
  let currentRows: SchemaRow[] = [];
  for (const item of props.schema.items) {
    if (item.type === 'row') {
      currentRows.push(item);
    } else {
      if (currentRows.length) {
        segments.push({ kind: 'rows', rows: currentRows });
        currentRows = [];
      }
      if (item.type === 'group') {
        segments.push({ kind: 'group', item });
      } else if (item.type === 'dynamic-table') {
        segments.push({ kind: 'dynamic-table', item });
      }
    }
  }
  if (currentRows.length) {
    segments.push({ kind: 'rows', rows: currentRows });
  }
  return segments;
});

function rowRemainder(row: SchemaRow): number {
  const used = row.fields.reduce((sum, f) => sum + f.colSpan, 0);
  return Math.max(0, 12 - used);
}

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
}>();

const fieldRefMap = reactive<Record<string, InstanceType<typeof FieldRenderer>>>({});
const groupRefs: InstanceType<typeof GroupRenderer>[] = [];

function getAllFieldRefs(): Record<string, InstanceType<typeof FieldRenderer>> {
  const merged = { ...fieldRefMap };
  for (const g of groupRefs) {
    if (g?.fieldRefMap) Object.assign(merged, g.fieldRefMap);
  }
  return merged;
}

function emitField(fieldId: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [fieldId]: value });
}

function validateFields(): boolean {
  const allRefs = getAllFieldRefs();
  const fields = flattenFields(props.schema);
  let valid = true;
  for (const f of fields) {
    const renderer = allRefs[f.id];
    if (renderer?.validate) {
      if (!renderer.validate(props.modelValue?.[f.id], f)) valid = false;
    }
  }
  return valid;
}

function saveSignatures(): Record<string, string> {
  const allRefs = getAllFieldRefs();
  const result: Record<string, string> = {};
  const fields = flattenFields(props.schema);
  for (const f of fields) {
    if (f.type === 'signature') {
      const renderer = allRefs[f.id];
      const data = renderer?.saveSignature?.();
      if (data) result[f.id] = data;
    }
  }
  return result;
}

defineExpose({ validateFields, saveSignatures, fieldRefMap });
</script>

<style scoped>
.grid-form {
  padding: 16px;
}
.grid-row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 8px 16px;
}
.dynamic-table-stub {
  padding: 16px;
  border: 1px dashed var(--oa-border);
  border-radius: 8px;
  text-align: center;
  color: var(--oa-text-tertiary);
  font-size: 14px;
}
</style>
