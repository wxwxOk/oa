<template>
  <q-chip dense size="sm" :color="color" :text-color="textColor">
    {{ label }}
  </q-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  channelPushStatusColor,
  channelPushStatusLabel,
  type ChannelPushStatus,
} from 'src/types/channelPush';

const props = defineProps<{ status: ChannelPushStatus }>();
const label = computed(() => channelPushStatusLabel(props.status));
const color = computed(() => channelPushStatusColor(props.status));
const textColor = computed(() => (props.status === 'CANCELLED' ? 'grey-9' : 'white'));
</script>
