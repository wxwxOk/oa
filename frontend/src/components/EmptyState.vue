<template>
  <div class="flex flex-center" style="padding: 48px 16px">
    <div class="text-center">
      <q-icon :name="icon" size="64px" style="color: var(--oa-text-tertiary)" />
      <div class="q-mt-md" style="font-size: 20px; font-weight: 600; color: var(--oa-text-primary)">
        {{ title }}
      </div>
      <div class="q-mt-sm" style="font-size: 14px; color: var(--oa-text-secondary)">
        {{ description }}
      </div>
      <q-btn v-if="ctaText" color="primary" :label="ctaText" class="q-mt-md" @click="$emit('action')" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description: string;
  ctaText?: string;
}>();
defineEmits<{ action: [] }>();
</script>
