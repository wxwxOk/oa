<template>
  <div>
    <div v-if="preview" class="signature-preview-placeholder">
      <span>签名区域</span>
    </div>
    <template v-else>
      <!-- Trigger Area -->
      <div class="signature-trigger" tabindex="0" @click="openDialog" @keyup.enter="openDialog" @keyup.space.prevent="openDialog">
        <template v-if="modelValue">
          <img :src="modelValue" class="signature-preview-img" />
          <q-btn flat dense size="sm" label="重新签名" class="re-sign-btn" />
        </template>
        <template v-else>
          <q-icon name="edit" size="24px" color="grey-5" />
          <span class="trigger-hint">点击签名</span>
        </template>
      </div>

      <!-- Dialog -->
      <q-dialog
        v-model="dialogOpen"
        persistent
        :maximized="isMobile"
        :transition-show="isMobile ? 'slide-up' : 'scale'"
        :transition-hide="isMobile ? 'slide-down' : 'scale'"
        @show="onDialogShow"
        @hide="onDialogHide"
      >
        <q-card :class="['signature-dialog-card', { mobile: isMobile }]">
          <q-bar v-if="isMobile" class="bg-primary text-white">
            <div>手写签名</div>
            <q-space />
            <q-btn dense flat icon="delete_outline" @click="clearDraft" />
            <q-btn dense flat icon="close" @click="closeDialog" />
          </q-bar>
          <q-card-section v-else class="row items-center q-pb-none">
            <div class="text-h6">手写签名</div>
            <q-space />
            <q-btn flat dense label="清除" @click="clearDraft" />
            <q-btn flat dense round icon="close" @click="closeDialog" />
          </q-card-section>

          <q-card-section class="col canvas-host" ref="canvasHostRef">
            <canvas ref="canvasRef" class="signature-canvas-dialog" />
            <div v-if="isMobile" class="canvas-hint">在此区域内签名</div>
          </q-card-section>

          <q-card-actions class="dialog-actions">
            <q-btn unelevated color="primary" label="确认签名" class="full-width" @click="confirmSign" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, nextTick, onBeforeUnmount } from 'vue';
import SignaturePad from 'signature_pad';
import { useResponsive } from 'src/composables/useResponsive';

const props = withDefaults(defineProps<{
  preview?: boolean;
  modelValue?: string;
}>(), { preview: true, modelValue: '' });

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { isMobile } = useResponsive();

const dialogOpen = ref(false);
const draftValue = ref('');
const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasHostRef = ref<{ $el?: HTMLElement } | null>(null);
const padRef = shallowRef<SignaturePad | null>(null);
const observerRef = shallowRef<ResizeObserver | null>(null);
let openToken = 0;

function openDialog() {
  if (dialogOpen.value) return;
  dialogOpen.value = true;
  history.pushState({ ...history.state, signatureDialog: true }, '');
}

function closeDialog() {
  if (!dialogOpen.value) return;
  if (history.state?.signatureDialog) {
    history.back();
  } else {
    dialogOpen.value = false;
  }
}

function onDialogShow() {
  const token = ++openToken;
  draftValue.value = props.modelValue ?? '';

  nextTick(() => {
    if (token !== openToken) return;
    initPad();
    requestAnimationFrame(() => {
      if (token !== openToken) return;
      resizeCanvas();
    });

    const host = canvasHostRef.value?.$el ?? canvasHostRef.value;
    if (host instanceof HTMLElement) {
      observerRef.value = new ResizeObserver(() => {
        if (token !== openToken) return;
        resizeCanvas();
      });
      observerRef.value.observe(host);
    }
  });
}

function onDialogHide() {
  ++openToken;
  destroyPad();
}

function destroyPad() {
  observerRef.value?.disconnect();
  observerRef.value = null;
  padRef.value?.off();
  padRef.value = null;
}

function initPad() {
  if (!canvasRef.value) return;
  padRef.value = new SignaturePad(canvasRef.value, {
    penColor: '#000',
    backgroundColor: '#fff',
    minWidth: 0.5,
    maxWidth: 2.5,
  });
}

function resizeCanvas() {
  const pad = padRef.value;
  const canvas = canvasRef.value;
  const host = canvasHostRef.value?.$el ?? canvasHostRef.value;
  if (!pad || !canvas || !(host instanceof HTMLElement)) return;

  const snapshot = pad.isEmpty() ? draftValue.value : pad.toDataURL();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const w = host.clientWidth - 16;
  // 强制横向：高度不超过宽度的 1/2，避免移动端竖屏时画布变纵向
  const h = Math.min(host.clientHeight - 16, Math.round(w / 2));
  if (w <= 0 || h <= 0) return;

  canvas.width = Math.floor(w * ratio);
  canvas.height = Math.floor(h * ratio);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx?.scale(ratio, ratio);
  pad.clear();

  if (snapshot) {
    pad.fromDataURL(snapshot, { width: w, height: h });
  }
}

function clearDraft() {
  padRef.value?.clear();
  draftValue.value = '';
}

function confirmSign() {
  if (padRef.value && !padRef.value.isEmpty()) {
    draftValue.value = padRef.value.toDataURL('image/png');
  } else {
    draftValue.value = '';
  }
  emit('update:modelValue', draftValue.value);
  closeDialog();
}

function onPopstate() {
  if (dialogOpen.value) {
    dialogOpen.value = false;
  }
}

window.addEventListener('popstate', onPopstate);
onBeforeUnmount(() => {
  window.removeEventListener('popstate', onPopstate);
  destroyPad();
});

function save(): string {
  if (padRef.value) {
    const data = padRef.value.isEmpty() ? '' : padRef.value.toDataURL('image/png');
    if (data) emit('update:modelValue', data);
    return data;
  }
  return props.modelValue ?? '';
}

function clear() {
  emit('update:modelValue', '');
  padRef.value?.clear();
  draftValue.value = '';
}

function isEmpty(): boolean {
  if (padRef.value) return padRef.value.isEmpty();
  return !props.modelValue;
}

defineExpose({ save, clear, isEmpty });
</script>

<style scoped>
.signature-preview-placeholder {
  width: 100%;
  height: 80px;
  border: 1px dashed var(--oa-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oa-text-tertiary);
  font-size: 14px;
}
.signature-trigger {
  width: 100%;
  height: 80px;
  border: 1px dashed var(--oa-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  background: #fff;
  position: relative;
}
.signature-trigger:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: 2px;
}
.signature-preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.re-sign-btn {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}
.signature-trigger:hover .re-sign-btn {
  opacity: 1;
}
.trigger-hint {
  color: var(--oa-text-tertiary);
  font-size: 14px;
}
.signature-dialog-card {
  width: 600px;
  max-width: 100vw;
  height: 400px;
  display: flex;
  flex-direction: column;
}
.signature-dialog-card.mobile {
  width: 100vw;
  height: 100dvh;
  border-radius: 0;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
.canvas-host {
  flex: 1;
  overflow: hidden;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.signature-canvas-dialog {
  border: 1px solid var(--oa-border);
  background: #fff;
  touch-action: none;
  overscroll-behavior: contain;
}
.canvas-hint {
  text-align: center;
  color: var(--oa-text-tertiary, #999);
  font-size: 12px;
  margin-top: 6px;
  pointer-events: none;
}
.dialog-actions {
  padding-bottom: env(safe-area-inset-bottom, 8px);
}
</style>
