<template>
  <div class="designer-page">
    <!-- Toolbar -->
    <div class="designer-toolbar row items-center no-wrap">
      <q-btn flat dense icon="arrow_back" aria-label="返回模板列表" @click="router.push('/templates')" />
      <span class="text-h6 q-ml-sm ellipsis">{{ store.current?.name ?? '' }}</span>
      <q-space />
      <q-btn
        v-if="store.current"
        outline
        color="primary"
        icon="tune"
        label="处理字段"
        aria-label="配置处理字段"
        class="processing-fields-toolbar-btn q-mr-sm"
        :disable="saving"
        @click="processingDialogOpen = true"
      />
      <q-input
        v-if="store.current"
        v-model="watermarkTextDraft"
        class="watermark-input q-mr-sm"
        outlined
        dense
        clearable
        label="分享水印（选填，≤50 字）"
        maxlength="50"
        :disable="saving"
      >
        <q-tooltip>设置后，分享填写页与提交详情将叠加半透明水印（打印和 PDF 不受影响）</q-tooltip>
      </q-input>
      <q-btn flat label="保存设计" :loading="saving" @click="handleSave" />
      <q-btn
        v-if="store.current?.status !== 'PUBLISHED'"
        color="primary"
        label="发布模板"
        class="q-ml-sm"
        @click="handlePublish"
      />
      <q-btn
        v-else
        color="negative"
        label="下线模板"
        class="q-ml-sm"
        @click="handleOffline"
      />
    </div>

    <q-dialog v-model="processingDialogOpen" persistent>
      <q-card class="processing-fields-dialog">
        <q-card-section class="row items-start no-wrap q-gutter-sm">
          <div>
            <div class="text-h6">处理字段</div>
            <div class="text-caption text-grey-7 processing-fields-copy">
              处理字段仅用于内部后续处理，不会覆盖填写者的正式提交内容。
            </div>
          </div>
          <q-space />
          <q-btn v-close-popup flat round icon="close" aria-label="关闭处理字段配置" class="processing-field-icon-btn" />
        </q-card-section>

        <q-separator />

        <q-card-section class="processing-fields-dialog-body">
          <div v-if="processingFields.length === 0" class="processing-fields-empty text-grey-7">
            暂无处理字段。可添加文本、多行文本、日期、单选、多选或手机号字段用于内部运营处理。
          </div>

          <q-list v-else bordered separator class="processing-fields-list">
            <q-item
              v-for="(field, index) in processingFields"
              :key="field.id"
              class="processing-field-item"
            >
              <q-item-section>
                <div class="row q-col-gutter-sm">
                  <q-input
                    v-model="field.label"
                    outlined
                    dense
                    label="字段名称"
                    class="col-12 col-sm-4"
                  />
                  <q-select
                    :model-value="field.type"
                    outlined
                    dense
                    emit-value
                    map-options
                    label="字段类型"
                    class="col-12 col-sm-4"
                    :options="processingFieldTypeOptions"
                    @update:model-value="updateProcessingFieldType(field, $event)"
                  />
                  <q-input
                    v-model="field.placeholder"
                    outlined
                    dense
                    label="占位提示"
                    class="col-12 col-sm-4"
                  />
                </div>

                <div class="row items-center q-gutter-sm q-mt-sm">
                  <q-toggle v-model="field.required" dense label="必填" />
                  <span class="text-caption text-grey-7">
                    {{ processingFieldTypeLabel(field.type) }}
                  </span>
                </div>

                <div v-if="usesProcessingOptions(field)" class="processing-field-options q-mt-sm">
                  <div class="text-caption text-grey-7 q-mb-xs">选项</div>
                  <div
                    v-for="(_, optionIndex) in field.options"
                    :key="`${field.id}-option-${optionIndex}`"
                    class="processing-field-option-row row items-center q-gutter-sm q-mb-xs"
                  >
                    <q-input
                      :model-value="field.options?.[optionIndex] ?? ''"
                      outlined
                      dense
                      label="选项"
                      class="col"
                      @update:model-value="updateProcessingOption(field, optionIndex, $event)"
                    />
                    <q-btn
                      flat
                      round
                      icon="remove_circle_outline"
                      aria-label="删除处理字段选项"
                      class="processing-field-icon-btn"
                      :disable="(field.options?.length ?? 0) <= 1"
                      @click="removeProcessingOption(field, optionIndex)"
                    />
                  </div>
                  <q-btn
                    flat
                    color="primary"
                    icon="add"
                    label="添加选项"
                    class="processing-field-action-btn"
                    @click="addProcessingOption(field)"
                  />
                </div>
              </q-item-section>

              <q-item-section side top>
                <div class="column q-gutter-xs">
                  <q-btn
                    flat
                    round
                    icon="arrow_upward"
                    aria-label="上移处理字段"
                    class="processing-field-icon-btn"
                    :disable="index === 0"
                    @click="moveProcessingField(index, -1)"
                  />
                  <q-btn
                    flat
                    round
                    icon="arrow_downward"
                    aria-label="下移处理字段"
                    class="processing-field-icon-btn"
                    :disable="index === processingFields.length - 1"
                    @click="moveProcessingField(index, 1)"
                  />
                  <q-btn
                    flat
                    round
                    color="negative"
                    icon="delete_outline"
                    aria-label="删除处理字段"
                    class="processing-field-icon-btn"
                    @click="removeProcessingField(index)"
                  />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-separator />

        <q-card-actions align="between" class="processing-fields-actions">
          <q-btn
            flat
            color="primary"
            icon="add"
            label="新增处理字段"
            class="processing-field-action-btn"
            @click="addProcessingField"
          />
          <div class="row items-center q-gutter-sm">
            <q-btn v-close-popup flat label="取消" class="processing-field-action-btn" />
            <q-btn
              color="primary"
              label="保存设计"
              class="processing-field-action-btn"
              :loading="saving"
              @click="handleProcessingSave"
            />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 3-panel layout -->
    <div v-if="loading" class="flex flex-center" style="flex: 1">
      <q-spinner color="primary" size="3em" />
    </div>
    <div v-else class="designer-body row no-wrap">
      <FieldPalette />
      <DesignerCanvas />
      <PropertyEditor />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useTemplateStore } from 'src/stores/template';
