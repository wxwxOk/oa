<template>
  <q-dialog :model-value="modelValue" position="bottom"
            @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="width: 100%; border-radius: 16px 16px 0 0">
      <div class="flex flex-center q-pt-sm q-pb-xs">
        <div style="width: 40px; height: 4px; border-radius: 2px; background: var(--oa-border)"></div>
      </div>
      <q-card-section class="q-gutter-md">
        <q-input v-model="local.keyword" outlined dense label="搜索" clearable />
        <q-select v-if="deptOptions.length > 0" v-model="local.departmentId" :options="deptOptions"
                  label="部门" outlined dense emit-value map-options clearable />
        <q-btn-toggle v-model="local.status" toggle-color="primary" flat bordered
                      :options="[{ label: '全部', value: '' }, { label: '启用', value: 'ACTIVE' }, { label: '禁用', value: 'DISABLED' }]"
                      class="full-width" />
      </q-card-section>
      <q-card-actions>
        <q-btn flat label="重置筛选" @click="onReset" />
        <q-space />
        <q-btn color="primary" label="应用筛选" @click="onApply" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  keyword: string;
  departmentId: number | null;
  status: string;
  deptOptions: Array<{ label: string; value: number }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  apply: [filters: { keyword: string; departmentId: number | null; status: string }];
  reset: [];
}>();

const local = reactive({ keyword: '', departmentId: null as number | null, status: '' });

// 打开时同步父组件筛选值
watch(() => props.modelValue, (open) => {
  if (open) {
    local.keyword = props.keyword;
    local.departmentId = props.departmentId;
    local.status = props.status;
  }
});

function onApply() {
  emit('apply', { keyword: local.keyword, departmentId: local.departmentId, status: local.status });
}

function onReset() {
  local.keyword = '';
  local.departmentId = null;
  local.status = '';
  emit('reset');
  emit('update:modelValue', false);
}
</script>
