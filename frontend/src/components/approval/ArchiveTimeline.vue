<template>
  <div class="archive-timeline">
    <q-timeline v-if="orderedEvents.length > 0" color="primary" layout="dense">
      <q-timeline-entry
        v-for="event in orderedEvents"
        :key="event.id"
        :title="event.title"
        :subtitle="formatDate(event.createdAt)"
      >
        <div class="timeline-meta">{{ event.actorName }}</div>
        <div v-if="event.comment" class="timeline-comment">{{ event.comment }}</div>
      </q-timeline-entry>
    </q-timeline>
    <div v-else class="empty-timeline">暂无处理动态</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ArchiveTimelineEvent } from 'src/types/approvalArchive';

const props = defineProps<{
  events: ArchiveTimelineEvent[];
}>();

const orderedEvents = computed(() =>
  [...props.events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  ),
);

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
.archive-timeline {
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
