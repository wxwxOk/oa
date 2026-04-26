<template>
  <div class="application-timeline">
    <q-timeline v-if="orderedEvents.length > 0" color="primary" layout="dense">
      <q-timeline-entry
        v-for="event in orderedEvents"
        :key="event.id"
        :title="eventTitle(event)"
        :subtitle="formatDate(event.createdAt)"
      >
        <div class="timeline-meta">
          {{ event.actorName }}<span v-if="event.nodeName"> · {{ event.nodeName }}</span>
        </div>
        <div v-if="event.comment" class="timeline-comment">{{ event.comment }}</div>
      </q-timeline-entry>
    </q-timeline>
    <div v-else class="empty-timeline">暂无审批动态</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ApprovalTimelineEvent } from 'src/types/approvalApplication';

const props = defineProps<{
  events: ApprovalTimelineEvent[];
}>();

const orderedEvents = computed(() =>
  [...props.events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  ),
);

function eventTitle(event: ApprovalTimelineEvent) {
  if (event.type === 'SUBMIT') return '提交申请';
  if (event.type === 'ASSIGN') return `进入 ${event.nodeName || '审批节点'}`;
  if (event.type === 'APPROVE') return '审批通过';
  if (event.type === 'REJECT') return '审批驳回';
  if (event.type === 'CANCEL') return '申请已撤销';
  if (event.type === 'COMMENT') return '内部备注';
  return event.title;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value)
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/\//g, '-');
}
</script>

<style scoped>
.application-timeline {
  overflow-wrap: anywhere;
}

.timeline-meta {
  font-size: 12px;
  color: var(--oa-text-secondary);
  line-height: 1.5;
}

.timeline-comment {
  margin-top: 8px;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
}

.empty-timeline {
  color: var(--oa-text-secondary);
  font-size: 14px;
  padding: 16px 0;
}
</style>
