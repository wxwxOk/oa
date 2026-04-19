import { boot } from 'quasar/wrappers';
import { Dark } from 'quasar';

export default boot(() => {
  const saved = localStorage.getItem('oa-dark-mode');
  if (saved !== null) {
    Dark.set(saved === 'true');
  }
  // 无 saved 时保持 quasar.config.cjs 的 dark: 'auto' 默认行为
});
