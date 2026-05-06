<template>
  <q-dialog v-model="open" persistent>
    <q-card class="duplicate-card">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 wrap-text">检测到 {{ hints.length }} 条疑似重复推送</div>
        <q-space />
        <q-btn flat round dense icon="close" aria-label="关闭" @click="open = false" />
      </q-card-section>
      <q-card-section>
        <div class="text-body2 muted">提交已成功，请人工核对是否需要撤回。</div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-list separator>
          <q-item v-for="hint in hints" :key="hint.id">
            <q-item-section>
              <q-item-label class="row items-center q-gutter-sm">
                <span>{{ hint.studentName }}</span>
                <ChannelPushStatusChip :status="hint.status" />
              </q-item-label>
              <q-item-label caption>
                {{ hint.studentPhone }} · 提交时间 {{ formatChannelPushDate(hint.submittedAt) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat color="primary" label="我知道了" @click="open = false" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ChannelPushStatusChip from 'src/components/channel-push/ChannelPushStatusChip.vue';
import { formatChannelPushDate, type ChannelPushDuplicateHint } from 'src/types/channelPush';

const props = defineProps<{ modelValue: boolean; hints: ChannelPushDuplicateHint[] }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>

<style scoped>
.duplicate-card { width: 100%; max-width: 520px; }
.wrap-text { overflow-wrap: anywhere; }
.muted { color: var(--oa-text-secondary); }
</style>
