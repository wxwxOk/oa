import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/403',
    component: () => import('pages/ForbiddenPage.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue'), meta: { title: '首页', icon: 'dashboard' } },
      { path: 'departments', component: () => import('pages/DepartmentPage.vue'), meta: { title: '部门管理', icon: 'account_tree', perm: 'department:list' } },
      { path: 'users', component: () => import('pages/UserPage.vue'), meta: { title: '用户管理', icon: 'people', perm: 'user:list' } },
      { path: 'roles', component: () => import('pages/RolePage.vue'), meta: { title: '角色权限', icon: 'security', perm: 'role:list' } },
      { path: 'templates', component: () => import('pages/TemplatePage.vue'), meta: { title: '模板管理', icon: 'description', perm: 'form:template:list' } },
      { path: 'templates/:id/design', component: () => import('pages/FormDesignerPage.vue'), meta: { title: '表单设计', perm: 'form:template:edit' } },
    ],
  },
  { path: '/:catchAll(.*)*', component: () => import('pages/NotFoundPage.vue'), meta: { public: true } },
];

export default routes;
