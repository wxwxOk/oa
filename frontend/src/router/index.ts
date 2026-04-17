import { route } from 'quasar/wrappers';
import { createMemoryHistory, createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import routes from './routes';
import { useAuthStore } from 'src/stores/auth';

export default route(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to, _from, next) => {
    const auth = useAuthStore();
    if (to.meta.public) return next();
    if (!auth.isLogin) return next({ path: '/login', query: { redirect: to.fullPath } });
    const perm = to.meta.perm as string | undefined;
    if (perm && !auth.hasPerm(perm)) return next({ path: '/403' });
    next();
  });

  return Router;
});
