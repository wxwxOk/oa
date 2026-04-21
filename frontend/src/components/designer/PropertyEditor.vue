<template>
  <div class="property-editor">
    <div v-if="!field" class="flex flex-center" style="height: 100%">
      <span style="font-size: 14px; color: var(--oa-text-tertiary)">点击画布上的字段进行编辑</span>
    </div>

    <template v-else>
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
import { useTemplateStore } from 'src/stores/template';
import type { SchemaV2 } from 'src/types/schema';
import { remainingCols } from './composables/gridUtils';
import { FIELD_TYPES } from './fieldRegistry';

const store = useTemplateStore();

const field = computed(() => store.selectedField);

const fieldMeta = computed(() =>
  field.value ? FIELD_TYPES.find(ft => ft.type === field.value!.type) : null,
);

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
</style>
