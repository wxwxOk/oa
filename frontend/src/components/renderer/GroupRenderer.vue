<template>
  <q-card flat bordered class="group-renderer q-mb-sm">
    <div class="group-header">{{ group.title }}</div>
    <div class="group-body">
      <div v-for="(row, idx) in group.rows" :key="idx" class="grid-row">
        <FieldRenderer
          v-for="field in row.fields"
          :key="field.id"
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
import type { SchemaGroup } from 'src/types/schema';
import FieldRenderer from './FieldRenderer.vue';

const props = defineProps<{
  group: SchemaGroup;
  mode: 'designer' | 'fill' | 'print';
  modelValue?: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
}>();

function emitField(fieldId: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [fieldId]: value });
}
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
