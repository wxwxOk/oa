// v-perm 指令：无权限时移除元素
import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/auth';

export default boot(({ app }) => {
  app.directive('perm', {
    mounted(el: HTMLElement, binding) {
      const auth = useAuthStore();
      const code = binding.value as string | string[];
      const codes = Array.isArray(code) ? code : [code];
      if (!codes.some((c) => auth.hasPerm(c))) {
        el.parentNode?.removeChild(el);
      }
    },
  });
});
