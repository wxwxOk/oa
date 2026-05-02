<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="isMobile"
    :transition-show="isMobile ? 'slide-up' : 'scale'"
    :transition-hide="isMobile ? 'slide-down' : 'scale'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="visit-form-dialog" :style="isMobile ? '' : 'width: 860px; max-width: calc(100vw - 32px)'">
      <q-form ref="formRef" @submit.prevent="submitForm">
        <q-toolbar class="bg-primary text-white">
          <q-toolbar-title>{{ dialogTitle }}</q-toolbar-title>
          <q-btn flat round dense icon="close" aria-label="关闭到访弹窗" @click="closeDialog">
            <q-tooltip>关闭</q-tooltip>
          </q-btn>
        </q-toolbar>

        <q-card-section class="q-gutter-lg visit-form-body">
          <section v-for="group in fieldGroups" :key="group.title" class="visit-form-group">
            <div class="text-subtitle2 q-mb-sm">{{ group.title }}</div>
            <div class="row q-col-gutter-md">
              <div v-for="field in group.fields" :key="field.key" :class="field.wide ? 'col-12' : 'col-12 col-sm-6'">
                <q-input
                  v-model="form[field.key]"
                  outlined
                  dense
                  :readonly="isDetail"
                  :type="field.type === 'textarea' ? 'textarea' : field.type === 'number' ? 'number' : 'text'"
                  :label="field.label"
                  :autogrow="field.type === 'textarea'"
                  :rules="fieldRules(field.key)"
                >
                  <template v-if="field.type === 'date' && !isDetail" #append>
                    <q-icon name="event" class="cursor-pointer" :aria-label="`选择${field.label}`">
                      <q-tooltip>选择{{ field.label }}</q-tooltip>
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date v-model="form[field.key]" mask="YYYY-MM-DD" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </section>

          <section v-if="isDetail" class="visit-form-group">
            <div class="text-subtitle2 q-mb-sm">记录信息</div>
            <div class="row q-col-gutter-md">
              <div v-for="item in metaRows" :key="item.key" class="col-12 col-sm-4">
                <q-input :model-value="item.value" outlined dense readonly :label="item.label" />
              </div>
            </div>
          </section>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right" class="visit-dialog-actions q-pa-md">
          <q-btn flat label="取消" @click="closeDialog" />
          <q-btn
            v-if="!isDetail"
            color="primary"
            type="submit"
            label="保存"
            :loading="actionLoading"
            :disable="actionLoading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useResponsive } from 'src/composables/useResponsive';
import { formatVisitDate, type VisitDetail, type VisitWritePayload } from 'src/types/visit';

type DialogMode = 'create' | 'edit' | 'detail';
type VisitFieldKey = keyof VisitWritePayload;

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    mode: DialogMode;
    visit?: VisitDetail | null;
    actionLoading?: boolean;
  }>(),
  { visit: null, actionLoading: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [payload: VisitWritePayload];
}>();

const { isMobile } = useResponsive();
const formRef = ref<{ validate: () => Promise<boolean> | boolean } | null>(null);
const isDetail = computed(() => props.mode === 'detail');

const form = reactive<VisitWritePayload>(emptyPayload());

const dialogTitle = computed(() => {
  if (props.mode === 'create') return '新建到访记录';
  if (props.mode === 'edit') return '编辑到访记录';
  return '到访记录详情';
});

