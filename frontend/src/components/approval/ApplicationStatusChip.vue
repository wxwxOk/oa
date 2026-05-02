<template>
  <q-chip
    dense
    square
    :color="chipColor"
    text-color="white"
    :label="label"
    class="application-status-chip"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  statusColor,
  statusLabel,
  type ApprovalApplicationStatus,
} from 'src/types/approvalApplication';

const props = defineProps<{
  status: ApprovalApplicationStatus;
}>();

const label = computed(() => statusLabel(props.status));
const chipColor = computed(() => (statusColor(props.status) === 'grey' ? 'grey-5' : statusColor(props.status)));
</script>

<style scoped>
.application-status-chip {
  border-radius: 4px;
  min-width: 56px;
  justify-content: center;
}
</style>
