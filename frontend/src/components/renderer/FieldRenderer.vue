<template>
  <div class="field-renderer" :class="'mode-' + mode">
    <div class="field-label">
      {{ field.label }}
      <span v-if="field.required && mode !== 'print'" class="required-mark">*</span>
      <q-btn
        v-if="field.remark?.trim() && mode !== 'print'"
        flat dense round
        size="xs"
        icon="help_outline"
        class="remark-btn"
        @click.stop
      >
        <q-popup-proxy>
          <q-card class="remark-card">
            <q-card-section class="remark-content">{{ field.remark }}</q-card-section>
          </q-card>
        </q-popup-proxy>
      </q-btn>
    </div>

    <!-- Print mode: plain text -->
    <template v-if="mode === 'print'">
      <template v-if="field.type === 'signature'">
        <img v-if="modelValue" :src="modelValue" style="max-height: 80px; object-fit: contain; border: 1px solid #000" />
        <span v-else class="print-value empty">—</span>
      </template>
      <template v-else-if="field.type === 'checkbox'">
        <span class="print-value" :class="{ empty: !modelValue?.length }">
          {{ Array.isArray(modelValue) && modelValue.length ? modelValue.join('、') : '—' }}
        </span>
      </template>
      <template v-else>
        <span class="print-value" :class="{ empty: !modelValue }">
          {{ modelValue || '—' }}
        </span>
      </template>
    </template>

    <!-- Designer mode: disabled inputs -->
    <template v-else-if="mode === 'designer'">
      <q-input v-if="field.type === 'text' || field.type === 'phone' || field.type === 'name'" outlined dense disabled :placeholder="field.placeholder" />
      <q-input v-else-if="field.type === 'textarea'" outlined dense disabled type="textarea" :placeholder="field.placeholder" />
      <q-option-group v-else-if="field.type === 'radio'" type="radio" disabled :options="mapOptions(field.options)" :model-value="null" />
      <q-option-group v-else-if="field.type === 'checkbox'" type="checkbox" disabled :options="mapOptions(field.options)" :model-value="[]" />
      <q-input v-else-if="field.type === 'date'" outlined dense disabled placeholder="请选择日期">
        <template #append><q-icon name="calendar_today" /></template>
      </q-input>
      <SignatureField v-else-if="field.type === 'signature'" :preview="true" />
    </template>

    <!-- Fill mode: interactive inputs -->
    <template v-else>
      <q-input
        v-if="field.type === 'text'"
        :model-value="modelValue"
        @update:model-value="onModelUpdate($event)"
        outlined
        :placeholder="field.placeholder"
        :rules="field.required ? [requiredRule] : []"
        :error="!!imperativeError"
        :error-message="imperativeError"
      />
      <q-input
        v-else-if="field.type === 'name'"
        :model-value="modelValue"
        @update:model-value="onModelUpdate($event)"
        outlined
        autocomplete="name"
        maxlength="32"
        :placeholder="field.placeholder"
        :rules="field.required ? [requiredRule] : []"
        :error="!!imperativeError"
        :error-message="imperativeError"
      />
      <q-input
        v-else-if="field.type === 'textarea'"
        :model-value="modelValue"
        @update:model-value="onModelUpdate($event)"
        outlined
        type="textarea"
        rows="3"
        :placeholder="field.placeholder"
        :rules="field.required ? [requiredRule] : []"
        :error="!!imperativeError"
        :error-message="imperativeError"
      />
      <template v-else-if="field.type === 'radio'">
        <q-option-group
          type="radio"
          :model-value="modelValue"
          @update:model-value="onModelUpdate($event)"
          :options="mapOptions(field.options)"
        />
        <div v-if="field.required && radioError" class="text-negative text-caption q-mt-xs">请选择一项</div>
      </template>
      <template v-else-if="field.type === 'checkbox'">
        <q-option-group
          type="checkbox"
          :model-value="modelValue || []"
          @update:model-value="onModelUpdate($event)"
          :options="mapOptions(field.options)"
        />
        <div v-if="field.required && checkboxError" class="text-negative text-caption q-mt-xs">请至少选择一项</div>
      </template>
      <q-input
        v-else-if="field.type === 'date'"
        :model-value="modelValue"
        @update:model-value="onModelUpdate($event)"
        outlined
        placeholder="请选择日期"
        readonly
        :rules="field.required ? [(v: string) => !!v || '请选择日期'] : []"
        :error="!!imperativeError"
        :error-message="imperativeError"
      >
        <template #append>
          <q-icon name="calendar_today" class="cursor-pointer">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date
                :model-value="modelValue"
                @update:model-value="onModelUpdate($event)"
                mask="YYYY-MM-DD"
              />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-input
        v-else-if="field.type === 'phone'"
        :model-value="modelValue"
        @update:model-value="onModelUpdate($event)"
        outlined
        type="tel"
        autocomplete="tel"
        mask="###########"
        :placeholder="field.placeholder || '请输入手机号'"
        :rules="[
          ...(field.required ? [requiredRule] : []),
          (v: string) => !v || /^1\d{10}$/.test(v) || '请输入有效手机号',
        ]"
        :error="!!imperativeError"
        :error-message="imperativeError"
      />
      <template v-else-if="field.type === 'signature'">
        <SignatureField
          ref="sigRef"
          :preview="false"
          :model-value="modelValue"
          @update:model-value="onModelUpdate($event)"
        />
        <div v-if="field.required && sigError" class="text-negative text-caption q-mt-xs">请签名</div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { SchemaField } from 'src/types/schema';