import {
  SUPPORTED_PROCESSING_FIELD_TYPES,
  type ArchiveProcessingField,
  type ArchiveProcessingFieldType,
} from 'src/types/approvalArchive';
import { flattenFields } from 'src/types/schema';
import FieldPalette from 'src/components/designer/FieldPalette.vue';
import DesignerCanvas from 'src/components/designer/DesignerCanvas.vue';
import PropertyEditor from 'src/components/designer/PropertyEditor.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const store = useTemplateStore();

const loading = ref(true);
const saving = ref(false);
const processingDialogOpen = ref(false);
const watermarkTextDraft = ref<string>('');
type ProcessingFieldDraft = Omit<ArchiveProcessingField, 'options'> & { options?: string[] };

const templateId = Number(route.params.id);

const processingFieldTypeOptions: Array<{ label: string; value: ArchiveProcessingFieldType }> = [
  { label: '文本', value: 'text' },
  { label: '多行文本', value: 'textarea' },
  { label: '日期', value: 'date' },
  { label: '单选', value: 'radio' },
  { label: '多选', value: 'checkbox' },
  { label: '手机号', value: 'phone' },
];

const processingFields = computed(() => ensureProcessingFields());

onMounted(async () => {
  try {
    await store.fetchOne(templateId);
    ensureProcessingFields();
    watermarkTextDraft.value = store.current?.watermarkText ?? '';
  } catch {
    $q.notify({ type: 'negative', message: '模板加载失败' });
    router.push('/templates');
  } finally {
    loading.value = false;
  }
});

function normalizeWatermarkDraft(): string | null {
  const raw = (watermarkTextDraft.value ?? '').trim();
  return raw ? raw.slice(0, 50) : null;
}

function isProcessingFieldType(value: unknown): value is ArchiveProcessingFieldType {
  return (
    typeof value === 'string' &&
    SUPPORTED_PROCESSING_FIELD_TYPES.includes(value as ArchiveProcessingFieldType)
  );
}

