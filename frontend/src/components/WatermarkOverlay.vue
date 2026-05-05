<template>
  <div class="oa-watermark-host">
    <slot />
    <div
      v-if="text"
      class="oa-watermark-overlay"
      :style="overlayStyle"
      data-html2canvas-ignore="true"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    text?: string | null;
    opacity?: number;
  }>(),
  { text: null, opacity: 0.08 },
);

// escapeXml 保证 SVG DOM 结构完整，encodeURIComponent 防止 dataURL 解析逃逸。
function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return '&apos;';
    }
  });
}

const overlayStyle = computed(() => {
  const raw = (props.text ?? '').slice(0, 50);
  if (!raw) return {};
  const safe = escapeXml(raw);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180">` +
    `<text x="50%" y="50%" fill="#000" fill-opacity="${props.opacity}" ` +
    `font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="20" ` +
    `text-anchor="middle" transform="rotate(-30 150 90)">${safe}</text></svg>`;
  return {
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
  };
});
</script>

<style scoped>
.oa-watermark-host {
  position: relative;
  width: 100%;
}
.oa-watermark-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-repeat: repeat;
  z-index: 1;
}
@media print {
  .oa-watermark-overlay {
    display: none !important;
  }
}
</style>
