# Design: share-link-stats-page

## Architecture

### Menu Data Structure

```
allMenus: MenuConfig[]

interface MenuConfig {
  path?: string;       // 叶子节点有 path，父节点无
  title: string;
  icon: string;
  perm?: string;       // 叶子节点权限码
  children?: MenuConfig[];
}

// 实际数据
[
  { path: '/dashboard', title: '首页', icon: 'dashboard', perm: '' },
  { path: '/departments', title: '部门', icon: 'account_tree', perm: 'department:list' },
  { path: '/users', title: '用户', icon: 'people', perm: 'user:list' },
  { path: '/roles', title: '角色', icon: 'security', perm: 'role:list' },
  {
    title: '收集统计表', icon: 'assessment',
    children: [
      { path: '/templates', title: '模板管理', icon: 'description', perm: 'form:template:list' },
      { path: '/share-link-stats', title: '统计表', icon: 'bar_chart', perm: 'form:link-stats:view' },
    ],
  },
]
```

### Permission Filtering (Recursive)

```
visibleMenus = computed(() => {
  filterMenus(menus):
    for each menu:
      if has children → filter children recursively → keep parent if any child visible
      else → keep if no perm or hasPerm(perm)
})

flattenedVisibleMenus = computed(() => {
  traverse visibleMenus tree → collect all nodes with path
})
```

### Sidebar Rendering

```
PC Sidebar / Mobile Drawer:
  <template v-for="m in visibleMenus">
    if m.children → <q-expansion-item :icon :label default-opened>
                       <q-item v-for="child" :to="child.path" class="q-pl-xl">
                     </q-expansion-item>
    else → <q-item :to="m.path">
  </template>

Mobile Bottom Tab:
  <q-tab v-for="m in flattenedVisibleMenus" :name="m.path" :icon="m.icon" :label="m.title" />
```

### Backend Module

```
share-link-stats.route.ts

shareLinkStatsModule = new Elysia({ prefix: '/share-link-stats' })
  .use(authGuard('form:link-stats:view'))
  .get('/', handler, { query: schema })

handler:
  1. Parse & validate: page, size, templateName, sharerName, dateFrom, dateTo
  2. Build Prisma where clause
  3. Promise.all([findMany, count])
  4. Map _count.submissions → submissionCount
  5. Return { rows, total, page, size }
```

### Prisma Query Structure

```
where: {
  template: { name: { contains, mode: 'insensitive' } },  // if templateName
  creator: { realName: { contains, mode: 'insensitive' } }, // if sharerName
  createdAt: { gte: dateFrom, lte: dateTo },                // if date range
}

findMany: {
  where,
  include: {
    template: { select: { id, name } },
    creator: { select: { id, realName } },
    _count: { select: { submissions: true } },
  },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  skip: (page - 1) * size,
  take: size,
}
```

### Frontend Page Structure

```
ShareLinkStatsPage.vue
  ├── Title bar: "收集统计表"
  ├── Filter bar (PC only): templateName, sharerName, dateFrom, dateTo, 查询, 重置
  ├── Skeleton (firstLoading)
  ├── EmptyState (no data)
  ├── QTable (PC): server-side pagination, columns, custom cell templates
  └── QCard list (Mobile): template name, sharer, count, date

Store: shareLinkStats.ts (Option API)
  state: rows, total, loading, page, size
  actions: fetchList(filters)
```

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/layouts/MainLayout.vue` | Modify | allMenus 改为树形结构，新增 MenuConfig 接口，visibleMenus 改为递归过滤，新增 flattenedVisibleMenus，sidebar/drawer 模板支持 QExpansionItem |
| `frontend/src/router/routes.ts` | Modify | 新增 share-link-stats 路由 |
| `frontend/src/stores/shareLinkStats.ts` | Create | Pinia store (Option API) |
| `frontend/src/pages/ShareLinkStatsPage.vue` | Create | 统计表页面 (QTable + QCard) |
| `backend/src/modules/share-link-stats/share-link-stats.route.ts` | Create | Elysia 路由模块 |
| `backend/src/index.ts` | Modify | 注册 shareLinkStatsModule |
| `backend/prisma/seed.ts` | Modify | 新增 form:link-stats:view 权限 |

## Files NOT Changed

| File | Reason |
|------|--------|
| `backend/prisma/schema.prisma` | ShareLink 已有所需关系，无需变更 |
| `frontend/src/pages/SubmissionPage.vue` | 不受影响 |
| `frontend/src/pages/DashboardPage.vue` | 不受影响 |
| `frontend/src/composables/*` | 复用现有 useResponsive |
