<template>
  <q-card flat bordered class="attachment-panel">
    <q-card-section>
      <div class="row items-center q-gutter-sm q-mb-md">
        <div class="section-title">附件</div>
        <q-space />
        <div class="text-caption muted">{{ attachments.length }}/20</div>
      </div>

      <q-file
        v-if="editable === true && pushId"
        v-model="selectedFiles"
        outlined
        dense
        multiple
        use-chips
        accept="image/jpeg,image/png,image/webp,application/pdf"
        :max-file-size="10 * 1024 * 1024"
        :disable="!canUpload"
        label="上传图片或 PDF 附件"
        @update:model-value="onFilesSelected"
        @rejected="onRejectedFiles"
      >
        <template #hint>
          <span v-if="!pushId">先提交推送后再上传附件</span>
          <span v-else>支持 JPG、PNG、WebP、PDF，单个文件不超过 10MB。</span>
        </template>
      </q-file>

      <div v-if="!pushId" class="text-caption muted q-mt-sm">先提交推送后再上传附件</div>
      <div v-else-if="attachments.length >= MAX_CHANNEL_PUSH_ATTACHMENTS" class="text-caption muted q-mt-sm">
        附件数量已达上限。
      </div>

      <q-list v-if="attachments.length > 0" separator class="q-mt-md">
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
                :loading="store.downloadLoading"
                @click="previewAttachment(attachment)"
              />
              <q-btn
                flat
                dense
                color="primary"
                icon="download"
                label="下载"
                :loading="store.downloadLoading"
                @click="downloadAttachmentFile(attachment)"
              />
              <q-btn
                v-if="canDelete"
                flat
                dense
                color="negative"
                icon="delete"
                label="删除"
                :loading="store.actionLoading"
                @click="confirmDelete(attachment)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-else class="empty-attachments q-mt-md">暂无附件</div>
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
import { computed, onUnmounted, ref, watch } from 'vue';
import { Dialog, Notify } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { useChannelPushStore } from 'src/stores/channelPush';
import {
  ALLOWED_CHANNEL_PUSH_MIME_TYPES,
  MAX_CHANNEL_PUSH_ATTACHMENTS,
  MAX_CHANNEL_PUSH_FILE_SIZE,
  formatChannelPushDate,
  type ChannelPushAttachment,
} from 'src/types/channelPush';

defineOptions({ name: 'ChannelPushAttachmentPanel' });

const props = withDefaults(
  defineProps<{
    pushId?: number | null;
    attachments: ChannelPushAttachment[];
    editable?: boolean;
  }>(),
  {
    pushId: null,
    editable: false,
  },
);

const emit = defineEmits<{
  uploaded: [];
  deleted: [];
}>();

type RejectedFile = { file: File; failedPropValidation?: string };

const auth = useAuthStore();
const store = useChannelPushStore();
const selectedFiles = ref<File[] | null>(null);
const previewDialog = ref(false);
const previewUrl = ref('');
const previewName = ref('');

const canDelete = computed(
  () => props.editable === true && !!props.pushId && auth.hasPerm('channelPush:create'),
);
const canUpload = computed(
  () => canDelete.value && props.attachments.length < MAX_CHANNEL_PUSH_ATTACHMENTS,
);

function formatFileSize(size?: number | null): string {
  if (!Number.isFinite(size) || !size || size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isImageAttachment(attachment: ChannelPushAttachment) {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(attachment.mimeType);
}

function normalizeSelectedFiles(value: File[] | File | null) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function onRejectedFiles(rejected: RejectedFile[]) {
  const fileName = rejected[0]?.file?.name;
  Notify.create({ type: 'negative', message: fileName ? `${fileName} 不符合上传要求` : '附件不符合上传要求' });
}

async function onFilesSelected(value: File[] | File | null) {
  const files = normalizeSelectedFiles(value);
  selectedFiles.value = null;
  if (!props.pushId || !canUpload.value || files.length === 0) return;

  const validFiles: File[] = [];
  for (const file of files) {
    if (!ALLOWED_CHANNEL_PUSH_MIME_TYPES.includes(file.type as (typeof ALLOWED_CHANNEL_PUSH_MIME_TYPES)[number])) {
      Notify.create({ type: 'negative', message: `${file.name} 不符合上传要求` });
      continue;
    }
    if (file.size > MAX_CHANNEL_PUSH_FILE_SIZE) {
      Notify.create({ type: 'negative', message: `${file.name} 不符合上传要求` });
      continue;
    }
    validFiles.push(file);
  }

  if (validFiles.length === 0) return;

  try {
    await store.addAttachments(props.pushId, validFiles);
    emit('uploaded');
  } catch {
    Notify.create({ type: 'negative', message: `${validFiles[0]?.name ?? '附件'} 上传失败` });
  }
}

function revokePreviewUrl() {
  if (!previewUrl.value) return;
  URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
}

async function previewAttachment(attachment: ChannelPushAttachment) {
  if (!props.pushId) return;
  try {
    const blob = await store.previewAttachmentBlob(props.pushId, attachment.id);
    revokePreviewUrl();
    previewUrl.value = URL.createObjectURL(blob);
    previewName.value = attachment.originalName;
    previewDialog.value = true;
  } catch {
    Notify.create({ type: 'negative', message: `${attachment.originalName} 预览失败` });
  }
}

async function downloadAttachmentFile(attachment: ChannelPushAttachment) {
  if (!props.pushId) return;
  try {
    const blob = await store.downloadAttachment(props.pushId, attachment.id);
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

function confirmDelete(attachment: ChannelPushAttachment) {
  if (!props.pushId || !canDelete.value) return;
  Dialog.create({
    title: '确认删除附件',
    message: `确认删除附件「${attachment.originalName}」？`,
    cancel: { label: '取消', flat: true },
    ok: { label: '删除', color: 'negative' },
    persistent: true,
  }).onOk(() => {
    void deleteAttachment(attachment);
  });
}

async function deleteAttachment(attachment: ChannelPushAttachment) {
  if (!props.pushId) return;
  try {
    await store.deleteAttachment(props.pushId, attachment.id);
    emit('deleted');
  } catch {
    Notify.create({ type: 'negative', message: `${attachment.originalName} 删除失败` });
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

.attachment-row {
  padding-left: 0;
  padding-right: 0;
}

.empty-attachments {
  color: var(--oa-text-secondary);
  font-size: 14px;
}

.preview-card {
  width: 720px;
  max-width: calc(100vw - 32px);
}

.preview-image {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  margin: 0 auto;
}
</style>
