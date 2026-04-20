<template>
  <div class="form-field q-mb-md">
    <!-- 字段标签 -->
    <div class="field-label q-mb-xs" style="font-size: 14px; font-weight: 600; line-height: 1.4">
      {{ field.label }}
      <span v-if="field.required" style="color: #DC2626"> *</span>
    </div>

    <!-- text -->
    <q-input
      v-if="field.type === 'text'"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      outlined
      :placeholder="field.placeholder"
      :rules="field.required ? [requiredRule] : []"
    />

    <!-- textarea -->
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

    <!-- radio -->
    <template v-else-if="field.type === 'radio'">
      <q-option-group
        type="radio"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :options="mapOptions(field.options)"
      />
      <div v-if="field.required && radioError" class="text-negative text-caption q-mt-xs">请选择一项</div>
    </template>

    <!-- checkbox -->
    <template v-else-if="field.type === 'checkbox'">
      <q-option-group
        type="checkbox"
        :model-value="modelValue || []"
        @update:model-value="$emit('update:modelValue', $event)"
        :options="mapOptions(field.options)"
      />
      <div v-if="field.required && checkboxError" class="text-negative text-caption q-mt-xs">请至少选择一项</div>
    </template>

    <!-- date -->
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

    <!-- phone -->
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

    <!-- signature -->
    <template v-else-if="field.type === 'signature'">
      <SignatureField
        ref="sigRef"
        :preview="false"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
      />
      <div v-if="field.required && sigError" class="text-negative text-caption q-mt-xs">请签名</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FormField } from 'src/stores/template';
import SignatureField from 'src/components/designer/fields/SignatureField.vue';

defineProps<{
  field: FormField;
  modelValue: any;
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

// 暴露 validate 方法供父组件调用
function validate(value: any, field: FormField): boolean {
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
  return true; // QInput 自带 rules 验证
}

// 暴露签名保存方法
function saveSignature() {
  return sigRef.value?.save?.() ?? '';
}

defineExpose({ validate, saveSignature, sigRef });
</script>
