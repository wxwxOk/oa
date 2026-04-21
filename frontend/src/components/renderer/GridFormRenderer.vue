<template>
  <div class="grid-form" :class="'mode-' + mode">
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
        <DynamicTablePrint
          v-else-if="mode === 'print'"
          :label="item.label"
          :columns="item.columns"
          :rows="modelValue?.[item.id] ?? []"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { flattenFields, type SchemaV2 } from 'src/types/schema';
import FieldRenderer from './FieldRenderer.vue';
import GroupRenderer from './GroupRenderer.vue';
import DynamicTableFill from './DynamicTableFill.vue';
import DynamicTablePrint from './DynamicTablePrint.vue';

const props = defineProps<{
  schema: SchemaV2;
  mode: 'designer' | 'fill' | 'print';
  modelValue?: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
}>();

const fieldRefMap = reactive<Record<string, InstanceType<typeof FieldRenderer>>>();
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
