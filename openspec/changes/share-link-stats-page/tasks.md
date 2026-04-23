# Tasks: share-link-stats-page

## Backend

- [x] 1.1 在 `backend/prisma/seed.ts` 的 PERMISSIONS 数组中新增 `{ code: 'form:link-stats:view', name: '查看分享链接统计', module: 'form' }`
- [x] 1.2 创建 `backend/src/modules/share-link-stats/share-link-stats.route.ts`：Elysia 模块，prefix '/share-link-stats'，use authGuard('form:link-stats:view')
- [x] 1.3 实现 GET '/' handler：解析 page/size/templateName/sharerName/dateFrom/dateTo，构建 Prisma where，Promise.all([findMany, count])，映射 _count.submissions → submissionCount，返回 { rows, total, page, size }
- [x] 1.4 在 `backend/src/index.ts` 的 /api/v1 group 中注册 shareLinkStatsModule

## Frontend — Navigation Menu

- [x] 2.1 在 `frontend/src/layouts/MainLayout.vue` 中定义 MenuConfig 接口（支持 children 字段）
- [x] 2.2 将 allMenus 改为树形结构：「收集统计表」(assessment) 包含「模板管理」和「统计表」两个子项
- [x] 2.3 将 visibleMenus computed 改为递归过滤：父菜单可见性 = 任一子菜单有权限
- [x] 2.4 新增 flattenedVisibleMenus computed：递归遍历 visibleMenus，收集所有有 path 的叶子节点
- [x] 2.5 PC 侧边栏模板：嵌套菜单用 QExpansionItem (default-opened)，子项 q-pl-xl 缩进；非嵌套保持 QItem
- [x] 2.6 移动端抽屉模板：同 PC 侧边栏逻辑，子项点击关闭抽屉
- [x] 2.7 移动端底部 Tab：v-for 改为遍历 flattenedVisibleMenus

## Frontend — Route & Store

- [x] 3.1 在 `frontend/src/router/routes.ts` 新增路由 `{ path: 'share-link-stats', component: () => import('pages/ShareLinkStatsPage.vue'), meta: { title: '统计表', icon: 'bar_chart', perm: 'form:link-stats:view' } }`
- [x] 3.2 创建 `frontend/src/stores/shareLinkStats.ts`：Option API，state (rows/total/loading/page/size)，action fetchList(filters) 调用 api.get('/share-link-stats', { params })

## Frontend — ShareLinkStatsPage.vue

- [x] 4.1 创建页面基础结构：标题栏 + skeleton + EmptyState
- [x] 4.2 PC 筛选栏：templateName(q-input)、sharerName(q-input)、dateFrom(q-input type=date)、dateTo(q-input type=date)、查询按钮、重置按钮
- [x] 4.3 PC QTable：columns 定义（序号/模板名称/分享码/分享人/提交数量/分享时间），server-side pagination (@request)，custom cell templates
- [x] 4.4 Mobile QCard 列表：模板名、分享人、提交数、时间
- [x] 4.5 实现 load/onReq/resetFilters/formatDate 函数，onMounted 调用 load(1)

## Verification

- [ ] 5.1 运行 seed 确认新权限写入数据库，ADMIN 角色自动获得 form:link-stats:view
- [ ] 5.2 PC 端侧边栏：「收集统计表」可折叠，包含「模板管理」和「统计表」
- [ ] 5.3 移动端底部 Tab 和抽屉菜单正确展示展平后的菜单项
- [ ] 5.4 访问 /share-link-stats 显示分页统计表格，数据按分享链接粒度展示
- [ ] 5.5 筛选功能：按模板名称、分享人、日期范围筛选，重置清空所有筛选
- [ ] 5.6 无 form:link-stats:view 权限的用户看不到「统计表」菜单项，直接访问 URL 返回 403
- [ ] 5.7 空数据状态正确显示 EmptyState
