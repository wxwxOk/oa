<template>
  <q-chip
    square
    :dense="dense !== false"
    :color="reimbursementStatusColor(status)"
    text-color="white"
    class="reimbursement-status-chip"
  >
    {{ reimbursementStatusLabel(status) }}
  </q-chip>
</template>

<script setup lang="ts">
import {
  reimbursementStatusColor,
  reimbursementStatusLabel,
  type ReimbursementStatus,
} from 'src/types/reimbursement';

defineOptions({ name: 'ReimbursementStatusChip' });

withDefaults(
  defineProps<{
    status: ReimbursementStatus;
    dense?: boolean;
  }>(),
  {
    dense: true,
  },
);
</script>

<style scoped>
.reimbursement-status-chip {
  border-radius: 4px;
  min-width: 64px;
  justify-content: center;
}
</style>
