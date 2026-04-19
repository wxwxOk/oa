// v-perm 指令：响应式控制元素可见性（无权限时隐藏）
import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/auth';

function applyPerm(el: HTMLElement, binding: any) {
  const auth = useAuthStore();
  const code = binding.value as string | string[];
  const codes = Array.isArray(code) ? code : [code];
  const has = codes.some((c) => auth.hasPerm(c));
  // 用 display 控制代替移除节点，确保权限刷新后 updated 钩子能重新显示
  el.style.display = has ? '' : 'none';
}

export default boot(({ app }) => {
  app.directive('perm', {
    mounted: applyPerm,
    updated: applyPerm,
  });
});
