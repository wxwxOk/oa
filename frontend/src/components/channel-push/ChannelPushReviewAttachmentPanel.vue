<template>
  <q-card flat bordered class="attachment-panel">
    <q-card-section>
      <div class="row items-center q-gutter-sm q-mb-md">
        <div class="section-title">附件</div>
        <q-space />
        <div class="text-caption muted">{{ attachments.length }}</div>
      </div>

      <q-list v-if="attachments.length > 0" separator>
        <q-item v-for="attachment in attachments" :key="attachment.id" class="attachment-row">
          <q-item-section avatar>
            <q-icon :name="isImageAttachment(attachment) ? 'image' : 'picture_as_pdf'" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="wrap-text">{{ attachment.originalName }}</q-item-label>
            <q-item-label caption class="wrap-text">
              {{ attachment.mimeType }} · {{ formatFileSize(attachment.size) }} ·
              {{ formatChannelPushDate(attachment.createdAt) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row no-wrap q-gutter-xs">
              <q-btn
                v-if="isImageAttachment(attachment)"
                flat
                dense
                color="primary"
                icon="visibility"
                label="预览"
                :loading="store.reviewDownloadLoading"
                @click="previewAttachment(attachment)"
              />
              <q-btn
                flat
                dense
                color="primary"
                icon="download"
                label="下载"
                :loading="store.reviewDownloadLoading"
                @click="downloadAttachmentFile(attachment)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-else class="empty-attachments">暂无附件</div>
    </q-card-section>

    <q-dialog v-model="previewDialog">
      <q-card class="preview-card">
        <q-card-section class="row items-center">
          <div class="text-subtitle1 wrap-text">{{ previewName }}</div>
          <q-space />
          <q-btn flat round dense icon="close" aria-label="关闭预览" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <img v-if="previewUrl" :src="previewUrl" :alt="previewName" class="preview-image" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { Notify } from 'quasar';
import { useChannelPushStore } from 'src/stores/channelPush';
import {
  formatChannelPushDate,
  type ChannelPushAttachment,
} from 'src/types/channelPush';

defineOptions({ name: 'ChannelPushReviewAttachmentPanel' });

const props = defineProps<{
  pushId: number;
  attachments: ChannelPushAttachment[];
}>();

const store = useChannelPushStore();
const previewDialog = ref(false);
const previewUrl = ref('');
const previewName = ref('');

function formatFileSize(size?: number | null): string {
  if (!Number.isFinite(size) || !size || size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isImageAttachment(attachment: ChannelPushAttachment) {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(attachment.mimeType);
}

function revokePreviewUrl() {
  if (!previewUrl.value) return;
  URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
}

async function previewAttachment(attachment: ChannelPushAttachment) {
  try {
    const blob = await store.previewReviewAttachmentBlob(props.pushId, attachment.id);
    revokePreviewUrl();
    previewUrl.value = URL.createObjectURL(blob);
    previewName.value = attachment.originalName;
    previewDialog.value = true;
  } catch {
    Notify.create({ type: 'negative', message: `${attachment.originalName} 预览失败` });
  }
}

async function downloadAttachmentFile(attachment: ChannelPushAttachment) {
  try {
    const blob = await store.downloadReviewAttachmentBlob(props.pushId, attachment.id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = attachment.originalName;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch {
    Notify.create({ type: 'negative', message: `${attachment.originalName} 下载失败` });
  }
}

watch(previewDialog, (open) => {
  if (!open) revokePreviewUrl();
});

onUnmounted(revokePreviewUrl);
</script>

<style scoped>
.attachment-panel {
  border-radius: 8px;
  background: var(--oa-surface);
}
.section-title {
  font-size: 16px;
  font-weight: 600;
}
.muted {
  color: var(--oa-text-secondary);
}
.wrap-text {
  overflow-wrap: anywhere;
}
.empty-attachments {
  color: var(--oa-text-secondary);
  font-size: 14px;
}
.preview-card {
  width: min(92vw, 760px);
}
.preview-image {
  display: block;
  max-width: 100%;
  max-height: 72vh;
  margin: 0 auto;
  object-fit: contain;
}
</style>
