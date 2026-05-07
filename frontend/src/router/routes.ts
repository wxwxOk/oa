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
    path: '/f/:code',
    component: () => import('pages/PublicFillPage.vue'),
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
      { path: 'visits', component: () => import('pages/VisitPage.vue'), meta: { title: '到访管理', icon: 'groups', perm: 'visit:list' } },
      { path: 'reimbursements', component: () => import('pages/ReimbursementPage.vue'), meta: { title: '我的报销', icon: 'receipt_long', permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review'] } },
      { path: 'reimbursements/new', component: () => import('pages/ReimbursementFormPage.vue'), meta: { title: '新建报销申请', perm: 'reimbursement:create' } },
      { path: 'reimbursements/:id/edit', component: () => import('pages/ReimbursementFormPage.vue'), meta: { title: '编辑报销申请', perm: 'reimbursement:create' } },
      { path: 'reimbursements/:id', component: () => import('pages/ReimbursementDetailPage.vue'), meta: { title: '报销详情', permAny: ['reimbursement:own', 'reimbursement:list', 'reimbursement:department-review', 'reimbursement:finance-review'] } },
      { path: 'channel-push', component: () => import('pages/ChannelPushPage.vue'), meta: { title: '我的推送', icon: 'forward_to_inbox', permAny: ['channelPush:viewOwn', 'channelPush:create'] } },
      { path: 'review/channel-push', component: () => import('pages/ChannelPushReviewPage.vue'), meta: { title: '待我审核', icon: 'fact_check', perm: 'channelPush:review' } },
      { path: 'channel-push/new', component: () => import('pages/ChannelPushFormPage.vue'), meta: { title: '新建推送', perm: 'channelPush:create' } },
      { path: 'channel-push/:id/edit', component: () => import('pages/ChannelPushFormPage.vue'), meta: { title: '编辑推送', perm: 'channelPush:create' } },
      { path: 'channel-push/:id', component: () => import('pages/ChannelPushDetailPage.vue'), meta: { title: '推送详情', perm: 'channelPush:viewOwn' } },
      { path: 'templates', component: () => import('pages/TemplatePage.vue'), meta: { title: '模板管理', icon: 'description', perm: 'form:template:list' } },
      { path: 'templates/:id/design', component: () => import('pages/FormDesignerPage.vue'), meta: { title: '表单设计', perm: 'form:template:edit' } },
      { path: 'submissions', component: () => import('pages/SubmissionsPage.vue'), meta: { title: '提交统计', icon: 'bar_chart', perm: 'form:submission:list' } },
      { path: 'share-link-stats', redirect: '/submissions' },
      { path: 'approval/archive', redirect: '/submissions' },
      {
        path: 'templates/:id/submissions',
        redirect: (to) => ({ path: '/submissions', query: { templateId: String(to.params.id) } }),
      },
      { path: 'approval/archive/:sourceType/:id', component: () => import('pages/ApprovalArchiveDetailPage.vue'), meta: { title: '提交详情', perm: 'form:submission:list' } },
    ],
  },
  { path: '/:catchAll(.*)*', component: () => import('pages/NotFoundPage.vue'), meta: { public: true } },
];

export default routes;
