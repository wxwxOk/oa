<template>
  <div>
    <div v-if="preview" class="signature-preview">
      <span>签名区域</span>
    </div>
    <template v-else>
      <canvas ref="canvasRef" class="signature-canvas" />
      <q-btn flat dense size="sm" label="清除签名" @click="clear" class="q-mt-xs" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import SignaturePad from 'signature_pad';

const props = withDefaults(defineProps<{
  preview?: boolean;
  modelValue?: string;
}>(), { preview: true, modelValue: '' });

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let pad: SignaturePad | null = null;

onMounted(() => {
  if (props.preview || !canvasRef.value) return;
  canvasRef.value.width = 400;
  canvasRef.value.height = 200;
  pad = new SignaturePad(canvasRef.value, {
    penColor: '#000',
    backgroundColor: '#fff',
    minWidth: 0.5,
    maxWidth: 2.5,
  });
  if (props.modelValue) {
    pad.fromDataURL(props.modelValue);
  }
});

function clear() {
  pad?.clear();
  emit('update:modelValue', '');
}

function save() {
  if (!pad || pad.isEmpty()) return '';
  const data = pad.toDataURL('image/png');
  emit('update:modelValue', data);
  return data;
}

onBeforeUnmount(() => { pad?.off(); });

defineExpose({ clear, save, isEmpty: () => pad?.isEmpty() ?? true });
</script>

<style scoped>
.signature-preview {
  width: 400px;
  height: 200px;
  border: 1px solid var(--oa-border);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--oa-text-tertiary);
}
.signature-canvas {
  width: 400px;
  height: 200px;
  border: 1px solid var(--oa-border);
  background: #fff;
}
</style>
