import { computed } from 'vue';
import { useQuasar } from 'quasar';

const STORAGE_KEY = 'oa-dark-mode';

export function useDarkMode() {
  const $q = useQuasar();
  const isDark = computed(() => $q.dark.isActive);

  function toggleDark() {
    $q.dark.toggle();
    localStorage.setItem(STORAGE_KEY, String($q.dark.isActive));
  }

  return { isDark, toggleDark };
}
