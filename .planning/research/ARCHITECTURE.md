# Architecture Research: v1.3 到访信息管理

**Domain:** 固定业务台账模块 + Excel 导入 + 统计
**Researched:** 2026-05-02
**Confidence:** HIGH

## Architecture Summary

到访信息管理应作为独立固定业务模块实现，而不是复用自定义表单模板。原因：样表字段稳定、筛选统计维度明确、需要批量导入和转化聚合；固定表结构比 JSONB 表单提交更利于查询、索引和权限隔离。

## Data Model

新增 `VisitRecord` Prisma model，字段直接映射样表 15 列，并补充创建人和时间戳。

```prisma
model User {
  // existing fields...
  visitRecords VisitRecord[]
}

model VisitRecord {
  id                 Int      @id @default(autoincrement())
  name               String
  age                Int?
  education          String?
  gender             String?
  channelPartner     String?
  consultant         String?
  receptionStatus    String?
  receptionist       String?
  receptionDate      DateTime?
  consultationStatus String?
  statusCategory     String?
  statusDescription  String?
  trialStatus        String?
  solution           String?
  trialDate          DateTime?
  creatorId          Int
  creator            User     @relation(fields: [creatorId], references: [id])
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([channelPartner])
  @@index([consultant])
  @@index([receptionist])
  @@index([receptionDate])
  @@index([consultationStatus])
  @@index([statusCategory])
  @@index([creatorId])
}
```

## Backend Module

新建 `backend/src/modules/visit/visit.route.ts`，挂载到 `/api/v1/visits`。

| Method | Path | Purpose | Permission |
|--------|------|---------|------------|
| GET | `/` | 分页列表 + 多维筛选 | `visit:list` |
| GET | `/filter-options` | 返回渠道商/咨询师/接待人/状态去重选项 | `visit:list` |
| GET | `/stats` | 渠道、人员、状态统计 | `visit:stats` |
| GET | `/:id` | 单条详情 | `visit:list` |
| POST | `/` | 新建到访记录 | `visit:create` |
| PUT | `/:id` | 编辑到访记录 | `visit:update` |
| DELETE | `/:id` | 删除到访记录 | `visit:delete` |
| POST | `/import` | 批量导入标准化 rows | `visit:import` |

权限种子追加：`visit:list`、`visit:create`、`visit:update`、`visit:delete`、`visit:import`、`visit:stats`，module 统一为 `visit`。

## Frontend Module

| File | Purpose |
|------|---------|
| `frontend/src/pages/VisitPage.vue` | 独立菜单页面，列表、筛选、详情编辑、导入入口 |
| `frontend/src/components/visit/VisitImportDialog.vue` | xlsx 解析、表头校验、预览、导入提交 |
| `frontend/src/components/visit/VisitFormDialog.vue` | 新建/编辑表单，移动端 maximized |
| `frontend/src/components/visit/VisitStatsPanel.vue` | 渠道/人员/状态统计卡片和图表 |
| `frontend/src/stores/visit.ts` | 列表、筛选项、统计、CRUD、导入状态 |
| `frontend/src/router/routes.ts` | 新增 `/visits` 路由，meta.perm = `visit:list` |

## Import Data Flow

1. 用户在 VisitPage 点击「导入 Excel」。
2. VisitImportDialog 读取文件并解析第一个 sheet。
3. 校验第 2 行表头必须等于 15 列规范表头。
4. 将第 3 行起数据标准化为 `VisitImportRow[]`。
5. 预览有效/无效行，展示错误原因和潜在重复提醒。
6. 用户确认后 POST 到 `/api/v1/visits/import`。
7. 后端再次校验并 `createMany`，返回导入数量。

## Integration Points

- `backend/prisma/schema.prisma`：新增模型和 User 关系。
- `backend/prisma/seed.ts`：追加权限码，ADMIN 自动继承。
- `backend/src/index.ts`：注册 `visitModule`。
- `frontend/src/router/routes.ts`：新增菜单路由。
- `frontend/package.json`：新增 `xlsx`。
