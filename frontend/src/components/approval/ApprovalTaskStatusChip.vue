<template>
  <q-chip
    dense
    square
    :color="chipColor"
    text-color="white"
    :label="label"
    class="approval-task-status-chip"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  taskStatusColor,
  taskStatusLabel,
  type ApprovalTaskStatus,
} from 'src/types/approvalTask';

const props = defineProps<{
  status: ApprovalTaskStatus;
}>();

const label = computed(() => taskStatusLabel(props.status));
const chipColor = computed(() => (taskStatusColor(props.status) === 'grey' ? 'grey-5' : taskStatusColor(props.status)));
</script>

<style scoped>
.approval-task-status-chip {
  font-weight: 600;
}
</style>
