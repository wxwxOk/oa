# Proposal: 收集统计表 — 嵌套导航 + 分享链接统计页

## Summary

在导航菜单中新增一级菜单「收集统计表」，将现有「模板管理」作为其子菜单，并新增同级子菜单「统计表」。统计表页面为分页表格，按分享链接粒度展示所有模板的分享统计数据，支持按模板名称、分享人搜索。

## Motivation

当前系统仅在 Dashboard 提供按员工汇总的统计面板，缺少按分享链接粒度的全局统计视图。运营人员需要查看每条分享链接的收集效果（提交数量），并按模板、分享人进行筛选分析。

## Scope

### In Scope
- 导航菜单改造：扁平菜单 → 支持嵌套（QExpansionItem）
- 新增路由 `/share-link-stats`
- 新增后端 API `GET /api/v1/share-link-stats`（分页 + 筛选）
- 新增前端页面 `ShareLinkStatsPage.vue`（QTable 分页表格）
- 新增 Pinia store `shareLinkStats.ts`
- 新增权限码 `form:link-stats:view`
- Seed 更新：新增权限记录

### Out of Scope
- 现有 Dashboard 统计面板不变
- 现有 SubmissionPage 不变
- 不新增数据库模型或字段（ShareLink 已有所需关系）

## Design

### 1. 导航菜单结构

```
收集统计表 (assessment)          ← 一级菜单，可展开
  ├─ 模板管理 (description)      ← 原有 /templates，移入子级
  └─ 统计表 (bar_chart)          ← 新增 /share-link-stats
```

**菜单数据结构变更**：`allMenus` 从扁平数组改为支持 `children` 字段的树形结构。

**权限逻辑**：父菜单可见性 = 任一子菜单有权限即显示。

**移动端底部 Tab**：将嵌套菜单的子项展平显示（保持移动端简洁）。

### 2. 后端 API

**Endpoint**: `GET /api/v1/share-link-stats`

**Auth**: `authGuard('form:link-stats:view')`

**Query Params**:
| Param | Type | Description |
|-------|------|-------------|
| page | number | 页码，默认 1 |
| size | number | 每页条数，默认 20 |
| templateName | string | 模板名称模糊搜索 |
| sharerName | string | 分享人姓名模糊搜索 |
| dateFrom | string | 分享链接创建起始日期 |
| dateTo | string | 分享链接创建截止日期 |

**Response**:
```json
{
  "rows": [
    {
      "id": 1,
      "code": "abc123def456",
      "createdAt": "2026-04-20T10:00:00.000Z",
      "template": { "id": 1, "name": "客户满意度调查" },
      "creator": { "id": 2, "realName": "张三" },
      "submissionCount": 42
    }
  ],
  "total": 150,
  "page": 1,
  "size": 20
}
```

**实现策略**：使用 Prisma `findMany` + `include` + `_count` 关系计数，避免 N+1 查询。

### 3. 前端页面

**ShareLinkStatsPage.vue**:
- PC 端：QTable 分页表格 + 顶部筛选栏（模板名称、分享人）
- 移动端：QCard 卡片列表
- 列定义：序号、模板名称、分享码、分享人、提交数量、分享时间
- 遵循 SubmissionPage 的 QTable + 分页 + 筛选模式

### 4. 权限

- 新增权限码：`form:link-stats:view`（模块：form）
- Seed 中 ADMIN 角色自动拥有所有权限
- EMPLOYEE 角色默认不包含此权限，需管理员手动分配

## Constraints (from research)

### Hard Constraints
- 新模块必须注册到 `backend/src/index.ts` 的 `/api/v1` 链中
- 移动端底部 Tab 不支持嵌套结构，需展平处理
- ShareLink 无 submissionCount 持久化字段，需查询时计算
- ShareLink.createdAt 无索引，大数据量排序可能需要后续优化

### Soft Constraints
- 遵循现有分页响应格式 `{ rows, total, page, size }`
- 遵循现有 authGuard 模块级鉴权模式
- 遵循现有 Pinia store Option API 风格
- 日期过滤使用 `T23:59:59.999Z` 包含截止日当天

### Dependencies
- Prisma schema 无需变更（ShareLink → FormTemplate, ShareLink → User, ShareLink → Submission 关系已存在）
- Quasar QExpansionItem 组件（已包含在框架中）

## Success Criteria

1. PC 端侧边栏显示可折叠的「收集统计表」菜单，包含「模板管理」和「统计表」两个子项
2. 移动端底部 Tab 和抽屉菜单正确展示展平后的菜单项
3. 访问 `/share-link-stats` 显示分页统计表格
4. 表格按分享链接粒度展示数据，每行包含模板名、分享人、分享码、提交数、时间
5. 支持按模板名称和分享人姓名搜索筛选
6. 无 `form:link-stats:view` 权限的用户看不到「统计表」菜单项
7. API 响应格式与现有分页接口一致