function usesProcessingOptionsType(type: ArchiveProcessingFieldType) {
  return type === 'radio' || type === 'checkbox';
}

function usesProcessingOptions(field: ProcessingFieldDraft) {
  return usesProcessingOptionsType(field.type);
}

function processingFieldTypeLabel(type: ArchiveProcessingFieldType) {
  return processingFieldTypeOptions.find((option) => option.value === type)?.label ?? '文本';
}

function createProcessingFieldId() {
  return `processing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toProcessingOptionValues(options: ArchiveProcessingField['options']): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => (typeof option === 'string' ? option : option.value))
    .filter((option): option is string => typeof option === 'string')
    .map((option) => option.trim())
    .filter(Boolean);
}

function toEditableProcessingOptionValues(options: ArchiveProcessingField['options']): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => (typeof option === 'string' ? option : option.value))
    .filter((option): option is string => typeof option === 'string');
}

function ensureProcessingFields(): ProcessingFieldDraft[] {
  if (!store.current) return [];
  if (!Array.isArray(store.current.processingSchema)) {
    store.current.processingSchema = [];
  }

  const fields = store.current.processingSchema as ProcessingFieldDraft[];
  for (const field of fields) {
    if (!isProcessingFieldType(field.type)) {
      field.type = 'text';
    }
    if (usesProcessingOptions(field)) {
      const options = toEditableProcessingOptionValues(field.options);
      field.options = options.length > 0 ? options : ['选项一', '选项二'];
    } else {
      delete field.options;
    }
  }
  return fields;
}

function addProcessingField() {
  const fields = ensureProcessingFields();
  fields.push({
    id: createProcessingFieldId(),
    label: `处理字段 ${fields.length + 1}`,
    type: 'text',
    required: false,
    placeholder: '',
  });
}

function removeProcessingField(index: number) {
  ensureProcessingFields().splice(index, 1);
}

function moveProcessingField(index: number, offset: -1 | 1) {
  const fields = ensureProcessingFields();
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= fields.length) return;
  const [field] = fields.splice(index, 1);
  fields.splice(nextIndex, 0, field);
}

function updateProcessingFieldType(field: ProcessingFieldDraft, value: unknown) {
  if (!isProcessingFieldType(value)) return;
  field.type = value;
  if (usesProcessingOptions(field)) {
    field.options = toEditableProcessingOptionValues(field.options);
    if (field.options.length === 0) {
      field.options = ['选项一', '选项二'];
    }
  } else {
    delete field.options;
  }
}

function addProcessingOption(field: ProcessingFieldDraft) {
  if (!usesProcessingOptions(field)) return;
  field.options = toEditableProcessingOptionValues(field.options);
  field.options.push(`选项 ${field.options.length + 1}`);
}

function updateProcessingOption(field: ProcessingFieldDraft, index: number, value: unknown) {
  if (!usesProcessingOptions(field)) return;
  field.options = toEditableProcessingOptionValues(field.options);
  field.options[index] = typeof value === 'string' ? value : '';
}

function removeProcessingOption(field: ProcessingFieldDraft, index: number) {
  if (!usesProcessingOptions(field)) return;
  field.options = toEditableProcessingOptionValues(field.options);
  if (field.options.length <= 1) return;
  field.options.splice(index, 1);
}

function validateProcessingSchema() {
  const fields = ensureProcessingFields();
  for (const [index, field] of fields.entries()) {
    if (!field.label.trim()) {
      $q.notify({ type: 'negative', message: `第 ${index + 1} 个处理字段缺少名称` });
      return false;
    }
    if (!isProcessingFieldType(field.type)) {
      $q.notify({ type: 'negative', message: `第 ${index + 1} 个处理字段类型不支持` });
      return false;
    }
    if (usesProcessingOptions(field) && toProcessingOptionValues(field.options).length === 0) {
      $q.notify({ type: 'negative', message: `第 ${index + 1} 个处理字段至少需要一个选项` });
      return false;
    }
  }
  return true;
}

function normalizeProcessingSchemaForSave(): ArchiveProcessingField[] {
  return ensureProcessingFields().map((field) => {
    const normalized: ArchiveProcessingField = {
      id: field.id || createProcessingFieldId(),
      label: field.label.trim(),
      type: field.type,
    };
    if (field.required === true) {
      normalized.required = true;
    }
    const placeholder = field.placeholder?.trim();
    if (placeholder) {
      normalized.placeholder = placeholder;
    }
    if (usesProcessingOptions(field)) {
      normalized.options = toProcessingOptionValues(field.options);
    }
    return normalized;
  });
}

async function saveTemplate() {
  if (!store.current) return;
  saving.value = true;
  try {
    const prev = store.current.schemaVersion;
    const processingSchema = normalizeProcessingSchemaForSave();
    const fields = flattenFields(store.current.schema);
    const hasFullIdentityFields = fields.some(f => f.type === 'name') && fields.some(f => f.type === 'phone');
    const wasRequireIdentity = store.current.requireIdentity;
    await store.update(templateId, {
      schema: store.current.schema,
      processingSchema,
      ...(hasFullIdentityFields ? { requireIdentity: false } : {}),
      watermarkText: normalizeWatermarkDraft(),
    });
    $q.notify({ type: 'positive', message: '保存成功' });
    if (hasFullIdentityFields && wasRequireIdentity) {
      $q.notify({ type: 'info', message: '已切换为字段化身份收集，旧版全局开关已停用' });
    }
    if (store.current.schemaVersion > prev) {
      $q.notify({ type: 'info', message: `模板已更新至 v${store.current.schemaVersion}` });
    }
  } catch {
    $q.notify({ type: 'negative', message: '保存失败' });
  } finally {
    saving.value = false;
  }
}

async function handleSave() {
  if (!store.current) return;
  if (!validateProcessingSchema()) return;
  await saveTemplate();
}

async function handleProcessingSave() {
  await handleSave();
}

function handlePublish() {
  if (!store.current) return;
  $q.dialog({
    title: '发布模板',
    message: '发布后模板可用于生成分享链接。确认发布？',
    cancel: true,
    ok: { label: '确认发布', color: 'primary' },
  }).onOk(async () => {
    try {
      await store.changeStatus(templateId, 'publish');
      $q.notify({ type: 'positive', message: '已发布' });
    } catch {
      $q.notify({ type: 'negative', message: '发布失败' });
    }
  });
}

function handleOffline() {
  $q.dialog({
    title: '下线模板',
    message: '下线后已有分享链接将无法填写。确认下线？',
    cancel: true,
    ok: { label: '确认下线', color: 'warning' },
  }).onOk(async () => {
    try {
      await store.changeStatus(templateId, 'offline');
      $q.notify({ type: 'positive', message: '已下线' });
    } catch {
      $q.notify({ type: 'negative', message: '下线失败' });
    }
  });
}
</script>

<style scoped>
.designer-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
}
.designer-toolbar {
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--oa-border);
  flex-shrink: 0;
}
.processing-fields-toolbar-btn {
  min-height: 44px;
}
.designer-body {
  flex: 1;
  overflow: hidden;
}
.processing-fields-dialog {
  width: min(960px, calc(100vw - 32px));
  max-width: 960px;
  border-radius: 8px;
}
.processing-fields-dialog-body {
  max-height: min(68vh, 680px);
  overflow: auto;
}
.processing-fields-copy,
.processing-fields-empty,
.processing-field-item {
  overflow-wrap: anywhere;
}
.processing-fields-empty {
  padding: 24px 0;
  line-height: 1.5;
}
.processing-field-item {
  align-items: flex-start;
  min-height: 56px;
  padding: 16px;
}
.processing-field-option-row {
  min-height: 44px;
}
.processing-field-icon-btn {
  min-width: 44px;
  min-height: 44px;
}
.processing-field-action-btn {
  min-height: 44px;
}
.processing-fields-actions {
  gap: 8px;
  padding: 12px 16px;
}
@media (max-width: 900px) {
  .processing-fields-toolbar-btn {
    min-width: 44px;
    padding: 0 8px;
  }
}
</style>
