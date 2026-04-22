<template>
  <!-- Print mode: table rendering -->
  <template v-if="mode === 'print'">
    <div class="group-print" data-break="group">
      <div class="group-header">{{ group.title }}</div>
      <div class="group-body">
        <table class="print-grid-table">
          <colgroup>
            <col v-for="i in 12" :key="i" style="width: 8.333%" />
          </colgroup>
          <tbody>
            <tr v-for="(row, idx) in group.rows" :key="idx" data-break="row">
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
      </div>
    </div>
  </template>

  <!-- Non-print mode -->
  <q-card v-else flat bordered class="group-renderer q-mb-sm">
    <div class="group-header">{{ group.title }}</div>
    <div class="group-body">
      <div v-for="(row, idx) in group.rows" :key="idx" class="grid-row">
        <FieldRenderer
          v-for="field in row.fields"
          :key="field.id"
          :ref="(el: any) => { if (el) fieldRefMap[field.id] = el }"
          :field="field"
          :mode="mode"
          :style="{ gridColumn: `span ${field.colSpan}` }"
          :model-value="modelValue?.[field.id]"
          @update:model-value="emitField(field.id, $event)"
        />
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import type { SchemaGroup, SchemaRow } from 'src/types/schema';
import FieldRenderer from './FieldRenderer.vue';

const props = defineProps<{
  group: SchemaGroup;
  mode: 'designer' | 'fill' | 'print';
  modelValue?: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
}>();

const fieldRefMap = reactive<Record<string, InstanceType<typeof FieldRenderer>>>({});

function rowRemainder(row: SchemaRow): number {
  const used = row.fields.reduce((sum, f) => sum + f.colSpan, 0);
  return Math.max(0, 12 - used);
}

function emitField(fieldId: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [fieldId]: value });
}

defineExpose({ fieldRefMap });
</script>

<style scoped>
.group-header {
  font-size: 16px;
  font-weight: 600;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--oa-border);
}
.group-body {
  padding: 16px;
}
.grid-row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 8px 16px;
}
</style>
