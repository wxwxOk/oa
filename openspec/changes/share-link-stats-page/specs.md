# Specs: share-link-stats-page

## Functional Requirements

### FR-1: Navigation Menu Restructuring
- `allMenus` 从扁平数组改为支持 `children` 字段的树形结构
- 新增一级菜单「收集统计表」(icon: assessment)，不可点击，仅展开/折叠
- 子菜单：「模板管理」(/templates, icon: description, perm: form:template:list) + 「统计表」(/share-link-stats, icon: bar_chart, perm: form:link-stats:view)
- 父菜单可见性 = 任一子菜单有权限即显示
- 无子菜单的顶级项保持原有 QItem 渲染

### FR-2: PC Sidebar (QExpansionItem)
- 嵌套菜单使用 QExpansionItem 渲染，default-opened
- 子项缩进 (class: q-pl-xl)，点击跳转对应路由
- 非嵌套菜单保持 QItem 渲染不变

### FR-3: Mobile Bottom Tab
- 底部 Tab 不支持嵌套，使用 `flattenedVisibleMenus` computed
- 递归遍历 `visibleMenus`，收集所有有 `path` 的叶子节点
- Tab 显示展平后的菜单项

### FR-4: Mobile Drawer
- 抽屉菜单与 PC 侧边栏相同的嵌套渲染逻辑
- 子项点击后自动关闭抽屉 (@click="mobileDrawerOpen = false")

### FR-5: Backend API
- Endpoint: `GET /api/v1/share-link-stats`
- Auth: `authGuard('form:link-stats:view')`
- Query Params:
  | Param | Type | Default | Validation |
  |-------|------|---------|------------|
  | page | number | 1 | ≥1 |
  | size | number | 20 | 1-100 |
  | templateName | string | — | trim, 模糊搜索 |
  | sharerName | string | — | trim, 模糊搜索 |
  | dateFrom | string | — | ISO date, ≤ dateTo |
  | dateTo | string | — | ISO date, 自动补 T23:59:59.999Z |
- Response: `{ rows, total, page, size }`
- rows 每项: `{ id, code, createdAt, template: { id, name }, creator: { id, realName }, submissionCount }`
- 排序: `createdAt desc, id desc`
- 空结果返回 `{ rows: [], total: 0, page: 1, size: 20 }`

### FR-6: Prisma Query
- `prisma.shareLink.findMany` + `include` (template, creator) + `_count` (submissions)
- `prisma.shareLink.count` 并行执行 (Promise.all)
- `_count.submissions` 映射为 `submissionCount`
- 模糊搜索使用 `contains` + `mode: 'insensitive'`

### FR-7: ShareLinkStatsPage.vue
- PC 端: QTable 分页表格 + 顶部筛选栏
- 列: 序号、模板名称、分享码(code)、分享人、提交数量、分享时间
- 筛选: 模板名称(q-input)、分享人(q-input)、起始日期(q-input type=date)、截止日期(q-input type=date)
- 分页: 服务端分页，@request="onReq"，rowsPerPage=20
- 移动端: QCard 卡片列表，显示模板名、分享人、提交数、时间
- 空状态: EmptyState 组件 (icon: bar_chart)
- 首次加载: skeleton 占位

### FR-8: Pinia Store (shareLinkStats)
- Option API 风格，与现有 store 一致
- state: rows, total, loading, page, size
- actions: fetchList(filters) — 调用 `api.get('/share-link-stats', { params })`

### FR-9: Permission Seeding
- 新增权限: `{ code: 'form:link-stats:view', name: '查看分享链接统计', module: 'form' }`
- ADMIN 角色自动拥有所有权限（现有 seed 逻辑保证）
- EMPLOYEE 角色默认不包含此权限

### FR-10: Route Registration
- 前端: `{ path: 'share-link-stats', component: () => import('pages/ShareLinkStatsPage.vue'), meta: { title: '统计表', icon: 'bar_chart', perm: 'form:link-stats:view' } }`
- 后端: `shareLinkStatsModule` 注册到 `/api/v1` 链

## Non-Functional Requirements

### NFR-1: Performance
- 无 N+1 查询 (Prisma include + _count)
- size 上限 100，防止大量数据拉取
- 排序使用 createdAt desc + id desc 保证分页稳定性

### NFR-2: Security
- 后端 authGuard 是唯一安全边界，前端菜单隐藏仅为 UX
- 搜索参数通过 Prisma 参数化查询，无 SQL 注入风险
- 日期参数校验: 无效日期 → BizError，dateFrom > dateTo → BizError

### NFR-3: Compatibility
- 现有 Dashboard 统计面板不受影响
- 现有 SubmissionPage 不受影响
- 菜单结构变更向后兼容（无 children 的项保持原有渲染）

## Constraints
- Prisma schema 无需变更（ShareLink 已有所需关系）
- ShareLink 无 expiresAt 字段，不显示过期时间列
- ShareLink.createdAt 无索引，当前规模可接受，大数据量需后续优化
- 遵循现有分页响应格式 `{ rows, total, page, size }`
- 遵循现有 Pinia store Option API 风格