import SignatureField from 'src/components/designer/fields/SignatureField.vue';

const props = defineProps<{
  field: SchemaField;
  mode: 'designer' | 'fill' | 'print';
  modelValue?: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const sigRef = ref<InstanceType<typeof SignatureField> | null>(null);
const requiredRule = (v: string) => !!v?.trim() || '此项为必填';
const imperativeError = ref('');
const radioError = ref(false);
const checkboxError = ref(false);
const sigError = ref(false);

function mapOptions(opts?: string[]) {
  return (opts ?? []).map(o => ({ label: o, value: o }));
}

function clearErrors() {
  imperativeError.value = '';
  radioError.value = false;
  checkboxError.value = false;
  sigError.value = false;
}

function hasTrimmedString(value: any): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

function hasNonEmptyValue(value: any): boolean {
  return value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');
}

function setInputError(message: string): boolean {
  imperativeError.value = message;
  return false;
}

function isFieldValueValid(value: any, field: SchemaField): boolean {
  if (field.type === 'phone') {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) return !field.required;
    return /^1\d{10}$/.test(trimmed);
  }

  if (!field.required) return true;

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'name') return hasTrimmedString(value);
  if (field.type === 'date') return hasNonEmptyValue(value);
  if (field.type === 'radio') return hasNonEmptyValue(value);
  if (field.type === 'checkbox') return Array.isArray(value) && value.length > 0;
  if (field.type === 'signature') return hasTrimmedString(value);

  return true;
}

function onModelUpdate(value: any) {
  emit('update:modelValue', value);
  if (isFieldValueValid(value, props.field)) clearErrors();
}

function validate(value: any, field: SchemaField): boolean {
  clearErrors();

  // phone：无论是否必填，只要有输入就必须校验格式
  if (field.type === 'phone') {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) return field.required ? setInputError('此项为必填') : true;
    if (!/^1\d{10}$/.test(trimmed)) return setInputError('请输入有效手机号');
    return true;
  }

  if (!field.required) return true;

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'name') {
    if (!hasTrimmedString(value)) return setInputError('此项为必填');
    return true;
  }

  if (field.type === 'date') {
    if (!hasNonEmptyValue(value)) return setInputError('请选择日期');
    return true;
  }

  if (field.type === 'radio') {
    radioError.value = !hasNonEmptyValue(value);
    return !radioError.value;
  }

  if (field.type === 'checkbox') {
    checkboxError.value = !Array.isArray(value) || value.length === 0;
    return !checkboxError.value;
  }

  if (field.type === 'signature') {
    const saved = saveSignature();
    sigError.value = !hasTrimmedString(saved || value);
    return !sigError.value;
  }

  return true;
}

function saveSignature() {
  return sigRef.value?.save?.() ?? '';
}

defineExpose({ validate, saveSignature, sigRef });
</script>

<style scoped>
.field-label {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 4px;
}
.required-mark {
  color: #DC2626;
}
.remark-btn {
  color: var(--oa-text-tertiary);
}
.remark-card {
  max-width: min(320px, calc(100vw - 32px));
}
.remark-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
}
.print-value {
  font-size: 14px;
  line-height: 1.5;
  color: var(--oa-text-primary);
}
.print-value.empty {
  color: var(--oa-text-tertiary);
}
</style>
