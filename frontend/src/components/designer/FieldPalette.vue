<template>
  <div class="field-palette">
    <q-expansion-item label="基础字段" default-opened header-class="text-weight-medium">
      <div ref="basicRef" class="palette-group">
        <div
          v-for="ft in basicFields"
          :key="ft.type"
          class="palette-item"
        >
          <q-icon :name="ft.icon" size="20px" style="color: var(--oa-text-secondary)" />
          <span class="palette-label">{{ ft.label }}</span>
        </div>
      </div>
    </q-expansion-item>

    <q-expansion-item label="特殊字段" default-opened header-class="text-weight-medium">
      <div ref="specialRef" class="palette-group">
        <div
          v-for="ft in specialFields"
          :key="ft.type"
          class="palette-item"
        >
          <q-icon :name="ft.icon" size="20px" style="color: var(--oa-text-secondary)" />
          <span class="palette-label">{{ ft.label }}</span>
        </div>
      </div>
    </q-expansion-item>

    <q-expansion-item label="结构" default-opened header-class="text-weight-medium">
      <div ref="structureRef" class="palette-group">
        <div
          v-for="si in structureList"
          :key="si.type"
          class="palette-item"
        >
          <q-icon :name="si.icon" size="20px" style="color: var(--oa-text-secondary)" />
          <span class="palette-label">{{ si.label }}</span>
        </div>
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDraggable } from 'vue-draggable-plus';
import { FIELD_GROUPS, structureItems, type FieldTypeDef, type StructureItemDef } from './fieldRegistry';
import type { SchemaField } from 'src/types/schema';
import { uuid } from 'src/utils/uuid';

const GROUP_NAME = 'fields';

const basicRef = ref<HTMLElement | null>(null);
const specialRef = ref<HTMLElement | null>(null);
const structureRef = ref<HTMLElement | null>(null);

const basicFields = ref([...FIELD_GROUPS.basic.types]);
const specialFields = ref([...FIELD_GROUPS.special.types]);
const structureList = ref([...structureItems]);

function cloneField(item: FieldTypeDef): SchemaField {
  return {
    id: uuid(),
    type: item.type,
    label: item.label,
    required: item.defaultProps.required ?? false,
    colSpan: item.defaultProps.colSpan ?? 12,
    placeholder: item.defaultProps.placeholder,
    options: item.defaultProps.options ? [...item.defaultProps.options] : undefined,
  };
}

useDraggable(basicRef, basicFields, {
  group: { name: GROUP_NAME, pull: 'clone', put: false },
  sort: false,
  clone: cloneField,
});

useDraggable(specialRef, specialFields, {
  group: { name: GROUP_NAME, pull: 'clone', put: false },
  sort: false,
  clone: cloneField,
});

function cloneStructure(item: StructureItemDef) {
  return structureItems.find(s => s.type === item.type)?.create() ?? item;
}

useDraggable(structureRef, structureList, {
  group: { name: 'items', pull: 'clone', put: false },
  sort: false,
  clone: cloneStructure,
});
</script>

<style scoped>
.field-palette {
  width: 240px;
  min-width: 240px;
  height: 100%;
  background: var(--oa-surface);
  border-right: 1px solid var(--oa-border);
  overflow-y: auto;
}
.palette-group {
  padding: 0 8px 8px;
}
.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 8px;
  border-radius: 4px;
  cursor: grab;
  transition: background 150ms;
}
.palette-item:hover {
  background: var(--oa-hover);
}
.palette-item:active {
  cursor: grabbing;
}
.palette-label {
  font-size: 14px;
}
</style>
