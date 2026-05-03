<template>
  <div class="reimbursement-timeline">
    <div class="section-title q-mb-md">审核轨迹</div>
    <q-timeline v-if="orderedActions.length > 0" color="primary" layout="dense">
      <q-timeline-entry
        v-for="action in orderedActions"
        :key="action.id"
        :title="actionLabel(action.type)"
        :subtitle="formatDateTime(action.createdAt)"
      >
        <div class="timeline-meta">
          {{ action.actorName || '-' }}
          <span v-if="action.nodeName"> · {{ action.nodeName }}</span>
        </div>
        <div class="timeline-fields">
          <div><span class="muted">nodeName：</span>{{ action.nodeName || '-' }}</div>
          <div><span class="muted">actorName：</span>{{ action.actorName || '-' }}</div>
          <div><span class="muted">createdAt：</span>{{ formatDateTime(action.createdAt) }}</div>
          <div><span class="muted">type：</span>{{ action.type }}</div>
        </div>
        <div v-if="action.comment" class="timeline-comment">comment：{{ action.comment }}</div>
        <div v-if="hasSignatureMetadata(action)" class="signature-meta">
          签名附件：{{ action.signatureRelativePath || '-' }} ·
          {{ action.signatureMimeType || '-' }} ·
          {{ formatSignatureSize(action.signatureSize) }}
        </div>
      </q-timeline-entry>
    </q-timeline>
    <div v-else class="empty-timeline">暂无审核轨迹</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatFileSize, formatReimbursementDate, type ReimbursementAction } from 'src/types/reimbursement';

defineOptions({ name: 'ReimbursementActionTimeline' });

const props = defineProps<{
  actions: ReimbursementAction[];
}>();

const orderedActions = computed(() =>
  [...props.actions].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()),
);

function actionLabel(type: string) {
  const labels: Record<string, string> = {
    SUBMIT: '提交申请',
    DEPARTMENT_APPROVE: '部门审核通过',
    DEPARTMENT_REJECT: '部门审核退回',
    FINANCE_APPROVE: '财务审核通过',
    FINANCE_REJECT: '财务审核退回',
  };
  return labels[type] ?? type;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = formatReimbursementDate(value);
  const time = value.length >= 16 ? value.slice(11, 16) : '';
  return time ? `${date} ${time}` : date;
}

function hasSignatureMetadata(action: ReimbursementAction) {
  return !!(action.signatureRelativePath || action.signatureMimeType || action.signatureSize);
}

function formatSignatureSize(size?: number | null) {
  return size ? formatFileSize(size) : '-';
}
</script>

<style scoped>
.reimbursement-timeline {
  overflow-wrap: anywhere;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
}

.timeline-meta,
.timeline-fields,
.signature-meta,
.empty-timeline {
  color: var(--oa-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.timeline-comment {
  margin-top: 8px;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
}

.signature-meta {
  margin-top: 8px;
}

.muted {
  color: var(--oa-text-secondary);
}
</style>