const fieldGroups: Array<{
  title: string;
  fields: Array<{ key: VisitFieldKey; label: string; type?: 'text' | 'number' | 'date' | 'textarea'; wide?: boolean }>;
}> = [
  {
    title: '学员基础信息',
    fields: [
      { key: 'name', label: '姓名' },
      { key: 'age', label: '年龄', type: 'number' },
      { key: 'education', label: '学历' },
      { key: 'gender', label: '性别' },
    ],
  },
  {
    title: '渠道与接待',
    fields: [
      { key: 'channelPartner', label: '渠道商' },
      { key: 'consultant', label: '咨询师' },
      { key: 'receptionist', label: '接待人' },
      { key: 'receptionDate', label: '接待日期', type: 'date' },
      { key: 'receptionStatus', label: '接待状态' },
    ],
  },
  {
    title: '跟进状态',
    fields: [
      { key: 'consultationStatus', label: '咨询后状态' },
      { key: 'statusCategory', label: '状态类别' },
      { key: 'statusDescription', label: '状态说明', type: 'textarea', wide: true },
    ],
  },
  {
    title: '试听与解决方案',
    fields: [
      { key: 'trialStatus', label: '试听课后状态' },
      { key: 'trialDate', label: '试听课时间', type: 'date' },
      { key: 'solution', label: '解决方案', type: 'textarea', wide: true },
    ],
  },
];

const metaRows = computed(() => [
  { key: 'creator', label: '创建人', value: creatorLabel(props.visit?.creator) },
  { key: 'createdAt', label: '创建时间', value: formatDateTime(props.visit?.createdAt) },
  { key: 'updatedAt', label: '更新时间', value: formatDateTime(props.visit?.updatedAt) },
]);

watch(
  () => [props.modelValue, props.visit, props.mode] as const,
  () => {
    if (!props.modelValue) return;
    Object.assign(form, props.visit ? payloadFromVisit(props.visit) : emptyPayload());
  },
  { immediate: true },
);

function emptyPayload(): VisitWritePayload {
  return {
    name: '',
    age: null,
    education: null,
    gender: null,
    channelPartner: null,
    consultant: null,
    receptionStatus: null,
    receptionist: null,
    receptionDate: null,
    consultationStatus: null,
    statusCategory: null,
    statusDescription: null,
    trialStatus: null,
    solution: null,
    trialDate: null,
  };
}

function toDateInput(value?: string | null) {
  if (!value) return null;
  return formatVisitDate(value);
}

function payloadFromVisit(row: VisitDetail): VisitWritePayload {
  return {
    name: row.name,
    age: row.age,
    education: row.education,
    gender: row.gender,
    channelPartner: row.channelPartner,
    consultant: row.consultant,
    receptionStatus: row.receptionStatus,
    receptionist: row.receptionist,
    receptionDate: toDateInput(row.receptionDate),
    consultationStatus: row.consultationStatus,
    statusCategory: row.statusCategory,
    statusDescription: row.statusDescription,
    trialStatus: row.trialStatus,
    solution: row.solution,
    trialDate: toDateInput(row.trialDate),
  };
}

function fieldRules(key: VisitFieldKey) {
  if (isDetail.value) return [];
  if (key === 'name') return [(value: string) => !!value?.trim() || '姓名不能为空'];
  if (key === 'age') return [(value: unknown) => isBlank(value) || Number.isInteger(Number(value)) || '年龄必须为整数'];
  return [];
}

function isBlank(value: unknown) {
  return value === null || value === undefined || value === '';
}

function normalizeAge(value: unknown) {
  if (isBlank(value)) return null;
  return Number(value);
}

async function submitForm() {
  if (isDetail.value) {
    closeDialog();
    return;
  }
  const valid = await formRef.value?.validate();
  if (!valid) return;
  emit('submit', { ...form, age: normalizeAge(form.age) });
}

function closeDialog() {
  emit('update:modelValue', false);
}

function creatorLabel(creator?: VisitDetail['creator']) {
  if (!creator) return '-';
  return creator.realName || creator.name || creator.username || '-';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}
</script>

<style scoped>
.visit-form-body {
  max-height: min(70vh, 720px);
  overflow: auto;
}

.visit-form-group {
  border: 1px solid var(--oa-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--oa-surface);
}

.visit-dialog-actions .q-btn {
  min-height: 44px;
}

@media (max-width: 1023px) {
  .visit-form-body {
    max-height: none;
  }

  .visit-form-group {
    border-left: 0;
    border-right: 0;
    border-radius: 0;
  }
}
</style>
