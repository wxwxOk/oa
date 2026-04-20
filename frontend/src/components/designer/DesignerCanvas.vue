<template>
  <div class="designer-canvas" @click.self="store.selectField(null)">
    <div v-if="!fields.length" class="empty-state" @click.stop="store.selectField(null)">
      <span style="font-size: 14px; color: var(--oa-text-tertiary)">从左侧拖入字段</span>
    </div>

    <div ref="canvasRef" class="canvas-list" :class="{ 'canvas-empty': !fields.length }">
      <q-card
        v-for="field in fields"
        :key="field.id"
        flat
        bordered
        class="field-card q-pa-md q-mb-sm"
        :class="{ 'field-selected': store.selectedFieldId === field.id }"
        @click.stop="store.selectField(field.id)"
      >
        <div class="row items-center no-wrap q-mb-sm">
          <q-icon name="drag_indicator" size="16px" class="drag-handle cursor-grab" style="color: var(--oa-text-tertiary)" />
          <span class="q-ml-xs" style="font-size: 14px; font-weight: 600">{{ field.label }}</span>
          <q-badge v-if="field.required" color="negative" class="q-ml-xs">*</q-badge>
          <q-space />
          <q-btn flat dense icon="delete" color="negative" size="sm" @click.stop="removeField(field.id)" />
        </div>

        <!-- WYSIWYG preview -->
        <div class="field-preview">
          <template v-if="field.type === 'text'">
            <q-input outlined dense disabled :placeholder="field.placeholder" :label="field.label" />
          </template>
          <template v-else-if="field.type === 'textarea'">
            <q-input outlined dense disabled type="textarea" :placeholder="field.placeholder" />
          </template>
          <template v-else-if="field.type === 'radio'">
            <q-option-group type="radio" disabled :options="mapOptions(field.options)" :model-value="null" />
          </template>
          <template v-else-if="field.type === 'checkbox'">
            <q-option-group type="checkbox" disabled :options="mapOptions(field.options)" :model-value="[]" />
          </template>
          <template v-else-if="field.type === 'date'">
            <q-input outlined dense disabled placeholder="请选择日期">
              <template #append><q-icon name="calendar_today" /></template>
            </q-input>
          </template>
          <template v-else-if="field.type === 'phone'">
            <q-input outlined dense disabled :placeholder="field.placeholder || '请输入手机号'" />
          </template>
          <template v-else-if="field.type === 'signature'">
            <div class="signature-preview">
              <span style="color: var(--oa-text-tertiary)">签名区域</span>
            </div>
            <q-btn flat dense size="sm" label="清除签名" class="q-mt-xs" />
          </template>
        </div>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDraggable } from 'vue-draggable-plus';
import { useTemplateStore, type FormField } from 'src/stores/template';

const GROUP_NAME = 'designer';
const store = useTemplateStore();
const canvasRef = ref<HTMLElement | null>(null);

const fields = computed({
  get: () => store.current?.schema ?? [],
  set: (val: FormField[]) => {
    if (store.current) store.current.schema = val;
  },
});

function reindex() {
  fields.value.forEach((f, i) => (f.sort = i));
}

useDraggable(canvasRef, fields, {
  group: { name: GROUP_NAME, pull: false, put: true },
  animation: 150,
  handle: '.drag-handle',
  onEnd: reindex,
  onAdd: reindex,
});

function removeField(id: string) {
  if (!store.current) return;
  store.current.schema = store.current.schema.filter(f => f.id !== id);
  if (store.selectedFieldId === id) store.selectField(null);
  reindex();
}

function mapOptions(opts?: string[]) {
  return (opts ?? []).map(o => ({ label: o, value: o }));
}

watch(() => store.current?.schema.length, reindex);
</script>

<style scoped>
.designer-canvas {
  flex: 1;
  min-width: 400px;
  height: 100%;
  background: var(--oa-bg);
  overflow-y: auto;
  padding: 16px;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  border: 2px dashed var(--oa-border);
  border-radius: 8px;
}
.canvas-list {
  min-height: 100px;
}
.canvas-empty {
  min-height: 0;
}
.field-card {
  border: 1px solid var(--oa-border);
  transition: background 150ms;
  cursor: pointer;
}
.field-card:hover {
  background: var(--oa-hover);
}
.field-selected {
  border: 2px solid var(--oa-focus-ring) !important;
  background: var(--oa-hover);
}
.signature-preview {
  width: 100%;
  max-width: 400px;
  height: 200px;
  border: 1px solid var(--oa-border);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
