<template>
  <div class="signature-pad">
    <div class="signature-label">手写签名</div>
    <div class="signature-trigger" tabindex="0" @click="openDialog" @keyup.enter="openDialog" @keyup.space.prevent="openDialog">
      <img v-if="modelValue" :src="modelValue" class="signature-preview" alt="手写签名预览" />
      <template v-else>
        <q-icon name="edit" size="24px" color="grey-6" />
        <span>点击签名</span>
      </template>
    </div>

    <q-dialog v-model="dialogOpen" persistent :maximized="isMobile" @show="initCanvas" @hide="destroyPad">
      <q-card :class="['signature-dialog', { mobile: isMobile }]">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">手写签名</div>
          <q-space />
          <q-btn flat dense label="清除" @click="clearDraft" />
          <q-btn flat dense round icon="close" @click="dialogOpen = false" />
        </q-card-section>
        <q-card-section ref="hostRef" class="canvas-host">
          <canvas ref="canvasRef" class="signature-canvas" />
        </q-card-section>
        <q-card-actions align="right" class="dialog-actions">
          <q-btn flat label="取消" @click="dialogOpen = false" />
          <q-btn color="primary" label="确认签名" @click="confirmSign" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef } from 'vue';
import SignaturePad from 'signature_pad';
import { useResponsive } from 'src/composables/useResponsive';

defineOptions({ name: 'ReimbursementSignaturePad' });

const props = withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: '' });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const { isMobile } = useResponsive();
const dialogOpen = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const hostRef = ref<{ $el?: HTMLElement } | null>(null);
const padRef = shallowRef<SignaturePad | null>(null);
const observerRef = shallowRef<ResizeObserver | null>(null);

function openDialog() {
  dialogOpen.value = true;
}

function hostElement() {
  const host = hostRef.value?.$el ?? hostRef.value;
  return host instanceof HTMLElement ? host : null;
}

function initCanvas() {
  void nextTick(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    padRef.value = new SignaturePad(canvas, { penColor: '#111', backgroundColor: '#fff' });
    resizeCanvas();
    const host = hostElement();
    if (host) {
      observerRef.value = new ResizeObserver(resizeCanvas);
      observerRef.value.observe(host);
    }
  });
}

function destroyPad() {
  observerRef.value?.disconnect();
  observerRef.value = null;
  padRef.value?.off();
  padRef.value = null;
}

function resizeCanvas() {
  const canvas = canvasRef.value;
  const host = hostElement();
  if (!canvas || !host || !padRef.value) return;

  const snapshot = padRef.value.isEmpty() ? props.modelValue : padRef.value.toDataURL('image/png');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(host.clientWidth - 16, 280);
  const height = Math.min(Math.max(host.clientHeight - 16, 180), Math.round(width / 2));

  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.getContext('2d')?.scale(ratio, ratio);
  padRef.value.clear();
  if (snapshot) padRef.value.fromDataURL(snapshot, { width, height });
}

function clearDraft() {
  padRef.value?.clear();
  emit('update:modelValue', '');
}

function confirmSign() {
  emit('update:modelValue', padRef.value && !padRef.value.isEmpty() ? padRef.value.toDataURL('image/png') : '');
  dialogOpen.value = false;
}

onBeforeUnmount(destroyPad);
</script>

<style scoped>
.signature-pad {
  display: grid;
  gap: 8px;
}

.signature-label {
  font-size: 13px;
  color: var(--oa-text-secondary);
}

.signature-trigger {
  min-height: 96px;
  border: 1px dashed var(--oa-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--oa-text-secondary);
  cursor: pointer;
  background: #fff;
}

.signature-trigger:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: 2px;
}

.signature-preview {
  max-width: 100%;
  max-height: 92px;
  object-fit: contain;
}

.signature-dialog {
  width: 640px;
  max-width: 100vw;
  height: 420px;
  display: flex;
  flex-direction: column;
}

.signature-dialog.mobile {
  width: 100vw;
  height: 100dvh;
  border-radius: 0;
}

.canvas-host {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.signature-canvas {
  border: 1px solid var(--oa-border);
  background: #fff;
  touch-action: none;
}

.dialog-actions {
  padding-bottom: env(safe-area-inset-bottom, 8px);
}
</style>
