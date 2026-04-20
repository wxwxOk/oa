<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="min-width: 400px; max-width: 480px; border-radius: 12px">
      <q-card-section class="text-h6">分享链接</q-card-section>
      <q-card-section>
        <q-input
          :model-value="shareUrl"
          outlined
          readonly
          dense
        >
          <template #append>
            <q-btn flat dense icon="content_copy" @click="copyLink" />
          </template>
        </q-input>
        <div class="flex flex-center q-mt-md">
          <canvas ref="qrCanvas" />
        </div>
        <div class="text-center text-caption q-mt-sm" style="color: var(--oa-text-secondary)">
          扫描二维码或复制链接分享
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="关闭" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import QRCode from 'qrcode';
import { Notify } from 'quasar';
import { useTemplateStore } from 'src/stores/template';

const props = defineProps<{
  modelValue: boolean;
  templateId: number;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const store = useTemplateStore();
const qrCanvas = ref<HTMLCanvasElement | null>(null);
const shareUrl = ref('');

watch(() => props.modelValue, async (open) => {
  if (!open) return;
  try {
    const link = await store.createShareLink(props.templateId);
    shareUrl.value = `${window.location.origin}/f/${link.code}`;
    await nextTick();
    if (qrCanvas.value) {
      await QRCode.toCanvas(qrCanvas.value, shareUrl.value, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  } catch {
    Notify.create({ type: 'negative', message: '生成分享链接失败' });
  }
});

async function copyLink() {
  await navigator.clipboard.writeText(shareUrl.value);
  Notify.create({ type: 'positive', message: '链接已复制' });
}
</script>
