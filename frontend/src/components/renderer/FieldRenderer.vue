<template>
  <div class="field-renderer" :class="'mode-' + mode">
    <div class="field-label">
      {{ field.label }}
      <span v-if="field.required && mode !== 'print'" class="required-mark">*</span>
    </div>

    <!-- Print mode: plain text -->
    <template v-if="mode === 'print'">
      <template v-if="field.type === 'signature'">
        <img v-if="modelValue" :src="modelValue" style="max-height: 80px; object-fit: contain" />
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
      <q-input v-if="field.type === 'text' || field.type === 'phone'" outlined dense disabled :placeholder="field.placeholder" />
      <q-input v-else-if="field.type === 'textarea'" outlined dense disabled type="textarea" :placeholder="field.placeholder" />
      <q-option-group v-else-if="field.type === 'radio'" type="radio" disabled :options="mapOptions(field.options)" :model-value="null" />
      <q-option-group v-else-if="field.type === 'checkbox'" type="checkbox" disabled :options="mapOptions(field.options)" :model-value="[]" />
      <q-input v-else-if="field.type === 'date'" outlined dense disabled placeholder="请选择日期">
        <template #append><q-icon name="calendar_today" /></template>
      </q-input>
      <div v-else-if="field.type === 'signature'" class="signature-placeholder">签名区域</div>
    </template>

    <!-- Fill mode: interactive inputs -->
    <template v-else>
      <q-input
        v-if="field.type === 'text'"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        outlined
        :placeholder="field.placeholder"
        :rules="field.required ? [requiredRule] : []"
      />
      <q-input
        v-else-if="field.type === 'textarea'"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        outlined
        type="textarea"
        rows="3"
        :placeholder="field.placeholder"
        :rules="field.required ? [requiredRule] : []"
      />
      <template v-else-if="field.type === 'radio'">
        <q-option-group
          type="radio"
          :model-value="modelValue"
          @update:model-value="$emit('update:modelValue', $event)"
          :options="mapOptions(field.options)"
        />
        <div v-if="field.required && radioError" class="text-negative text-caption q-mt-xs">请选择一项</div>
      </template>
      <template v-else-if="field.type === 'checkbox'">
        <q-option-group
          type="checkbox"
          :model-value="modelValue || []"
          @update:model-value="$emit('update:modelValue', $event)"
          :options="mapOptions(field.options)"
        />
        <div v-if="field.required && checkboxError" class="text-negative text-caption q-mt-xs">请至少选择一项</div>
      </template>
      <q-input
        v-else-if="field.type === 'date'"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        outlined
        placeholder="请选择日期"
        readonly
        :rules="field.required ? [(v: string) => !!v || '请选择日期'] : []"
      >
        <template #append>
          <q-icon name="calendar_today" class="cursor-pointer">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date
                :model-value="modelValue"
                @update:model-value="$emit('update:modelValue', $event)"
                mask="YYYY-MM-DD"
              />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <q-input
        v-else-if="field.type === 'phone'"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        outlined
        type="tel"
        mask="###########"
        :placeholder="field.placeholder || '请输入手机号'"
        :rules="field.required ? [(v: string) => /^1\d{10}$/.test(v) || '请输入有效手机号'] : []"
      />
      <template v-else-if="field.type === 'signature'">
        <SignatureField
          ref="sigRef"
          :preview="false"
          :model-value="modelValue"
          @update:model-value="$emit('update:modelValue', $event)"
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

defineProps<{
  field: SchemaField;
  mode: 'designer' | 'fill' | 'print';
  modelValue?: any;
}>();

defineEmits<{
  'update:modelValue': [value: any];
}>();

const sigRef = ref<InstanceType<typeof SignatureField> | null>(null);
const requiredRule = (v: string) => !!v?.trim() || '此项为必填';
const radioError = ref(false);
const checkboxError = ref(false);
const sigError = ref(false);

function mapOptions(opts?: string[]) {
  return (opts ?? []).map(o => ({ label: o, value: o }));
}

function validate(value: any, field: SchemaField): boolean {
  if (!field.required) return true;
  if (field.type === 'radio') {
    radioError.value = value == null;
    return !radioError.value;
  }
  if (field.type === 'checkbox') {
    checkboxError.value = !value?.length;
    return !checkboxError.value;
  }
  if (field.type === 'signature') {
    sigError.value = !value;
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
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 4px;
}
.required-mark {
  color: #DC2626;
}
.print-value {
  font-size: 14px;
  line-height: 1.5;
  color: var(--oa-text-primary);
}
.print-value.empty {
  color: var(--oa-text-tertiary);
}
.signature-placeholder {
  height: 80px;
  border: 1px dashed var(--oa-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oa-text-tertiary);
  font-size: 14px;
}
</style>
