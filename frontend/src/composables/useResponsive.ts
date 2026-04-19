import { computed } from 'vue';
import { useQuasar } from 'quasar';

export function useResponsive() {
  const $q = useQuasar();
  // $q.screen.gt.sm === (width >= 1024)，与 D-01 的 1024px 分界线完全对齐
  const isDesktop = computed(() => $q.screen.gt.sm);
  const isMobile = computed(() => !$q.screen.gt.sm);
  return { isDesktop, isMobile };
}
